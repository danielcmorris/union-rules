# Union Pay Rules — Human-Readable Reference

---

## Required Variables

The following information must be available for every timesheet calculation.

### Employee Information
| Variable | Description |
|---|---|
| **Employee ID** | Uniquely identifies the employee |
| **State** | `CA` or `NV` — determines which union holidays apply |
| **Straight-Time Rate** | The employee's base hourly rate (used for bonus calculations) |
| **Job Classification** | The employee's role (e.g., Foreman, Lineman) — determines the pay rate |

### TimeSheet Information
| Variable | Description |
|---|---|
| **TimeSheet ID** | Uniquely identifies this timesheet |
| **Prior TimeSheet End Time** | The end time of the employee's most recent prior timesheet — used to determine if the two are legally connected |
| **Is First TimeSheet of the Day** | Whether this is the first timesheet started on this calendar day — determines show-up pay eligibility |

### Per Job (TimeSheetCrew Record)
Each timesheet may contain one or more jobs. Each job requires:

| Variable | Description |
|---|---|
| **Start Time** | When the employee began this job (date and time) |
| **End Time** | When the employee finished this job (date and time) |
| **Lunch Skipped** | `Yes` or `No` — did the employee skip their 30-minute unpaid lunch? |
| **Pay Type** | One of 7 types (see Pay Types section below) — drives premium time and missed meal rules |

### Bonus Flags (per TimeSheet)
| Variable | Description |
|---|---|
| **220KV Dead-End Bonus** | `Yes/No` — employee performed tension dead-ending of 220KV or higher on steel towers in the air |
| **75-Foot Height Bonus** | `Yes/No` — employee worked at 75 feet or higher on a pole (not a lattice pole) |
| **Aerial Basket Bonus** | `Yes/No` — employee worked from an aerial basket suspended from a headache ball or hook |

### System Configuration (set by administrators, not per timesheet)
| Variable | Default | Description |
|---|---|---|
| **Standard Time Window Start** | 6:00 AM | When the standard pay window begins each day |
| **Standard Time Window End** | 2:00 PM | When the standard pay window ends each day (without lunch) |

---

## Key Concepts

### Standard Time Window (STW)
The period of the day during which hours are paid at the standard rate. By default this runs from **6:00 AM to 2:00 PM**. If the employee takes a 30-minute lunch break, the window extends to **2:30 PM** — but those 30 minutes are unpaid.

### Standard Time (ST)
Hours worked inside the Standard Time Window at the employee's normal pay rate (1×).

### Premium Time (PT)
Hours worked outside the Standard Time Window, or under certain conditions, paid at 1.5× the standard rate.

### Double Time (DT)
Hours worked on weekends or union holidays, paid at 2× the standard rate.

### Effective Start Time
The actual beginning of an employee's continuous working period, which may trace back to a prior timesheet if the gap between them was less than 4 hours.

### Pay Types
Pay type determines how Standard Time, Premium Time, and Missed Meals are calculated.

| # | Pay Type |
|---|---|
| 1 | Planned Work |
| 2 | Routine Emergency — callout on a day off |
| 3 | Routine Emergency — callout on a scheduled workday |
| 4 | Routine Emergency — pre-arranged |
| 5 | Major Emergency — from regular show-up |
| 6 | Major Emergency — first day only, away from regular show-up |
| 7 | Major Emergency — away from regular show-up, after the first day |

**Pay types 1, 3, 4, 5, 6** follow the Planned/Scheduled rules for missed meals.
**Pay types 2, 7** follow the Emergency rules for missed meals.

---

## The Rules

### 1. Connecting Two Timesheets

When an employee finishes one timesheet and starts another, the gap between them determines how the second timesheet is treated:

**Gap less than 4 hours → Timesheets are connected**
The two timesheets are treated as one continuous working period. The start of the earlier timesheet is used as the effective start of the combined period. This can chain back through multiple timesheets.

**Gap between 4 and 8 hours → No rest period**
The timesheets are separate, but the employee has not had their required 8-hour rest. All hours on the second timesheet are Premium Time, regardless of when they fall in the day.

**Gap of 8 hours or more → Fresh start**
The second timesheet is fully independent. Standard Time and Premium Time rules apply normally.

> **Example:** Employee works until 1:00 AM on a Monday night. A new timesheet starts at 9:00 AM Tuesday morning. The gap is 8 hours — this is a fresh start and normal rules apply.

> **Example:** Employee works until 1:00 AM. A new timesheet starts at 7:00 AM (6-hour gap). No rest period — all hours on the 7 AM timesheet are Premium Time.

> **Example:** Employee works until 1:00 AM. A new timesheet starts at 3:00 AM (2-hour gap). These are connected. The effective start is wherever the first timesheet began.

---

### 2. Standard Time vs. Premium Time

#### Weekend and Holiday Work — Always Double Time
Any hours worked on a Saturday, Sunday, or union holiday are **Double Time (2×)**, regardless of the time of day or pay type.

Union holidays vary by state:

| Holiday | Who It Applies To |
|---|---|
| New Year's Day | Everyone |
| Martin Luther King Day | California only |
| Presidents Day | Nevada only |
| Memorial Day | Everyone |
| Fourth of July | Everyone |
| Labor Day | Everyone |
| Veteran's Day | California only |
| Nevada Day | Nevada only |
| Thanksgiving Day | Everyone |
| Friday after Thanksgiving | Everyone |
| Christmas Day | Everyone |

#### Pay Types 1, 3, 4, 5, 6 — Scheduled / Planned Work

**Step 1 — Calculate pre-shift hours.**
Pre-shift hours are the hours from the effective start time to 6:00 AM on the day of work. If the employee started (or their connected prior timesheet started) before 6:00 AM, those hours count as pre-shift.

**Step 2 — If pre-shift is 6 hours or more, the entire timesheet is Premium Time.**
This catches situations where the employee has been working through the night and into the morning.

> **Example:** Effective start is 11:00 PM Monday. Current timesheet is Tuesday. Pre-shift = 11:00 PM to 6:00 AM = 7 hours → entire Tuesday timesheet is Premium Time.

**Step 3 — Otherwise, split at the Standard Time Window boundaries.**
- Hours before 6:00 AM → **Premium Time**
- Hours from 6:00 AM to 2:00 PM (or 2:30 PM if lunch was taken) → **Standard Time**, capped at 8 paid hours
- Hours after 2:00 PM (or 2:30 PM) → **Premium Time**

#### Pay Types 2, 7 — Emergency Call-Outs

The **first 4 paid hours** of an emergency call-out are always **Premium Time**, regardless of what time of day they fall in.

After the first 4 hours:
- If still within the Standard Time Window (6:00 AM–2:00/2:30 PM) → **Standard Time**
- Once the Standard Time Window closes, the remainder → **Premium Time**

> **Example:** Emergency call-out from 5:00 AM to 1:00 PM (8 hours, no lunch).
> First 4 hours: 5:00–9:00 AM → **Premium Time**.
> Remaining 4 hours: 9:00 AM–1:00 PM (within STW) → **Standard Time**.

> **Example:** Emergency call-out from 10:00 AM to 7:00 PM (9 hours, no lunch).
> First 4 hours: 10:00 AM–2:00 PM → **Premium Time** (the 4-hour block reaches the end of the STW).
> Remaining 5 hours: 2:00–7:00 PM → **Premium Time** (STW already closed).
> Total: 9 hours Premium Time.

---

### 3. Lunch Break

- Lunch is a **30-minute unpaid break**.
- If the employee takes lunch, they are **not paid** for those 30 minutes.
- If the employee takes lunch, the Standard Time Window extends by 30 minutes (to 2:30 PM instead of 2:00 PM).
- Skipping lunch is **not** a missed meal — lunch has nothing to do with the missed meal calculation.

---

### 4. Missed Meals

A missed meal is owed when the employee works long enough that the employer was required to provide a meal but did not. Each missed meal costs the employer **$15.00 plus 30 minutes of pay at the applicable rate**.

> **Important:** Lunch (taken or skipped) does not factor into missed meal calculations at all. Only actual paid work hours count.

> **Important:** Each job on the timesheet is counted independently. Hours do not carry over from one job to the next.

> **Important:** If a shift ends **exactly** at a meal threshold, the employee does **not** earn a missed meal. They must work past the threshold.

#### Pay Types 1, 3, 4, 5, 6 — Planned / Scheduled Work Formula

| Paid Hours | Missed Meals |
|---|---|
| 10.5 hours or less | 0 |
| More than 10.5 hours | 1, plus 1 more for every 4.5 hours beyond that |

> **Examples:**
> - 10.5h → 0 missed meals (exactly at threshold, does not qualify)
> - 11h → 1 missed meal
> - 15h → 2 missed meals (11h + 4h more, just under the 4.5h mark)
> - 15.1h → 2 missed meals (11h + 4.1h past threshold)
> - 19.6h → 3 missed meals

#### Pay Types 2, 7 — Emergency Call-Out Formula

| Paid Hours | Missed Meals |
|---|---|
| 4.5 hours or less | 0 |
| More than 4.5 hours | 1, plus 1 more for every 4.5 hours beyond that |

> **Examples:**
> - 4.5h → 0 missed meals (exactly at threshold, does not qualify)
> - 5h → 1 missed meal
> - 9h → 1 missed meal (exactly at 2nd threshold, does not add a 2nd)
> - 9.1h → 2 missed meals

---

### 5. Subsistence

A subsistence payment of **$50.00** is made for each timesheet worked. Only **one** subsistence payment is made per TimeSheet ID, regardless of how many jobs are on that timesheet.

Subsistence is not paid for timesheets that are deleted or marked as an off day.

---

### 6. Show-Up Pay

Show-up pay guarantees a minimum payment for the first timesheet of a calendar day. If an employee shows up and is sent home early, they are still owed a minimum number of hours.

Show-up pay applies only to the **first timesheet of the calendar day**. Subsequent timesheets on the same day do not receive additional show-up pay.

The extra hours are paid at the **same rate** as the actual hours worked.

| Hours Actually Worked | Minimum Hours Paid |
|---|---|
| Any amount up to 2 hours | 2 hours |
| More than 2, up to 4 hours | 4 hours |
| More than 4, up to 6 hours | 6 hours |
| More than 6, up to 8 hours | 8 hours |
| More than 8, up to 10 hours | 10 hours |
| More than 8 hours (standard) | Actual hours |

---

### 7. Minimum Call-Out

Every timesheet guarantees a minimum of **4 hours of pay** at the applicable rate. If the employee works less than 4 hours, they are still paid for 4.

> **Example:** An employee is called in for a scheduled shift at 6:00 AM. It rains at 6:15 AM and the foreman sends everyone home. The employee is still paid until 10:00 AM — 4 hours at Standard Time rate.

When show-up pay and minimum call-out both apply (first timesheet of the day), the **higher of the two** is used.

---

### 8. High Time Bonuses

High time bonuses are additive — they are paid **on top of** regular ST/PT/DT pay. All bonuses are paid at the employee's **straight-time rate (1×)**, even if the underlying hours were Premium or Double Time. These flags are set per timesheet.

#### 220KV Dead-End Bonus
Applies when the employee performs tension dead-ending of 220KV or higher voltage on steel towers in the air.

- Bonus = straight-time rate × hours worked, **with a minimum of 2 hours**
- Does **not** apply to hanging a dead-end after it was made up on the ground
- Does **not** apply to soft dead-ends made without supporting the ladder from the conductor

#### 75-Foot Height Bonus
Applies when the employee works at the 75-foot level or higher on any pole, except lattice poles. Height is measured from the ground to the point of attachment.

- Bonus = straight-time rate × hours worked

#### Aerial Basket Bonus
Applies when the employee works from an aerial basket suspended from a headache ball or hook.

- Bonus = straight-time rate × hours worked

All three bonuses may apply simultaneously on the same timesheet and stack on top of each other.

---

## Pay Components Summary

A completed timesheet calculation produces the following outputs:

| Component | Description |
|---|---|
| **Standard Hours** | Hours paid at 1× rate |
| **Premium Hours** | Hours paid at 1.5× rate |
| **Double Time Hours** | Hours paid at 2× rate (weekends / holidays) |
| **Unpaid Lunch Hours** | Hours deducted for the 30-minute lunch break |
| **Billed Hours** | Total hours after show-up pay and minimum call-out floors applied |
| **Missed Meals** | Count of missed meal penalties owed |
| **Missed Meal Cost** | Count × ($15.00 + 0.5 hours at applicable rate) |
| **Subsistence** | 0 or 1 — one flat payment of $50.00 per timesheet |
| **220KV Bonus Hours / Cost** | If flag set: max(worked hours, 2) × straight-time rate |
| **75-Foot Bonus Hours / Cost** | If flag set: worked hours × straight-time rate |
| **Aerial Basket Bonus Hours / Cost** | If flag set: worked hours × straight-time rate |
