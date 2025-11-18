# PSBA HR Management System - User Manual

## Part 7: Settings and Configuration

---

## Overview

The Settings module allows authorized users to manage system configuration, master data, and organizational settings. This module controls the foundation data that all other modules depend on.

**Important Note:** Most settings can only be modified by authorized administrators or HR staff.

**Key Settings Categories:**

- Departments
- Designations
- Role Tags
- Scale Grades
- Locations
- Devices
- Districts and Cities
- Education Levels
- Travel Rates
- User Management
- Roles and Permissions

**Who Can Access Settings:**

- HR Staff (Establishment role)
- System Administrators
- Authorized management personnel

---

## Accessing Settings

### Opening Settings

1. From main menu, click **"Settings"**
2. Settings dashboard opens showing all categories
3. Click on any category to manage

---

## Department Management

### What are Departments?

Departments are organizational units within the organization (e.g., Operations, Establishment, Accounts, Finance).

### Viewing Departments

1. Go to Settings > Departments
2. View list of all departments
3. Shows: Name, Code, Description, Status

### Adding a Department

1. Click **"Add Department"** button
2. Enter:
   - **Name:** Department name (e.g., "IT Department")
   - **Code:** Short code (e.g., "IT")
   - **Description:** Brief description (optional)
3. Click **"Save"**

### Editing Department

1. Find department in list
2. Click **"Edit"**
3. Update information
4. Save changes

### Deleting Department

**Note:** Departments with employees cannot be deleted.

1. Find department
2. Click **"Delete"** or mark inactive
3. Confirm deletion

---

## Designation Management

### What are Designations?

Designations are job titles or positions (e.g., "Director General", "Assistant Director", "Manager").

### Viewing Designations

1. Go to Settings > Designations
2. View list of designations
3. Shows: Title, Department, Level, Status

### Adding a Designation

1. Click **"Add Designation"** button
2. Enter:
   - **Title:** Job title name
   - **Department:** Select from dropdown (optional)
   - **Level:** Hierarchy level (optional)
   - **Description:** Brief description (optional)
3. Click **"Save"**

### Editing Designation

1. Find designation
2. Click **"Edit"**
3. Update details
4. Save changes

---

## Role Tag Management

### What are Role Tags?

Role Tags categorize employees by functional role (e.g., "Engineer", "Accountant", "Security Officer").

### Viewing Role Tags

1. Go to Settings > Role Tags
2. View list of role tags

### Adding a Role Tag

1. Click **"Add Role Tag"**
2. Enter:
   - **Name:** Role tag name
   - **Description:** Brief description
   - **Category:** Optional category
3. Click **"Save"**

---

## Scale Grade Management

### What are Scale Grades?

Scale Grades represent pay scales (e.g., BPS-17, BPS-18, BPS-19, BPS-20).

### Viewing Scale Grades

1. Go to Settings > Scale Grades
2. View list of grades
3. Shows: Name, Level, Category

### Adding a Scale Grade

1. Click **"Add Scale Grade"**
2. Enter:
   - **Name:** Grade name (e.g., "BPS-17")
   - **Level:** Numeric level (e.g., 17)
   - **Description:** Description
   - **Category:** Category type
3. Click **"Save"**

---

## Location Management

### What are Locations?

Locations are physical places where work is performed (Head Office or Bazaars).

### Viewing Locations

1. Go to Settings > Locations
2. View all locations
3. Shows: Name, Type, District, City, Status

### Adding a Location

1. Click **"Add Location"**
2. Enter:
   - **Name:** Location name
   - **Type:** Head Office or Bazaar
   - **District:** Select district
   - **City:** Select city
   - **Full Address:** Complete address
   - **Opening Time:** When location opens (HH:mm)
   - **Closing Time:** When location closes (HH:mm)
   - **Manager:** Assign manager (optional)
3. Click **"Save"**

### Editing Location

1. Find location
2. Click **"Edit"**
3. Update information
4. Save changes

---

## Device Management

### What are Devices?

Devices are biometric attendance machines installed at locations.

### Viewing Devices

1. Go to Settings > Devices
2. View all devices
3. Shows: IP Address, Port, Location, Status

### Adding a Device

1. Click **"Add Device"**
2. Enter:
   - **IP Address:** Device network IP
   - **Port Number:** Network port
   - **Location:** Where device is installed
3. Click **"Save"**

### Editing Device

1. Find device
2. Click **"Edit"**
3. Update information
4. Save changes

---

## District and City Management

### What are Districts and Cities?

Geographical master data for addresses and locations.

### Viewing Districts

1. Go to Settings > Districts
2. View all districts

### Adding District

1. Click **"Add District"**
2. Enter:
   - **Name:** District name
   - **Status:** Active or Inactive
3. Click **"Save"**

### Managing Cities

1. Go to Settings > Cities
2. View cities by district
3. Add cities within districts

---

## Education Level Management

### What are Education Levels?

Education levels categorize qualifications (e.g., "Bachelor", "Master", "PhD").

### Viewing Education Levels

1. Go to Settings > Education Levels
2. View all levels

### Adding Education Level

1. Click **"Add Education Level"**
2. Enter:
   - **Name:** Level name
   - **Description:** Description
   - **Order:** Display order
3. Click **"Save"**

---

## Travel Rate Management

### What are Travel Rates?

Travel rates define per km and per diem rates for different scale grades.

### Viewing Travel Rates

1. Go to Settings > Travel Rates
2. View rates by scale grade

### Updating Travel Rates

1. Find scale grade
2. Click **"Edit"**
3. Update:
   - **Rate Per KM:** Travel allowance rate
   - **Per Diem Rate:** Daily allowance rate
4. Click **"Save"**

**Note:** Only Accounts staff or authorized personnel can modify rates.

---

## User Management

### What is User Management?

User management controls system access and accounts.

### Accessing User Management

1. Go to Users from main menu
2. View all system users

### Understanding Users

The user list shows:

- Email (username)
- Role
- Linked Employee
- Status (Active/Inactive)
- Department (if department-based)
- Location (if location-based)

### Creating a New User

1. Click **"Add User"** button
2. Select type:
   - **Employee-Based:** Link to employee
   - **Department-Based:** Link to department
   - **Location-Based:** Link to location
3. Fill in:
   - **Email:** User's email address
   - **Password:** Default password (abc123)
   - **Role:** Select appropriate role
   - **Link:** Link to employee/department/location
4. Click **"Save"**

### Types of Users

#### Employee-Based User

- Linked to specific employee
- Accesses their own information
- Can apply for leaves/travel

#### Department-Based User

- Linked to specific department
- Handles department tasks
- Can approve department items

#### Location-Based User

- Linked to specific location
- Manages location-specific data
- Can create rosters for location

### Managing User Access

1. Find user in list
2. Click **"Edit"**
3. Update:
   - Role
   - Status (enable/disable)
   - Link information
4. Save changes

### Disabling Users

To deactivate a user account:

1. Open user record
2. Update status to inactive
3. Save changes

**Note:** Don't delete users, disable them to preserve history.

---

## Role and Permission Management

### What are Roles?

Roles define what actions users can perform in the system.

### Viewing Roles

1. Go to Settings > Roles
2. View all system roles

### Understanding Role List

Display shows:

- **Role Name:** Name of the role
- **Type:** Role category
- **Enabled:** Active or inactive
- **Permissions:** What access is granted

### Common Roles

- **Director General:** Executive level access
- **Senior Management:** BPS-18 management
- **Management:** BPS-17 management
- **Operations:** Operations staff
- **Accounts Manager:** Accounts department head
- **Accounts User:** Accounts staff
- **Establishment:** HR and establishment staff
- **Employee:** General employee access

### Role Permissions

Each role has specific permissions:

- **Read:** View information
- **Create:** Add new records
- **Update:** Modify records
- **Delete:** Remove records
- **Approve:** Approve requests
- **Manage:** Administrative tasks

**Note:** Permission management requires system administrator access.

---

## System Settings

### Database Settings

Database configuration (admin only):

- Connection settings
- Backup settings
- Maintenance options

### Security Settings

Security configuration (admin only):

- Password policies
- Session settings
- Security features

---

## Common Settings Tasks

### Task: Add New Department

1. Go to Settings > Departments
2. Click "Add Department"
3. Fill in details
4. Save

### Task: Update Designation

1. Go to Settings > Designations
2. Find designation
3. Click Edit
4. Update details
5. Save

### Task: Configure Travel Rates

1. Go to Settings > Travel Rates
2. Select scale grade
3. Update rates
4. Save

### Task: Add New Location

1. Go to Settings > Locations
2. Click "Add Location"
3. Fill location details
4. Save

### Task: Create New User

1. Go to Users
2. Click "Add User"
3. Select user type
4. Fill in details
5. Save

---

## Best Practices

1. **Document Changes:** Keep records of settings changes
2. **Regular Review:** Review settings periodically
3. **Backup Before Changes:** Important for critical settings
4. **Access Control:** Limit who can modify settings
5. **Validation:** Ensure settings are accurate
6. **Training:** Train staff on settings management
7. **Coordination:** Coordinate with other departments
8. **Testing:** Test changes before full deployment

---

## Troubleshooting

### Cannot Modify Setting

- Check your permissions
- Verify setting is not in use
- Contact administrator

### Setting Not Showing

- Check filters applied
- Verify permissions
- Refresh page

### Data Validation Error

- Check required fields
- Verify format requirements
- Review input values

---

## Important Notes

### Master Data Impact

- Changes to master data affect all system users
- Update carefully
- Communicate changes to staff

### Backup and Recovery

- Settings are critical system data
- Regular backups recommended
- Recovery procedures should be documented

### Access Control

- Limit access to settings
- Assign appropriate permissions
- Audit settings changes

---

## Next Steps

Now that you understand settings management, you may want to review:

- **Part 8:** User Roles and Permissions Reference

---

_End of Part 7: Settings and Configuration_
