# PSBA HR Management System - User Manual

## Part 3: Attendance Management

---

## Overview

The Attendance Management module provides comprehensive attendance tracking using biometric devices. This module allows you to monitor employee attendance, manage devices, view attendance by location, and generate attendance reports.

**Key Features:**

- Biometric device integration
- Location-based attendance tracking
- Attendance by employee
- Device management
- Attendance history and reports

**Who Can Use This Module:**

- HR Staff (Establishment role)
- Location Managers
- Users with attendance permissions

---

## Understanding Attendance Structure

### Locations

The system organizes attendance by **Locations**:

- **Head Office:** Main administrative office
- **Bazaars:** Individual sales locations (e.g., "Sahulat Bazaar Mian Plaza")

Each location has:

- Assigned employees
- Biometric devices
- Opening and closing times
- Manager(s)

### Devices

Biometric devices are the hardware used to record attendance:

- Installed at specific locations
- Connected to the network
- Capture employee check-in/check-out times
- Automatically sync data to the system

### Attendance Records

Each attendance entry contains:

- Employee information
- Date and time
- Type (IN/OUT - check-in or check-out)
- Device information
- Location

---

## Viewing Attendance by Location

### Accessing Location List

1. From the main menu, click **"Attendance"**
2. Click **"Locations"**
3. You'll see a list of all locations

### Location Details

The location list shows:

- Location name
- Type (Head Office or Bazaar)
- District and City
- Status (Active/Inactive)
- Number of employees assigned
- Number of devices installed

### Opening a Location

1. Click on a location name
2. The system displays location overview with tabs:

   - **Home:** General location information
   - **FMO:** First Morning On-duty records
   - **Roster:** Duty roster assignments
   - **LSR:** Late Stay Report

---

## Viewing First Morning On-duty (FMO)

### What is FMO?

FMO shows who reported first at each location each day. This helps:

- Monitor early arrivals
- Track punctuality
- Ensure locations open on time

### Accessing FMO Report

1. Open a location
2. Click the **"FMO"** tab
3. Select date range if needed
4. View the report

### Understanding FMO Report

The report shows:

- Date
- Employee name
- First check-in time
- Location
- Any remarks

---

## Viewing Duty Rosters

### What is a Roster?

A roster is the scheduled duty assignment for employees at a location. It defines:

- Which employees work on which days
- Working hours for each day
- Time slots and breaks

### Accessing Roster Information

1. Open a location
2. Click the **"Roster"** tab
3. View roster for the selected period

### Understanding Roster Display

The roster shows:

- Employee names
- Day-by-day schedule
- Time slots (from/to)
- Location assignments
- Weekly off days

---

## Viewing Late Stay Report (LSR)

### What is LSR?

LSR identifies employees who stayed late (beyond normal hours). This helps:

- Monitor overtime
- Track late departures
- Ensure safety compliance

### Accessing LSR Report

1. Open a location
2. Click the **"LSR"** tab
3. Select the month
4. View the report

### Understanding LSR Report

The report shows:

- Employee name
- Date
- Last check-out time
- Normal closing time
- Hours worked late
- Status

---

## Viewing All Attendance

### Accessing Attendance Dashboard

1. Click **"Attendance"** from main menu
2. You'll see attendance overview

### Filtering Attendance

Options to filter attendance:

- **By Date Range:** Select start and end dates
- **By Location:** Choose specific location
- **By Employee:** Enter employee name or ID
- **By Device:** Filter by device

### Viewing Individual Attendance

1. Use filters to narrow down results
2. Click on an employee's attendance record
3. View detailed attendance history

---

## Managing Devices

### Accessing Device Management

1. From Attendance menu, click **"Devices"**
2. View list of all biometric devices

### Understanding Device List

The list shows:

- Device ID
- IP Address and Port
- Location (where installed)
- Status (Active/Inactive)
- Last sync date/time

### Adding a New Device

**Note:** Only authorized personnel can add devices.

1. Click **"Add Device"** button
2. Enter device information:
   - IP Address
   - Port Number
   - Location (select from dropdown)
3. Click **"Save"**

### Updating Device Information

1. Find the device in the list
2. Click **"Edit"**
3. Modify information
4. Click **"Save"**

---

## Fetching Attendance Data

The system can fetch attendance data from biometric devices.

### Manual Fetch

1. Go to Attendance > Devices
2. Find the device you want to fetch from
3. Click **"Fetch Data"**
4. System will connect to device
5. Downloaded records will appear

### Automatic Sync

The system may automatically sync with devices:

- At scheduled intervals
- Based on configuration
- Ensures data is always current

---

## Employee-Device Mapping

### Why Mapping is Needed

Employees need to be mapped to device user IDs so the system recognizes them when they use biometric devices.

### Viewing Mapped Employees

1. Go to Attendance section
2. View employees with device IDs assigned

### Mapping an Employee to Device

1. Open employee profile
2. Navigate to attendance section
3. Enter device user ID
4. Save mapping

### Updating Device User ID

1. Find employee record
2. Go to device mapping section
3. Update device user ID
4. Save changes

---

## Attendance Reports

### Monthly Summary Report

Shows attendance summary for selected month:

- Total work days
- Days present
- Days absent
- Late arrivals
- Early departures

### Individual Employee Report

View any employee's attendance:

1. Select employee from list
2. Choose date range
3. View detailed attendance log

### Location-Based Report

See attendance for entire location:

1. Select location
2. Choose date range
3. View all employees' attendance

### Exporting Reports

Many reports can be exported:

- **Excel format:** For detailed analysis
- **PDF format:** For official documentation
- **Print:** Direct printing

---

## Managing Leave Through Attendance

Leaves are also managed in the attendance module since they affect attendance records.

### Viewing Leave Records

1. From Attendance menu, click **"Leave Management"**
2. View all leave applications
3. Filter by status, employee, or date range

### Leave Statuses

- **Pending:** Awaiting approval
- **Approved:** Leave has been granted
- **Rejected:** Leave has been denied

### Approving Leaves

1. Go to Leave Approvals
2. View pending leaves
3. Click on a leave request
4. Review details
5. Click **"Approve"** or **"Reject"**
6. Add comments if needed
7. Submit decision

---

## Understanding Attendance Status

### Present

- Employee checked in and checked out
- Within normal working hours
- No leave applied

### Absent

- No check-in record for the day
- Leave may or may not have been applied

### Half Day

- Checked in or out only once
- Present for part of the day
- May be due to leave or other reasons

### Late

- Checked in after specified time
- Recorded in attendance system

### On Leave

- Leave has been approved
- Absence is authorized
- Shown in attendance records

---

## Common Tasks

### Task: Check an Employee's Attendance

1. Go to Attendance section
2. Search for employee
3. Select date range
4. View attendance history

### Task: View Location Attendance

1. Click on Attendance > Locations
2. Select a location
3. View all employees at that location
4. See attendance summary

### Task: Identify Absent Employees

1. Go to location attendance
2. Select date
3. View who didn't check in
4. Generate absence report

### Task: Check Device Status

1. Go to Devices list
2. View device status (Active/Inactive)
3. Check last sync time
4. Take action if device is offline

### Task: Generate Monthly Report

1. Go to Reports section (if available)
2. Select "Attendance Report"
3. Choose month
4. Select location (optional)
5. Generate report

---

## Troubleshooting

### No Attendance Data Showing

- Check if date range is correct
- Verify device is active
- Ensure sync has occurred
- Check employee-device mapping

### Wrong Attendance Time

- Device clock may be incorrect
- Contact IT to sync device time
- Report to system administrator

### Employee Not Recognized by Device

- Verify device user ID mapping
- Re-m biometric in device if needed
- Contact IT support

### Device Offline

- Check network connection
- Verify IP address
- Contact IT to restore connection

---

## Best Practices

1. **Regular Monitoring:** Check attendance regularly for any issues
2. **Device Maintenance:** Keep devices clean and functional
3. **Timely Sync:** Ensure devices sync frequently
4. **Accurate Mapping:** Keep employee-device mappings up to date
5. **Leave Management:** Process leave requests promptly
6. **Documentation:** Keep records of any attendance issues

---

## Next Steps

Now that you understand attendance management, you may want to learn about:

- **Part 4:** Leave Management (detailed)
- **Part 5:** Travel Management
- **Part 6:** Duty Roster Management

---

_End of Part 3: Attendance Management_
