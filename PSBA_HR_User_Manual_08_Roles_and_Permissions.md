# PSBA HR Management System - User Manual

## Part 8: User Roles and Permissions Reference

---

## Overview

This document provides a comprehensive reference guide to user roles and permissions in the PSBA HR Management System. Understanding roles and permissions helps users know what they can and cannot do in the system.

---

## Understanding User Roles

Roles in the system define what actions users can perform. Each role is assigned specific permissions that control access to features and functions.

### Role Hierarchy

The system follows a hierarchical role structure:

- **Executive Level:** Director General
- **Senior Management:** Senior Directors and Managers
- **Management:** Assistant Directors
- **Department Level:** Operations, Accounts, Establishment
- **General:** Employees and Staff

---

## Director General Role

### Who Has This Role

- Director General (BPS 19-20)
- Executive leadership

### Permissions and Access

**Can Access:**

- Dashboard overview
- Travel module (read focus)
- All travel requests and expense claims
- Approval authority for travel requests and claims
- Can approve travel requests at DG level
- Can approve travel expense claims at DG level
- Can apply for personal leaves

**Cannot Access:**

- Detailed employee management
- System settings
- User management
- Daily operational tasks

### Responsibilities

- Approve high-level travel requests
- Approve expense claims requiring DG approval
- Review executive-level activities
- Monitor organizational activities through dashboard

---

## Senior Management Role

### Who Has This Role

- Senior Directors
- Additional Directors (BPS 18)

### Permissions and Access

**Can Access:**

- Travel module (requests and claims)
- Create travel requests
- Create travel expense claims
- Update and submit travel documents
- View travel status
- Access to manage screen for leadership visibility
- Can apply for personal leaves

**Cannot Access:**

- Employee management (except own record)
- System settings
- Approval permissions for OPS stage
- Accounts processing

### Responsibilities

- Submit travel requests and expense claims
- Review travel documentation
- Provide recommendations
- Participate in approval workflows where authorized

---

## Management Role

### Who Has This Role

- Assistant Directors (BPS 17)
- Management level staff

### Permissions and Access

**Can Access:**

- Travel module (full access for own submissions)
- Create and update travel requests
- Create and update travel expense claims
- Submit travel documents
- View travel status
- Access manage screen for participation in workflows
- Can apply for personal leaves

**Cannot Access:**

- Accounts processing
- Employee management (except own record)
- System configuration
- Approval permissions for OPS stage

### Responsibilities

- Submit and manage own travel requests
- Submit and manage own expense claims
- Participate in approval processes when assigned
- Manage own leaves

---

## Operations Role

### Who Has This Role

- Operations department staff
- Department-level administrators

### Permissions and Access

**Can Access:**

- Travel module (read and create)
- Create travel requests
- Create expense claims
- Submit travel documents
- View travel status
- **Approve travel requests at OPS stage**
- **Approve expense claims at OPS stage**
- Access manage screen
- Can apply for personal leaves

**Cannot Access:**

- DG approval authority
- Accounts processing
- Employee management
- System settings

### Responsibilities

- Approve bazaar-originated travel requests
- Approve bazaar-originated expense claims
- Verify OPS stage requirements
- Process operational approvals

---

## Accounts Manager Role

### Who Has This Role

- Accounts Department Head
- Senior accounting staff

### Permissions and Access

**Can Access:**

- Travel module (full access)
- Create and submit travel documents
- View travel status
- **Start accounts processing for claims**
- Access manage screen
- **Travel rate management (read and update)**
- **Access to accounts screens and tranches**
- **Access to managed entry screens**
- Can apply for personal leaves

**Special Permissions:**

- Start processing expense claims
- Manage travel rates
- Create and manage tranches
- Accounts-specific screens

**Cannot Access:**

- Approve at OPS or DG stages
- Employee management
- System configuration

### Responsibilities

- Process verified expense claims
- Create payment tranches
- Manage travel rates
- Coordinate with finance
- Start accounts processing workflow

---

## Accounts User Role

### Who Has This Role

- Accounts department staff
- Accounting personnel

### Permissions and Access

**Can Access:**

- Travel module (full access for submissions)
- Create and submit travel documents
- View travel status
- **Start accounts processing for claims**
- **Travel rate management (read and update)**
- **Access to accounts screens and tranches**
- Access to managed entry screens
- Can apply for personal leaves

**Cannot Access:**

- OPS or DG approvals
- Employee management
- System settings

### Responsibilities

- Assist in accounts processing
- Help manage tranches
- Review travel rates
- Support Accounts Manager
- Process expense claims

---

## Establishment Role

### Who Has This Role

- HR Staff
- Establishment Officers
- Human Resources personnel

### Permissions and Access

**Can Access:**

- Dashboard
- **Full Employee Management**
  - Create, read, update, delete employees
    paycheck
- **Full Employment Management**
  - Manage employment records
  - Manage salary information
  - Manage location assignments
  - Manage contracts
- Settings (read access)
  - View departments, designations, role tags
  - View scale grades, locations, devices
  - View districts, cities, education levels
- **Device Management** (full access)
- **Leave Management** (full access)
- **Leave Banks and Leave Types** (full access)
- **Attendance Management** (full access)
- **Roster Management** (full access)
- Travel module
- **Verify expense claims at Establishment stage**
- Can apply for personal leaves

### Responsibilities

- Manage employee records
- Process leave applications
- Manage leave banks
- Maintain attendance data
- Configure system settings
- Verify establishment requirements
- Handle HR operations

---

## Employee Role

### Who Has This Role

- General employees
- Regular staff members
- Staff without administrative duties

### Permissions and Access

**Can Access:**

- View own profile
- Update own personal information
- Travel module (for own submissions)
  - Create and submit travel requests
  - Create and submit expense claims
  - View own travel status
  - Update own travel documents
- Can apply for personal leaves

**Cannot Access:**

- Other employees' information
- Approval workflows
- System settings
- Employee management
- Location or department management

### Responsibilities

- Maintain own profile information
- Submit travel requests
- Submit expense claims
- Apply for leaves
- View own attendance and records

---

## Understanding Permissions

### Permission Types

#### Read Permission

- View information
- Access data
- Browse records
- Example: "employees.read" allows viewing employee list

#### Create Permission

- Add new records
- Submit forms
- Create new entries
- Example: "employees.create" allows adding new employees

#### Update Permission

- Modify existing records
- Edit information
- Change details
- Example: "employees.update" allows editing employees

#### Delete Permission

- Remove records
- Delete entries
- Permanent removal
- Example: "employees.delete" allows deleting employees

#### Approve Permission

- Approve requests
- Authorize actions
- Give consent
- Example: "travel.request.approve.ops" allows OPS approval

#### Manage Permission

- Administrative control
- Configuration access
- Full management rights
- Example: "users.manage" allows managing user accounts

---

## Permission Categories

### Employee Permissions

- **employees.read:** View employee list
- **employees.create:** Add new employees
- **employees.update:** Edit employee information
- **employees.delete:** Remove employees

### Employment Permissions

- **employment.read:** View employment records
- **employment.create:** Add employment records
- **employment.update:** Update employment details
- **employment.delete:** Delete employment records

### Attendance Permissions

- **attendance.read:** View attendance data
- **attendance.fetch:** Fetch from devices
- **attendance.map:** Map employees to devices
- **attendance.create:** Create attendance records
- **attendance.update:** Update attendance
- **attendance.delete:** Delete attendance

### Leave Permissions

- **leaves.read:** View leaves
- **leaves.create:** Create leaves
- **leaves.apply:** Apply for leave
- **leaves.status:** View leave status
- **leaves.update:** Update leaves
- **leaves.delete:** Delete leaves

### Travel Permissions

- **travel.read:** View travel information
- **travel.create:** Create travel requests
- **travel.update:** Update travel documents
- **travel.submit:** Submit travel documents
- **travel.manage:** Manage travel module
- **travel.request.approve.ops:** Approve at OPS stage
- **travel.request.approve.dg:** Approve at DG stage
- **travel.claim.approve.ops:** Approve claims at OPS
- **travel.claim.approve.dg:** Approve claims at DG
- **travel.claim.verify.establishment:** Verify at Establishment
- **travel.claim.process.start:** Start accounts processing

### Settings Permissions

- **departments.read:** View departments
- **designations.read:** View designations
- **role-tags.read:** View role tags
- **scale-grades.read:** View scale grades
- **locations.read:** View locations
- **devices.read/view/create/update/delete:** Device management
- **travel.rates.read:** View travel rates
- **travel.rates.manage:** Manage travel rates

### Roster Permissions

- **roster.read:** View rosters
- **roster.create:** Create rosters
- **roster.update:** Update rosters
- **roster.delete:** Delete rosters
- **roster.status:** View roster status
- **roster.status.change:** Change roster status

### Dashboard and Reports

- **dashboard.read:** View dashboard
- **reports.read:** Access reports

### Profile Permissions

- **profile.read:** View own profile
- **profile.update:** Update own profile

### User Management

- **users.read:** View user list
- **users.manage:** Manage user accounts

---

## Understanding Your Access

### How to Know What You Can Do

1. **Check Your Role:** Look at your profile to see your role
2. **Observe Menu Items:** Only see options you can access
3. **Try Actions:** System will prevent unauthorized actions
4. **Contact Administrator:** Ask for clarification if unsure

### Common Access Patterns

- **Most Users:** Can view and update own information, submit requests
- **Managers:** Can view team data, approve requests
- **Department Staff:** Can process department-specific tasks
- **HR Staff:** Can manage employees, attendance, leaves
- **Accounts Staff:** Can process financial transactions
- **Administrators:** Can configure system settings

---

## Requesting Additional Access

### When to Request

- Need access to additional features
- Changed job responsibilities
- Promotion or transfer
- Special project requirements

### How to Request

1. Speak with your supervisor
2. Explain business need
3. Supervisor submits request to IT/Admin
4. Administrator reviews and approves
5. Access is granted

### Do's and Don'ts

**Do:**

- Request only what you need
- Provide business justification
- Be patient with approval process

**Don't:**

- Share your account with others
- Request unnecessary access
- Bypass approval processes

---

## Security Best Practices

1. **Keep Password Secure:** Don't share your password
2. **Log Out Properly:** Always log out when finished
3. **Report Issues:** Report any suspicious activity
4. **Don't Share Account:** Each user should have own account
5. **Follow Policies:** Comply with organizational policies

---

## Troubleshooting Access Issues

### Can't See a Menu Item

- Check if you have necessary permissions
- Verify your role is correct
- Contact administrator

### Can't Perform an Action

- You may not have required permission
- Action may be disabled
- Contact administrator

### Access Was Removed

- May be due to role change
- Could be policy update
- Contact administrator for explanation

---

## Summary Table

| Role              | Travel       | Approve     | Employees | Leaves | Attendance | Settings | Accounts |
| ----------------- | ------------ | ----------- | --------- | ------ | ---------- | -------- | -------- |
| Director General  | View, Submit | DG Level    | None      | Apply  | None       | None     | None     |
| Senior Management | Full         | None        | None      | Apply  | None       | None     | None     |
| Management        | Full         | None        | None      | Apply  | None       | None     | None     |
| Operations        | Full         | OPS Level   | None      | Apply  | None       | None     | None     |
| Accounts Manager  | Full         | Legislature | None      | Apply  | None       | None     | Process  |
| Accounts User     | Full         | None        | None      | Apply  | None       | None     | Process  |
| Establishment     | Full         | Establish   | Full      | Full   | Full       | Read     | Verify   |
| Employee          | Own          | None        | Own       | Apply  | Own        | None     | None     |

---

## Conclusion

Understanding roles and permissions ensures you know:

- What you can access
- What actions you can perform
- Whom to contact for help
- How to request additional access

Use this guide as a reference when working with the system.

---

_End of Part 8: User Roles and Permissions Reference_

_End of PSBA HR Management System User Manual_
