# Timesheet Calculation Rules

## History

| Date | Author | Notes | Approved By |
|------|--------|-------|-------------|
| 02/07/2025 | Yuriy Frankiv | Initial draft | ? |
| 02/18/2025 | Yuriy Frankiv | Added Subsistence section | ? |

---

## Background

The purpose of this document is to describe the rules and default values used when calculating timesheets.

Under the agreement, a normal shift is defined as starting at 7:00 AM and running for 8.5 consecutive hours, which includes a 30-minute unpaid lunch break taken between the 4th and 5th hour. This contract further allows the "normal start time" to be shifted by up to one hour in either direction. The Pinnacle Powers has chosen to shift it one hour earlier, from 7:00 AM to 6:00 AM, making the Standard Time Window (see definition below) 6:00 AM to 2:00 PM. In practice, if the 30-minute lunch break is actually taken (as required by the agreement), the work window effectively extends to 2:30 PM—still totaling 8.5 consecutive hours on-site, but only 8 of those hours are paid. When employees choose to forgo the lunch break and leave early, they reduce their actual time on-site but do not alter the contract's notion of an 8.5-hour shift, and thus for contract provisions (e.g., meal entitlements after a certain number of hours), the "lunch taken" scenario is the basis for determining the standard shift end.

To illustrate how these rules apply in different scenarios, test cases have been developed and appended to this document. These cases demonstrate various start times, lunch-break decisions, and post-shift extensions to ensure compliance with both the contract provisions and the adjusted scheduling parameters.

---

## Definitions

### Standard Time Window (STW)
Defined as the period between 6:00 AM and 2:00 PM (configurable).

### Shift Normal Start Time
Refers to the default start time of the STW.

> **Note:** We avoid calling this "Shift Start" to prevent confusion. A "shift" is defined by the actual hours the crew works, which can begin at times other than 6:00 AM.

### Pre-shift Normal Start Time
The duration between the shift's actual start time and the Shift Normal Start Time.

### Types of Shifts
- **Regularly Scheduled Shift (RS)**
- **Emergency Shift (ES)**

---

## Standard Time (ST)

- **Within STW:** Hours that fall between 6:00 AM and 2:00 PM are Standard Time unless otherwise specified below.
- **Breaks Between Jobs:** Do not alter the fixed boundaries of the STW.
- **Lunch Break:**
  - When a 30-minute lunch is taken, the STW effectively extends by 30 minutes (e.g., from 6:00 AM to 2:30 PM).
  - You are not paid for the 30-minute lunch itself.
  - **Example:** If someone works a total of 10 hours with a lunch break, then the STW portion can last until 2:30 PM (instead of 2:00 PM). However, only 8 hours of that time are paid at ST because you lose 30 minutes to the unpaid lunch. Any hours worked after the (extended) ST window are paid at PT.

---

## Premium Time (PT)

Work hours qualify as Premium Time under any of the following conditions:

- **Outside the STW:** Any work performed before 6:00 AM or after 2:00 PM (accounting for lunch extensions if applicable).
- **Holidays/Weekends:** Always PT, even if the hours fall within the STW.
- **Emergency Shift (ES):** If it is a call-out or emergency (when an employee is not already on a scheduled shift that day), the first 4 hours are paid at PT. After the first 4 hours, follow ST rules if the time overlaps with the STW. Once the STW window has fully passed, all subsequent hours remain PT until the employee has an 8-hour break.
- **Pre-shift Time (for Regularly Scheduled Work):** The time worked before 6:00 AM is always PT. Any remaining hours in the STW are counted as ST.
  - **Exception:** If Pre-shift Time is equal to or exceeds 6 hours, then all job hours become PT.

---

## Missed Meals

> **Note:** Lunch is not considered a meal in the context of missed meals. It is not part of the count. Skipping lunch is not a missed meal. Taking lunch is not a taken meal.

The calculation for missed meals depends on the shift type and is configurable. Below are the current guidelines:

### Regular Shift (RS)
- The first missed meal is paid out only after 10.5 hours if the employee works more than 10.5 hours. Lunch is not factored into the working hours count as it is unpaid.
- Subsequent missed meals occur every 4.5 hours after that point.
- Formally: `f(t) = (t − 6) / 4.5`, where `t` is total hours worked. In practice, apply the 10.5-hour trigger for the first meal and then every 4.5 hours for additional meals.

### Emergency Shift (ES)
- One missed meal for every 4.5 hours worked.
- Formally: `f(t) = t / 4.5`
- **Example:** In a 10-hour emergency job, the employee would accrue 2 missed meals.

### Resetting Meal Counters
Whenever there is a break between jobs on a timesheet, the meal counter resets at the start of the next job.

**Example:** If an employee works 7:00 AM–11:00 AM (4 hours) and then 6:00 PM–10:00 PM (another 4 hours), each job is counted separately. Neither 4-hour block meets the 4.5-hour threshold, so no missed meals are accrued.

---

## Subsistence

The primary goal is to ensure that each crew member receives only one day of subsistence per calendar day, even if they work on multiple overlapping jobs that day. When we process a TimeSheetCrew record (identified by an ID), we look at its start date and end date, and decide how many days within that range should be awarded subsistence.

### Subsistence Calculation Rules

**One Subsistence per Day:** A crew member may receive only one subsistence payment per calendar day, regardless of how many jobs overlap on that day.

**Minimum Hours Threshold:** A crew member currently earns a subsistence if they work any hours on a given day. However, there is a configurable threshold (`earnSubAfterHrsWorked`) that could require the crew to work 4 or more hours before earning subsistence. The default threshold is set to 0.5 hours (i.e., essentially any worked time qualifies), but it can be changed (e.g., to 4 hours) if the contract or reimbursement rules change.

**No Double Award for Overlapping Jobs:** If a subsistence has already been awarded for a particular day (whether from another job or timesheet), no additional subsistence is provided for that day.

**Date Range:** The above rules are applied to each calendar day within the start and end dates of the crew member's assignment.

**Exclusions:** Timesheets or crew entries with a status of deleted or an off-day do not qualify for subsistence.

---

## Test Scenarios

Each scenario highlights specific rules related to:
- Standard Time Window (STW) and its possible extension when a lunch break is taken
- Pre-shift logic (especially when exceeding 6 hours)
- Emergency Shift (ES) logic (first 4 hours PT, then ST if within STW, and PT again once STW ends until an 8-hour break)
- Missed meal thresholds for Regular Shifts (RS) and Emergency Shifts (ES)
- Weekends and holidays

Where helpful, we'll note expected time classification (ST vs. PT), unpaid lunch, and missed meals.

---

### Scenario 1 — RS: Entirely Within STW, No Lunch

**Setup:** Employee works from 6:00 AM to 2:00 PM (8 hours total), no lunch break.

**Logic:** All hours are within STW (6 AM–2 PM). No lunch break, so STW does not extend. Total hours = 8. Missed meal for RS starts after 10.5 hours.

**Expected Results:**
- ST = 8 hours, PT = 0 hours
- Unpaid Lunch = 0
- Missed Meals = 0 (8 < 10.5)

---

### Scenario 2 — RS: Within STW, With 30-Minute Lunch

**Setup:** Employee works from 6:00 AM to 2:30 PM (8.5 hours total), with a 30-minute lunch in the middle.

**Logic:** The 30-minute lunch extends the STW to 2:30 PM. Total time from 6:00 AM to 2:30 PM is 8.5 hours, but 0.5 hour is unpaid lunch. Net working hours = 8.0. Since they finish at 2:30 PM, they are still within the (extended) ST window.

**Expected Results:**
- ST = 8 hours of paid work (no time beyond 2:30 PM)
- PT = 0 hours
- Unpaid Lunch = 0.5 hours
- Missed Meals = 0 (8 < 10.5)

---

### Scenario 3 — RS: Partial Pre-shift (< 6 Hours), Then STW

**Setup:** Employee starts at 4:00 AM and ends at 10:00 AM (6 hours total). No lunch break.

**Logic:** Pre-shift = 4:00 AM–6:00 AM → 2 hours of PT (before 6:00 AM). STW = 6:00 AM–10:00 AM → 4 hours of ST. Pre-shift is less than 6 hours, so only that portion is PT. Total hours = 6. No lunch, no extension of STW.

**Expected Results:**
- PT = 2 hours (4–6 AM)
- ST = 4 hours (6–10 AM)
- Missed Meals = 0 (6 < 10.5)

---

### Scenario 4 — RS: Pre-shift Exceeding 6 Hours (All PT)

**Setup:** Employee works from 11:00 PM (previous day) to 8:00 AM (9 hours total). No lunch break.

**Logic:** Pre-shift starts at 11:00 PM and goes up to 6:00 AM = 7 hours, which is > 6 hours. Rule: If Pre-shift > 6 hours, the entire job is PT. Total hours = 9. Since 9 < 10.5, missed meal does not trigger.

**Expected Results:**
- PT = 9 hours
- ST = 0 hours
- Missed Meals = 0 (9 < 10.5)

---

### Scenario 5 — ES: Call Out Before STW, Ends During STW

**Setup:** An Emergency Shift (call out) from 5:00 AM to 1:00 PM (8 hours total), no lunch.

**Logic:** First 4 hours of an ES call out are PT, regardless of STW overlap. 5:00–9:00 AM = 4 hours PT. After 9:00 AM, if the time is still within the STW (6 AM–2 PM), it becomes ST for the remaining hours. 9:00 AM–1:00 PM = 4 hours ST. Total time worked = 8 hours. Missed Meals for ES = 1 meal per 4.5 hours worked. 8 ÷ 4.5 ≈ 1.77 → round down to 1 missed meal.

**Expected Results:**
- PT = 4 hours (first 4 hours, 5–9 AM)
- ST = 4 hours (9 AM–1 PM)
- Missed Meals = 1

---

### Scenario 6 — ES: Extends Beyond STW, No 8-Hour Break

**Setup:** ES call out from 10:00 AM to 7:00 PM (9 hours), no lunch break.

**Logic:** First 4 hours (10:00 AM–2:00 PM) = PT, even though 12:00–2:00 PM overlaps STW. After 2:00 PM, we are outside the STW. ES rule says once STW ends (2:00 PM) and there's no 8-hour break, the rest is still PT. So 2:00–7:00 PM = 5 hours PT. Total hours = 9; all 9 are PT. Missed Meals for ES: 9 ÷ 4.5 = 2.

**Expected Results:**
- PT = 9 hours
- ST = 0 hours
- Missed Meals = 2

---

### Scenario 7 — RS: STW Extended by Lunch, Then Minimal PT

**Setup:** Employee works from 6:00 AM to 3:00 PM (9 hours total) with a 30-minute lunch.

**Logic:** 6:00 AM–2:30 PM is the extended ST window (because of the lunch). That's 8.5 hours on the clock, but 0.5 is unpaid lunch, so 8.0 hours paid at ST. They finish at 3:00 PM → from 2:30 to 3:00 PM is 0.5 hours outside the extended STW. Total: 8 hours ST + 0.5 hour PT = 8.5 hours on-site, 0.5 unpaid lunch. Missed meal starts after 10.5 hours for RS, so no missed meals.

**Expected Results:**
- ST = 8 hours
- PT = 0.5 hours
- Unpaid Lunch = 0.5 hours
- Missed Meals = 0 (8.5 < 10.5)

---

### Scenario 8 — RS: Exceeding 10.5 Hours with a Lunch

**Setup:** Employee works from 6:00 AM to 5:30 PM (11.5 hours total) with a 30-minute lunch in the middle.

**Logic:** Clock time: 6:00 AM–5:30 PM = 11.5 hours. 0.5 hour is unpaid lunch → 11 hours of actual work. STW + Lunch Extension: 6:00 AM–2:30 PM for ST (8 hours paid), then 2:30–5:30 PM is outside ST → 3 hours PT. Because 11 > 10.5, the first missed meal is triggered. No second missed meal unless they hit another 4.5 hours beyond the first (they don't, since total is 11 hours).

**Expected Results:**
- ST = 8 hours
- PT = 3 hours (2:30–5:30 PM)
- Unpaid Lunch = 0.5 hours
- Missed Meals = 1 (RS: more than 10.5 hours total)

---

### Scenario 9 — ES: Partial in STW, Then Continues Beyond

**Setup:** ES from 6:00 AM to 4:00 PM (10 hours), no lunch.

**Logic:** First 4 hours (6:00–10:00 AM) = PT, even though 6–10 falls in STW. After that: 10:00 AM–2:00 PM is inside STW → 4 hours ST. After STW ends (2:00 PM), the remaining hours until 4:00 PM = 2 hours. Since there's no 8-hour break after STW, it's PT again. Totals: 4 (PT) + 4 (ST) + 2 (PT) = 10 hours. Missed Meals for ES: 10 ÷ 4.5 ≈ 2.22 → round down to 2.

**Expected Results:**
- PT = 6 hours (first 4 + last 2)
- ST = 4 hours
- Missed Meals = 2

---

### Scenario 10 — Weekend / Holiday Shift

**Setup:** An RS (or ES) shift on a Sunday (or designated holiday) from 6:00 AM to 2:00 PM (8 hours). No lunch break.

**Logic:** Rule: All weekend/holiday hours are PT, regardless of STW. No lunch means 8 total hours worked. Missed meals for RS triggers after 10.5 hours; for ES, 4.5-hour increments. In 8 hours: RS = 0 missed meals; ES = 1 missed meal (8 ÷ 4.5 > 1).

**Expected Results (RS):**
- PT = 8 hours (holiday override)
- ST = 0 hours
- Missed Meals = 0 (8 < 10.5)

*(If ES, Missed Meals = 1.)*

---

## Additional Considerations

**Meal Counter Reset:** If the employee has a break between separate jobs (e.g., 7:00 AM–11:00 AM, then 6:00 PM–10:00 PM), the meal counter resets. Each job is considered independently for missed meals.

**Lunch Logic:** If a 30-minute lunch is taken, the STW can extend from 6:00 AM–2:00 PM to 6:00 AM–2:30 PM, but those 30 minutes are unpaid.

**Over 8-Hour Break:** The ES rule states that once an employee passes the ST window on an emergency shift, any subsequent hours are PT until the employee receives an 8-hour break. If they end their shift before an 8-hour break can occur, that entire portion remains PT.

---

## How to Use These Test Cases

1. **Verify Setup:** Make sure your system's configuration (STW times, lunch extension, missed meal formulas) matches these assumptions.
2. **Check Each Segment:** For each scenario, break down the shift into time blocks (pre-shift, ST, post-ST, etc.).
3. **Validate Missed Meals:** Apply the RS or ES meal formulas carefully, remembering special triggers (e.g., RS first meal after 10.5 hours, ES meal every 4.5 hours).
4. **Confirm Reset Points:** In multi-job days, ensure that meal counters reset after a break.
5. **Edge Cases:** Verify boundary conditions (e.g., exactly 10.5 hours, exactly 6 hours of pre-shift, holidays, lunch taken vs. lunch not taken).

By running these test cases (and adapting them to your exact numeric thresholds or specific local labor rules), you should achieve comprehensive coverage of the new policy logic.