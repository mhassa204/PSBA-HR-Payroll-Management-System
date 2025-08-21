# Users and Roles System Implementation

## Overview
This document describes the implementation of a comprehensive users and roles management system for the PSBA HR Payroll Management System.

## System Architecture

### Database Schema Changes

#### New Tables Added

1. **Roles Table**
   - `id`: Primary key
   - `name`: Unique role name
   - `type`: Role type (system, custom, admin)
   - `allowed_actions`: Array of permitted actions
   - `enabled`: Boolean for role status
   - `fields`: Array of accessible fields
   - `is_deleted`: Soft delete flag
   - `createdAt`, `updatedAt`: Timestamps

2. **Users Table**
   - `id`: Primary key
   - `email`: Unique email address
   - `password`: Encrypted password (AES-256-CBC)
   - `role_id`: Foreign key to roles table
   - `employee_id`: Optional foreign key to employees table (1:1 relationship)
   - `is_deleted`: Soft delete flag
   - `createdAt`, `updatedAt`: Timestamps

#### Schema Modifications

- **Employee Table**: Removed `password` field
- **Employee Table**: Added `user` relation (optional 1:1 with users)

### Backend Implementation

#### Services
- `roleService.js`: CRUD operations for roles
- `userService.js`: CRUD operations for users with password encryption

#### Controllers
- `roleController.js`: HTTP endpoints for role management
- `userController.js`: HTTP endpoints for user management

#### Routes
- `/api/roles`: Role CRUD operations
- `/api/users`: User CRUD operations
- `/api/users/available/employees`: Get available employees for assignment

### Frontend Implementation

#### Components
- `RoleManagement.jsx`: Main role management page
- `RoleForm.jsx`: Role creation/editing form
- `UserManagement.jsx`: Main user management page
- `UserForm.jsx`: User creation/editing form

#### Features
- **Role Management**: Create, edit, delete roles with permissions
- **User Management**: Create, edit, delete users with role assignment
- **Employee Assignment**: 1:1 relationship between users and employees
- **Searchable Dropdowns**: For role and employee selection
- **Password Management**: Secure password handling with encryption

## Security Features

### Password Encryption
- Uses AES-256-CBC encryption
- Environment variable `ENCRYPTION_SECRET` required
- IV (Initialization Vector) generated for each password
- Secure storage format: `iv:encrypted_password`

### Role-Based Access Control
- Granular permission system with `allowed_actions`
- Field-level access control with `fields` array
- Role types: system, custom, admin
- Enabled/disabled role status

## Default Roles

The system comes with pre-configured roles:

1. **Super Admin**
   - All permissions (`*`)
   - All fields access (`*`)
   - System role type

2. **HR Admin**
   - Employee management permissions
   - Department/designation management
   - View reports
   - Access to employee personal, employment, salary, and document fields

3. **HR Officer**
   - View and edit employees
   - View reports
   - Access to employee personal and employment fields

4. **Manager**
   - View employees and reports
   - Approve requests
   - Access to basic employee and employment fields

5. **Employee**
   - View and edit own profile
   - Access to own personal and employment fields

## Default Users

Three default users are created during seeding:

1. **admin@psba.com** (Super Admin)
   - Password: `admin123`
   - Assigned to: Ahmed Ali Khan

2. **hr@psba.com** (HR Admin)
   - Password: `hr123`
   - Assigned to: Fatima Sheikh

3. **officer@psba.com** (HR Officer)
   - Password: `officer123`
   - Assigned to: Muhammad Hassan

## Usage

### Accessing the System

1. **Roles Management**: Navigate to Settings → Roles
2. **Users Management**: Navigate to Users in the main sidebar

### Creating a New User

1. Click "Create New User" in the Users page
2. Fill in email and password
3. Select a role from the dropdown
4. Optionally assign to an employee
5. Save the user

### Creating a New Role

1. Navigate to Settings → Roles
2. Click "Create New Role"
3. Set role name and type
4. Add allowed actions and fields
5. Set enabled status
6. Save the role

## API Endpoints

### Roles
- `GET /api/roles` - Get all roles
- `GET /api/roles/:id` - Get role by ID
- `POST /api/roles` - Create new role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/available/employees` - Get available employees

## Database Migration

To apply the schema changes:

```bash
cd server
npx prisma migrate dev --name add_roles_and_users_tables
```

## Seeding

To populate the database with default data:

```bash
cd server
npm run seed
```

## Environment Variables

Required environment variables:

```env
ENCRYPTION_SECRET=your-32-character-secret-key
DATABASE_URL=your-database-connection-string
```

## Notes

- The system maintains backward compatibility
- Employee passwords are migrated to the users table
- 1:1 relationship ensures each employee can only have one user account
- Soft delete is implemented for both roles and users
- Role deletion is prevented if users are assigned to it
- Email addresses must be unique across all users
