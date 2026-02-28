# Timesheet Pay Calculation Algorithm

## Constants (from RULES.md — stored in a config table in the DB)

| Constant | Value | Description |
|---|---|---|
| `STW_START` | 06:00 | Standard Time Window start (configurable) |
| `STW_END` | 14:00 | Standard Time Window end when no lunch taken |
| `STW_END_WITH_LUNCH` | 14:30 | Standard Time Window end when lunch is taken |
| `LUNCH_HOURS` | 0.5 | Duration of unpaid lunch |
| `RS_PRESHIFT_ALL_PT_THRESHOLD` | 6.0 h | RS: if effective pre-shift ≥ this, entire timesheet = PT |
| `ES_INITIAL_PT_HOURS` | 4.0 h | ES: first N paid hours are always PT |
| `TIMESHEET_LINK_THRESHOLD` | 4.0 h | Gap below which timesheets are legally one continuous period |
| `REST_PERIOD_HOURS` | 8.0 h | Gap required to exit PT and allow ST again (4.13) |

---

## Core Concept: The Effective Shift

A TimeSheet does **not** necessarily represent an isolated block of work. Two concepts
govern how wide the calculation window is:

### Within a Single TimeSheet
A TimeSheet's **effective span** is:
```
effectiveSpanStart = min(begin_time) across all TimeSheetCrew records
effectiveSpanEnd   = max(end_time)   across all TimeSheetCrew records
```
Gaps between individual TimeSheetCrew records within one TimeSheet are **unpaid**
but do NOT break continuity. The span is treated as one uninterrupted period for
PT/ST classification purposes.

### Between TimeSheets (Linking)
If the gap between a prior TimeSheet's end and the current TimeSheet's start is
**less than 4 hours**, the two are **legally one continuous working period**:

```
priorEnd    = max(end_time) of the immediately prior TimeSheet for this employee
currentStart = min(begin_time) of the current TimeSheet

if (currentStart − priorEnd) < TIMESHEET_LINK_THRESHOLD:
    timesheets are LINKED → use the prior TimeSheet's effectiveSpanStart
                             as the effectiveStartTime for this calculation
else:
    timesheets are INDEPENDENT → effectiveStartTime = currentStart
```

Linking can chain back further: if prior TimeSheet B was itself linked to TimeSheet A,
then the current TimeSheet's effectiveStartTime is TimeSheet A's start.

> **Gap hours between linked timesheets are unpaid.** The gap only affects the
> classification rules (pre-shift duration, ES initial PT block) — the employee
> is not paid for the time between the timesheets.

---

## Inputs

```
CurrentTimeSheet
  └── TimeSheetCrew[] (one or more, sorted ascending by begin_time)
        Each record has:
          - begin_time      (datetime)
          - end_time        (datetime)
          - lunch_skipped   (bool)  — true = no lunch taken
          - pay_type        (1–7)   — determines ST/PT rules and missed meal formula

PriorTimeSheet (nullable)
  - max(end_time) of the prior TimeSheet for this employee
  - min(begin_time) of the prior TimeSheet (for chained linking)

Holidays[]   — list of holiday dates with state (CA / NV / ALL)
EmployeeState — CA or NV (determines which holidays apply)
```

---

## Outputs (per TimeSheet)

| Output | Scope |
|---|---|
| `standardHours` | Total ST hours — 1.0× rate |
| `premiumHours` | Total PT hours — 1.5× rate |
| `doubleTimeHours` | Total DT hours — 2.0× rate (weekends and union holidays) |
| `unpaidLunchHours` | Total unpaid lunch deducted |
| `billedHours` | Actual hours after show-up pay / min call-out floor applied |
| `missedMeals` | Count of missed meals |
| `missedMealDollars` | `count × ($15 + 0.5h × applicableRate)` |
| `bonus220kvHours` | `max(totalPaidHours, 2.0)` if `bonus220kv` flag set, else 0 |
| `bonus220kvDollars` | `bonus220kvHours × straightTimeRate` |
| `bonus75FootHours` | `totalPaidHours` if `bonus75Foot` flag set, else 0 |
| `bonus75FootDollars` | `bonus75FootHours × straightTimeRate` |
| `bonusAerialBasketHours` | `totalPaidHours` if `bonusAerialBasket` flag set, else 0 |
| `bonusAerialBasketDollars` | `bonusAerialBasketHours × straightTimeRate` |
| `subsistence` | 0 or 1 per TimeSheet |
| `subsistenceDollars` | `subsistence × $50` |

---

## Step 0 — Establish Gap Tier and Effective Start Time

Before any per-record processing, determine the gap between this TimeSheet and
the prior one for this employee, then classify it into one of three tiers.

```
priorEnd     = max(end_time) of the immediately prior TimeSheet for this employee
currentStart = min(begin_time) of the current TimeSheet
gap          = currentStart − priorEnd   (if no prior TimeSheet, gap = ∞)
```

### Three-Tier Gap Logic (Contract Provision 4.13)

| Tier | Gap | Effect |
|---|---|---|
| **Linked** | gap < 4h | Timesheets are one continuous period. Pre-shift calculated from the chain's effective start. |
| **PT Lock** | 4h ≤ gap < 8h | Timesheets are separate. No rest period. **All hours on current TimeSheet = PT** regardless of STW. |
| **Fresh Start** | gap ≥ 8h | Fully independent. Pre-shift calculated from current TimeSheet's own start. ST/PT rules apply normally. |

```
if gap < TIMESHEET_LINK_THRESHOLD (4h):
    tier = LINKED
    effectiveStartTime = priorTimeSheet.effectiveStartTime   // chain back if prior was also linked
    ptLockActive = false

else if gap < REST_PERIOD_HOURS (8h):
    tier = PT_LOCK
    effectiveStartTime = min(begin_time) of current TimeSheet
    ptLockActive = true    // all hours this TimeSheet are PT — skip ST classification

else:
    tier = FRESH_START
    effectiveStartTime = min(begin_time) of current TimeSheet
    ptLockActive = false
```

If `ptLockActive == true`, every TimeSheetCrew record on this TimeSheet is
classified as **PT** regardless of pay type, STW position, or pre-shift hours.
Skip to Step 3 (Missed Meals) for each record.

```
// Compute pre-shift for LINKED and FRESH_START tiers only
preShiftHours = max(0, STW_START_on_current_date − effectiveStartTime)
```

**Example — Linked (gap = 2h):**
- Prior TimeSheet: Mon 5:00 PM → Tue 1:00 AM
- Current TimeSheet: Tue 3:00 AM → Tue 4:00 PM  (gap = 2h < 4h → LINKED)
- effectiveStartTime = Mon 5:00 PM
- preShiftHours = Tue 6:00 AM − Mon 5:00 PM = **13h ≥ 6h → all hours PT**

**Example — PT Lock (gap = 6h):**
- Prior TimeSheet ends Tue 1:00 AM
- Current TimeSheet starts Tue 7:00 AM  (gap = 6h → PT_LOCK tier)
- All hours on current TimeSheet = PT regardless of 7AM being within the STW

**Example — Fresh Start (gap = 10h):**
- Prior TimeSheet ends Tue 1:00 AM
- Current TimeSheet starts Tue 11:00 AM  (gap = 10h ≥ 8h → FRESH_START)
- Normal ST/PT classification applies; pre-shift = 0h (11AM is within STW)

---

## Step 1 — Per-Record Pre-computation

For each TimeSheetCrew record on the current TimeSheet:

**1.1 — Unpaid Lunch and Effective STW End**
```
if lunch_skipped == false:        // lunch WAS taken
    unpaidLunchHours = 0.5
    effectiveStwEnd  = 14:30
else:                             // lunch NOT taken
    unpaidLunchHours = 0.0
    effectiveStwEnd  = 14:00
```

**1.2 — Paid Hours**
```
clockHours = end_time − begin_time   (decimal hours)
paidHours  = clockHours − unpaidLunchHours
```

**1.3 — Weekend / Holiday / Double-Time Flag**
```
isDoubleTime = (dayOfWeek(begin_time) is Saturday or Sunday)
               OR (date(begin_time) is a holiday applicable to employeeState)
```

Holiday applicability by state:

| Holiday | Applies To |
|---|---|
| New Year's Day | All |
| Martin Luther King Day | CA only |
| Presidents Day | NV only |
| Memorial Day | All |
| Fourth of July | All |
| Labor Day | All |
| Veteran's Day | CA only |
| Nevada Day | NV only |
| Thanksgiving Day | All |
| Friday after Thanksgiving | All |
| Christmas Day | All |

> **Overnight shifts spanning a date boundary:** Split at midnight. Each segment
> is evaluated against its own calendar date for weekend/holiday status.

---

## Step 2 — Classify Hours as ST, PT, or DT

### Priority Order (highest wins)

| Priority | Condition | Classification |
|---|---|---|
| 1 | Weekend or union holiday | **DT** (double time) |
| 2 | ES pay type AND within initial 4h PT block | **PT** |
| 3 | RS pay type AND preShiftHours ≥ 6h | **PT** (entire timesheet) |
| 4 | Any hours before STW_START | **PT** (pre-shift) |
| 5 | Hours within STW (up to 8h paid) | **ST** |
| 6 | Hours after effectiveStwEnd | **PT** (post-STW) |

---

### 2A — Weekend / Holiday → Double Time

```
if isDoubleTime:
    DT = paidHours
    ST = 0, PT = 0
    → Skip to Step 3 (Missed Meals)
```

---

### 2B — Regularly Scheduled Pay Types (RS: types 1, 3, 4, 5, 6)

**Check: pre-shift all-PT threshold**
```
if preShiftHours >= RS_PRESHIFT_ALL_PT_THRESHOLD (6.0h):
    ST = 0, PT = paidHours
    → Skip to Step 3
```

**Otherwise — split at STW boundaries:**

| Time Block | Classification |
|---|---|
| begin_time → 06:00 (if before STW) | **PT** (pre-shift) |
| 06:00 → effectiveStwEnd (within shift) | **ST** |
| effectiveStwEnd → end_time (if past STW) | **PT** (post-STW) |

Subtract unpaidLunchHours from the ST segment:
```
ST = min(paidHoursWithinSTW, 8.0)   // capped at 8 paid hours
PT = paidHours − ST
```

---

### 2C — Emergency Pay Types (ES: types 2, 7)

Walk the shift chronologically using **paid hours elapsed**:

```
Segment A: first ES_INITIAL_PT_HOURS (4.0h) of paid time
    → PT  ("ES initial 4h")

Segment B: after 4h mark, while current wall-clock < effectiveStwEnd
    → ST  ("ES within STW after 4h")

Segment C: from effectiveStwEnd to end_time
    → PT  ("ES post-STW")
```

> **Special case:** If the 4h PT block extends to or past effectiveStwEnd,
> Segment B = 0. All hours are PT.
>
> Example (Scenario 6): ES starts 10AM, no lunch, ends 7PM.
> Segment A: 10AM–2PM = 4h PT. effectiveStwEnd = 2PM. Segment B = 0.
> Segment C: 2PM–7PM = 5h PT. Total = 9h PT.

---

## Step 3 — Missed Meals

> **Lunch is irrelevant.** Use `paidHours` (already net of unpaid lunch) as `t`.
>
> **Meal Counter Continuity:** The counter carries forward across consecutive records IF there is no time gap between them.
> - If record N's `end_time` == record N+1's `begin_time` → hours **pool**. Apply formula to accumulated paid hours; subtract meals already counted in prior records of the run to get new meals for this record.
> - If record N's `end_time` < record N+1's `begin_time` (any gap) → **reset**. Apply formula only to record N+1's own paid hours.
>
> Track two running accumulators that reset whenever a gap is detected:
> ```
> accumulatedPaidHours  += paidHours   (carries across back-to-back records)
> mealsAlreadyCounted   += mealsThisRecord
> mealsThisRecord        = formula(accumulatedPaidHours) − mealsAlreadyCounted
> ```

### Formula Assignment by Pay Type

| Pay Type | Description | Formula |
|---|---|---|
| 1 | Planned Work | **A** |
| 2 | Routine Emergency — callout on Day Off | **B** |
| 3 | Routine Emergency — callout on Scheduled Workday | **A** |
| 4 | Routine Emergency — pre-arranged | **A** |
| 5 | Major Emergency — from Regular Show Up | **A** |
| 6 | Major Emergency — first day only, away from regular show up | **A** |
| 7 | Major Emergency — away from Regular Show Up, after 1st day | **B** |

### Formula A — Pay Types 1, 3, 4, 5, 6
```
// First meal triggers only when paidHours EXCEEDS 10.5h (not at exactly 10.5h)
if t > 10.5:
    missedMeals = ceil((t − 10.5) / 4.5)
else:
    missedMeals = 0
```

### Formula B — Pay Types 2, 7
```
// First meal triggers only when paidHours EXCEEDS 4.5h (not at exactly 4.5h)
if t > 4.5:
    missedMeals = ceil(t / 4.5) − 1
else:
    missedMeals = 0
```

### Boundary Rule
If the shift ends **exactly** on a threshold (4.5h, 9.0h, 10.5h, 13.5h, 15.0h, etc.),
the employee does **not** earn a meal for that threshold. They must work past it.
`ceil` implements this correctly at every threshold — no special casing needed.

| t | Formula A | Formula B |
|---|---|---|
| 4.5h (ends exactly) | 0 | **0** |
| 4.6h (works past) | 0 | **1** |
| 9.0h (ends exactly) | 0 | **1** (keeps prior, no new) |
| 9.1h (works past) | 0 | **2** |
| 10.5h (ends exactly) | **0** | 2 |
| 10.6h (works past) | **1** | 2 |
| 15.0h (ends exactly) | **1** (keeps prior, no new) | 3 |
| 15.1h (works past) | **2** | 3 |

---

## Step 4 — Show-Up Pay (4.4)

Show-up pay is a **once-per-calendar-day** entitlement. It applies only to the
**first TimeSheet of the calendar day**, determined by the calendar date of
`min(begin_time)` across that TimeSheet's crew records.

```
isFirstTimesheetOfDay = no other TimeSheet for this employee has
                        min(begin_time) on the same calendar date
                        that started earlier

if isFirstTimesheetOfDay:
    totalPaidHours = Σ paidHours across all TimeSheetCrew records on this TimeSheet
    showUpPayHours = roundUpToNextTwoHourIncrement(totalPaidHours)
    paddedHours    = showUpPayHours − totalPaidHours
else:
    paddedHours = 0   // no show-up pay on subsequent timesheets
```

Show-up pay rounding table:

| Total Paid Hours | Billed Hours |
|---|---|
| > 0 up to 2h | **2h** |
| > 2h up to 4h | **4h** |
| > 4h up to 6h | **6h** |
| > 6h up to 8h | **8h** |
| > 8h up to 10h *(four-tens)* | **10h** |
| 8h+ (or 10h+ on four-tens) | Actual |

The extra guaranteed hours are billed at the **same rate as the actual hours worked**.
In a mixed-rate TimeSheet (some ST, some PT), the padded hours are added to the
**final classification bucket** — whatever rate the employee was earning at the
end of their last crew record.

```
paddedHoursClassification = classification of the last TimeSheetCrew record's
                             final time segment

// Add padding to the appropriate output bucket:
if paddedHoursClassification == ST:  totalStandardHours  += paddedHours
if paddedHoursClassification == PT:  totalPremiumHours   += paddedHours
if paddedHoursClassification == DT:  totalDoubleTimeHours += paddedHours
```

**Examples:**

| TimeSheet | Actual Hours | Show-Up Billed | Padding | Rate |
|---|---|---|---|---|
| 1h ES callout (all PT) | 1h PT | 2h | +1h PT | PT rate |
| 3h RS within STW (all ST) | 3h ST | 4h | +1h ST | ST rate |
| 7h RS: 6h ST + 1h PT | 7h | 8h | +1h PT | PT rate (last segment) |
| 11h RS | 11h | 11h | none | actual (≥8h, no padding) |

---

## Step 5 — High Time Bonuses (6.11)

Three separate per-TimeSheet boolean flags. Each is independent. All bonus rates
are the employee's **straight-time rate (1×)** regardless of ST/PT/DT classification.
Bonuses are **additive** — they do not change ST/PT/DT hour counts.

### Flag: `bonus220kv`
Tension dead-ending of 220KV or higher on steel towers in the air.

```
if timeSheet.bonus220kv == true:
    bonus220kvHours   = max(totalPaidHours, 2.0)   // 2-hour minimum per contract
    bonus220kvDollars = bonus220kvHours × employee.straightTimeRate
```

Exceptions (per contract): does NOT apply to hanging the dead-end after it has
been made up on the ground, or to soft dead-ends made without supporting the
ladder from the conductor.

### Flag: `bonus75Foot`
Work on any pole (lattice poles excepted) at the 75-foot level or higher.
Height measured from ground to point of attachment.

```
if timeSheet.bonus75Foot == true:
    bonus75FootHours   = totalPaidHours   // no minimum stated
    bonus75FootDollars = bonus75FootHours × employee.straightTimeRate
```

### Flag: `bonusAerialBasket`
Work from an aerial basket suspended from a headache ball or hook.

```
if timeSheet.bonusAerialBasket == true:
    bonusAerialBasketHours   = totalPaidHours   // no minimum stated
    bonusAerialBasketDollars = bonusAerialBasketHours × employee.straightTimeRate
```

All three flags may be active simultaneously on the same TimeSheet — bonuses stack.

---

## Step 7 — Subsistence

```
subsistence = 1   // one per TimeSheet
              UNLESS the TimeSheet or all TimeSheetCrew records are deleted/off-day
```

Subsistence is **per TimeSheetID**. Linked timesheets each earn their own subsistence
independently. The linking concept does not merge subsistence.

---

## Step 5 — Aggregate

```
totalStandardHours    = Σ ST         (across all crew records)
totalPremiumHours     = Σ PT         (across all crew records)
totalDoubleTimeHours  = Σ DT         (across all crew records)
totalUnpaidLunchHours = Σ unpaid     (across all crew records)
totalMissedMeals      = Σ missedMeals (across all crew records)
subsistence           = 0 or 1       (TimeSheet level)
```

---

## Decision Flow — Quick Reference

```
BEFORE PROCESSING RECORDS:
  gap = currentStart − priorEnd
  if gap < 4h  → LINKED   → effectiveStartTime = prior chain's start; ptLockActive = false
  if 4h ≤ gap < 8h → PT_LOCK → effectiveStartTime = current start; ptLockActive = TRUE
  if gap ≥ 8h  → FRESH   → effectiveStartTime = current start; ptLockActive = false
  preShiftHours = max(0, 06:00 on current date − effectiveStartTime)  [LINKED/FRESH only]

FOR EACH TimeSheetCrew record (sorted by begin_time):

  1. Compute paidHours, effectiveStwEnd, isDoubleTime

  2. ptLockActive? (gap was 4–8h from prior TimeSheet)
       YES → PT = paidHours → Missed Meals

  3. Double time? (weekend or holiday)
       YES → DT = paidHours → Missed Meals

  4. Pay type RS (1,3,4,5,6)?
       preShiftHours ≥ 6h?
         YES → PT = paidHours → Missed Meals
         NO  → Split: [before 06:00]=PT | [06:00–effectiveStwEnd]=ST (cap 8h) | [after]=PT

  5. Pay type ES (2,7)?
       Walk paid hours:
         First 4h          → PT
         4h–effectiveStwEnd → ST
         past effectiveStwEnd → PT

  6. Missed Meals (per record, no pooling):
       Formula A (types 1,3,4,5,6): t > 10.5? ceil((t−10.5)/4.5), else 0
       Formula B (types 2,7):       t > 4.5?  ceil(t/4.5)−1,      else 0

AFTER ALL RECORDS:
  Subsistence = 1 (unless deleted/off-day)
```

---

## Validation Against RULES.md Test Scenarios

| Scenario | Type | Setup | Expected ST | Expected PT | Meals | Notes |
|---|---|---|---|---|---|---|
| 1 | RS | 6AM–2PM, no lunch | 8.0 | 0.0 | 0 | Entirely within STW |
| 2 | RS | 6AM–2:30PM, lunch | 8.0 | 0.0 | 0 | STW extends to 2:30 |
| 3 | RS | 4AM–10AM, no lunch | 4.0 | 2.0 | 0 | 2h pre-shift PT |
| 4 | RS | 11PM–8AM, no lunch | 0.0 | 9.0 | 0 | Pre-shift 7h ≥ 6h → all PT |
| 5 | ES | 5AM–1PM, no lunch | 4.0 | 4.0 | 1 | First 4h PT; 9AM–1PM ST |
| 6 | ES | 10AM–7PM, no lunch | 0.0 | 9.0 | 2 | 4h PT block absorbs STW |
| 7 | RS | 6AM–3PM, lunch | 8.0 | 0.5 | 0 | 2:30–3PM = 0.5h PT |
| 8 | RS | 6AM–5:30PM, lunch | 8.0 | 3.0 | 1 | 11 paid hrs > 10.5 |
| 9 | ES | 6AM–4PM, no lunch | 4.0 | 6.0 | 2 | 4PT + 4ST + 2PT |
| 10 RS | RS | Sun 6AM–2PM | 0.0 | 0.0 | 0 | **DT = 8h** (weekend) |
| 10 ES | ES | Sun 6AM–2PM | 0.0 | 0.0 | 1 | **DT = 8h**, ES meal rule |
| Linking | RS | Prior ends 1AM, current starts 3AM (2h gap), current 3AM–4PM | 0.0 | 11.0 | — | Pre-shift = 13h ≥ 6h → all PT |
