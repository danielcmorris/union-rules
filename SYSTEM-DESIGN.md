# TIME SHEET CALCULATOR
The purpose of this application is to provide employees and managers the ability to caluclate the pay results for a single employee or a set of employees.  

> initially, we will start with the user entry and then move to those which require access to the API server

## RULES
The payment rules are defined in the CALCULATION_ALGORITYM.md file and in a more readble version here: PAY-RULES-HUMAN.md.  They use a variety of information taken from the contract that are available in REFERENCE.md, MISSED-MEALS.md, CONTRACT-PROVISIONS.md, and a sample conversation SAMPLE.md.

## DATA SOURCES

### User Entry
A generic text box will allow a user to paste in a timesheet or sections of a timesheet.  The UI will ask for additional material until the requirements for calculations are fulfilled.  Once complete, the results will be displayed.

### Time Sheet Entry
The user may type in a timesheet number like this:  TIMESHEET#123 which will execute and API call to the server which will pull the data for that timesheet.
> this is not yet completed.  use mock data for now.

### Employee Entry
The user may type in an employee and a date range which will execute and API call to the server which will pull that particular employee's timesheet data for that range.

## INTEROGATIVE
After the timesheet results have been displayed, the user may click "Explain?", which takes them to another page displaying the timesheet or the results of an employee.  On that page, they may ask questions about why a certain number or value is used.  
eg. why does he get 5hr of PT on tuesday?

