### Standard Time (ST) Window

The primary rule is that any work hours that fall between 6am and 2pm will be billed as ST even if they started at PT prior to shift Start. There are a few exceptions and specific examples, listed below.

*   **Breaks in Shift.** In the example below, we see that a break has happened mid-shift, but start of PT has not changed:
    
*   <img class="op-uc-image op-uc-image_inline" src="/api/v3/attachments/199/content" alt="A break between jobs does not affect the fixed limits of ST">
    

A break between jobs does not affect the fixed limits of ST. If a Crewmember comes on shift at 6am and works for 30 minutes, then works again at 2pm, their hours at 2pm start at Premium Time.

> note: at 6am, the defaults for meals and Pay Rates are reset.

*   **Shift Start Time** The standard time is an 8 hour period. At the time of this document, it starts at 6am. However, this time is negotiated with the union and can change. It remains an 8hr period, but it could easily be changed in a union negotiation. As such, the Shift Start Time will be kept in a config table in the database
    

### Premium Time (PT)

This is the rate at which a crewmember&#39;s work hours will be billed when work takes place outside of the Standard Time Window.

### Missed Meals (MM)

The calculation for Missed Meals is dependent on Pay Type.

#### Pay Types:

1.  Planned Work
    
2.  Routine Emergency (callout on Day Off)
    
3.  Routine Emergency (callout on Scheduled Workday)
    
4.  Routine Emergency (pre-arranged)
    
5.  Major Emergency (from Regular Show Up)
    
6.  Major Emergency (_first day only_ away from regular show up)
    
7.  Major Emergency (away from Regular Show Up - After 1st Day)
    

The Time Sheet Editor will set the defaults as shown below based upon the pay type and the hours worked.

<img class="op-uc-image op-uc-image_inline" src="/api/v3/attachments/200/content" alt="Missed Meal Calculations">

#### Time Breaks Between Jobs

In the event there is a break between jobs in a timesheet, the meal counter **STARTS OVER** at the beginning of the second job. &nbsp;So if you have worked from 7am to 11am and then the next job is at 6pm to 10pm, then you do not qualify for any missed meals because you have technically worked one job for 4hrs and then the meal counter reset to zero.  the next job started at 6 and you worked 4hrs, so you only had 4 &quot;meal hours&quot; accrued and there is no instance where 4 hours would get you a missed meal.

#### Missed Meal Exceptions

> There will be circumstances where a crewmember may have been working on a previous shift or may have arrived mid-shift. The system will not account for that and the Foreman is responsible for determining the number of missed meals.

#### End of Shift Exception

If Pay Type is 1,3,4,5,6, and the shift ends directly at 10.5, the employee does not get the credit for a missed meal.

> In the example above, under Pay type 2,7, you can see that the first job ended directly at 4.5 hours. If that was the last job of the day, then the crewmember would not receive a missed meal credit.

### Breaks in Shift

Missed meal calculations start from the beginning of the day until the last job of the day without a break of 4 hours

### Emergency Callout

First 4hrs is PT no matter what. If it goes into ST window, then those hours are changed to PT, but the end of the window stays the same.