# Missed Meal Calculations

## Overview

Missed meals are calculated per job segment (meal counters reset between jobs). The meal
applies once you have reached or surpassed the hour threshold. There are only 2 formulas,
applied based on pay type.

---

## Formula Assignment by Pay Type

| Pay Type | Description | Formula |
|---|---|---|
| 1 | Planned Work | Formula A |
| 2 | Routine Emergency – callout on Day Off | Formula B |
| 3 | Routine Emergency – callout on Scheduled Workday | Formula A |
| 4 | Routine Emergency – pre-arranged | Formula A |
| 5 | Major Emergency – from Regular Show Up | Formula A |
| 6 | Major Emergency – "first day only" away from regular show up | Formula A |
| 7 | Major Emergency – away from Regular Show Up, After 1st Day | Formula B |

---

## Missed Meal Thresholds by Pay Type

| Pay Type | 4.5 hrs | 9 hrs | *10.5+ hrs | 13.5 hrs | 15 hrs | 18 hrs | 19.5 hrs | 22.5 hrs |
|---|---|---|---|---|---|---|---|---|
| 1. Planned Work | No | No | **Yes** | No | Yes | No | Yes | No |
| 2. Routine Emergency (callout on Day Off) | Yes | Yes | No | Yes | No | Yes | No | Yes |
| 3. Routine Emergency (callout on Scheduled Workday) | No | No | Yes | No | Yes | No | Yes | No |
| 4. Routine Emergency (pre-arranged) | No | No | Yes | No | Yes | No | Yes | No |
| 5. Major Emergency (from Regular Show Up) | No | No | Yes | No | Yes | No | Yes | No |
| 6. Major Emergency ("first day only" away from regular show up) | No | No | Yes | No | Yes | No | Yes | No |
| 7. Major Emergency (away from Regular Show Up – After 1st Day) | Yes | Yes | No | Yes | No | Yes | No | Yes |

> `*10.5+` means the first missed meal triggers only after exceeding 10.5 hours (not at 9).

---

## Formulas

### Formula A — Pay Types 1, 3, 4, 5, 6
- First missed meal triggers after **10.5 hours** worked (within a single job segment)
- Subsequent missed meals every **4.5 hours** after that
- Thresholds: 10.5, 15, 19.5, 24, ...
- `f(t) = floor((t - 10.5) / 4.5) + 1` when `t >= 10.5`, else `0`

### Formula B — Pay Types 2, 7
- First missed meal triggers after **4.5 hours** worked (within a single job segment)
- Subsequent missed meals every **4.5 hours** after that
- Thresholds: 4.5, 9, 13.5, 18, 22.5, ...
- `f(t) = floor(t / 4.5)` when `t >= 4.5`, else `0`

---

## Meal Counter Reset Rule

The missed meal counter **resets at the start of each new job segment**. Each job is evaluated
independently.

---

## Worked Example — Four Consecutive Jobs

| Job | Time | Duration | Formula A (Pay Types 1,3,4,5,6) | Formula B (Pay Types 2,7) |
|---|---|---|---|---|
| Job 123 | 7:00 AM – 11:30 AM | 4.5 hrs | 0 MM (4.5 < 10.5) | 1 MM (4.5 ≥ 4.5) |
| Job 456 | 11:30 AM – 4:30 PM | 5 hrs | 0 MM (5 < 10.5) | 1 MM (5 ≥ 4.5) |
| Job 789 | 4:30 PM – 1:00 AM | 8 hrs | 0 MM (8 < 10.5) | 2 MM (floor(8/4.5) = 1... |
| Job 1011 | 1:00 AM – 4:00 AM | 3 hrs | 0 MM (3 < 10.5) | 0 MM (3 < 4.5) |

> **Note on Job 789 / Formula A:** The diagram shows 2 MM for Job 789 under Formula A.
> This suggests the meal counter may carry over cumulative hours across consecutive jobs
> without a break, rather than resetting. Verify with business logic whether a true
> break/gap between jobs is required to trigger a reset.

---

## Key Rules Summary

1. Meal counters reset at the **start of each new job** (when there is a gap/break between jobs).
2. Formula A first meal fires at **10.5 hours**; Formula B first meal fires at **4.5 hours**.
3. Both formulas then repeat every **4.5 hours** thereafter.
4. Pay type determines which formula applies — see the Formula Assignment table above.
5. A missed meal is owed for each threshold **reached or surpassed** within the job segment.