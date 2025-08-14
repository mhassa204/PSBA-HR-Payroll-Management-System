# Soft Delete System Implementation

This document describes the comprehensive soft delete system implemented across the PSBA HR Payroll Management System.

## Overview

The soft delete system allows records to be marked as deleted without actually removing them from the database. This provides data recovery capabilities and maintains referential integrity while allowing users to "delete" records.

## Key Features

- **Cascading Soft Delete**: When a parent record is soft deleted, all dependent child records are also soft deleted
- **Data Recovery**: Soft-deleted records can be restored with all their relationships intact
- **Automatic Cleanup**: Configurable cleanup of old soft-deleted records
- **Admin Management**: Comprehensive admin interface for managing soft-deleted records
- **Hard Delete Utility**: Optional utility for permanent removal of records

## Database Schema Changes

### New Field Added
All Prisma models now include:
```prisma
is_deleted Boolean @default(false)
```

### Models Updated
- `Employee`
- `Department`
- `Designation`
- `PastExperience`
- `EducationQualification`
- `EmployeeDocument`
- `Employment`
- `EmploymentSalary`
- `EmploymentLocation`
- `EmploymentContract`
- `EmploymentDocument`

## Implementation Details

### 1. Soft Delete Operations

#### Employee Soft Delete
When an employee is soft deleted, the following cascade occurs:
1. Employment documents
2. Employment contracts
3. Employment locations
4. Employment salaries
5. Employment records
6. Employee documents
7. Education qualifications
8. Past experiences
9. Employee record

#### Employment Soft Delete
When an employment record is soft deleted:
1. Employment documents
2. Employment contract
3. Employment location
4. Employment salary
5. Employment record

#### Department Soft Delete
When a department is soft deleted:
1. Designations in the department
2. Employment records in the department
3. Department record

#### Designation Soft Delete
When a designation is soft deleted:
1. Employment records with this designation
2. Designation record

### 2. Service Layer Updates

All service files have been updated to:
- Replace `delete()` operations with `update()` operations setting `is_deleted: true`
- Implement cascading soft delete using Prisma transactions
- Add restore functionality for soft-deleted records
- Exclude soft-deleted records from queries by default

### 3. Query Modifications

All read queries now automatically exclude soft-deleted records:
```javascript
// Before
const employees = await prisma.employee.findMany();

// After
const employees = await prisma.employee.findMany({
  where: { is_deleted: false }
});
```

Optional parameter to include deleted records:
```javascript
const allEmployees = await prisma.employee.findMany({
  where: includeDeleted ? {} : { is_deleted: false }
});
```

## API Endpoints

### Admin Routes (`/api/admin`)

#### Get Deleted Records Summary
```
GET /api/admin/deleted-records
```
Returns count of soft-deleted records by type.

#### Get Soft-Deleted Employees
```
GET /api/admin/deleted-employees?page=1&limit=10&search=name
```
Returns paginated list of soft-deleted employees with search functionality.

#### Restore Employee
```
POST /api/admin/restore-employee/:id
```
Restores a soft-deleted employee and all related records.

#### Get Soft-Deleted Departments
```
GET /api/admin/deleted-departments
```
Returns list of soft-deleted departments.

#### Restore Department
```
POST /api/admin/restore-department/:id
```
Restores a soft-deleted department and all related records.

#### Get Soft-Deleted Designations
```
GET /api/admin/deleted-designations
```
Returns list of soft-deleted designations.

#### Restore Designation
```
POST /api/admin/restore-designation/:id
```
Restores a soft-deleted designation and all related records.

#### Manual Cleanup
```
POST /api/admin/cleanup
Body: { "daysOld": 90 }
```
Manually triggers cleanup of soft-deleted records older than specified days.

#### Hard Delete
```
DELETE /api/admin/hard-delete/:model/:id
```
Permanently removes a soft-deleted record (irreversible).

## Utility Functions

### HardDeleteUtil

Located at `server/src/utils/hardDeleteUtil.js`, this utility provides:

- `hardDeleteEmployee(employeeId)`: Permanently removes employee and all related records
- `hardDeleteEmployment(employmentId)`: Permanently removes employment and related records
- `hardDeleteDepartment(departmentId)`: Permanently removes department and related records
- `hardDeleteDesignation(designationId)`: Permanently removes designation and related records
- `hardDeleteRecord(modelName, recordId)`: Generic hard delete for any model
- `cleanupSoftDeletedRecords(daysOld)`: Cleanup utility for old soft-deleted records

## Cleanup System

### Automatic Cleanup
- Runs every Sunday at 2 AM
- Removes soft-deleted records older than 90 days
- Uses the HardDeleteUtil for safe cleanup

### Manual Cleanup
- Available through admin API
- Configurable retention period (1-365 days)
- Immediate execution

## Migration and Seeding

### Database Migration
After updating the schema:
```bash
npx prisma generate
npx prisma migrate dev --name add_soft_delete
```

### Seed File Updates
The seed file has been updated to:
- Use hard delete for cleanup operations
- Explicitly set `is_deleted: false` for all new records
- Handle the new schema structure properly

## Frontend Considerations

### Display Changes
- Soft-deleted records are hidden from normal views
- Admin interfaces can show deleted records with appropriate indicators
- Restore buttons for soft-deleted records

### API Response Changes
- Delete operations now return success messages instead of deleted records
- New restore endpoints for data recovery
- Admin endpoints for managing deleted records

## Security Considerations

### Access Control
- All admin routes require authentication
- Soft delete operations maintain existing permission checks
- Hard delete operations are restricted to admin users

### Data Integrity
- Foreign key constraints remain intact
- Soft delete operations use transactions for consistency
- Restore operations maintain all relationships

## Testing

### Test Scenarios
1. **Soft Delete Employee**: Verify all related records are soft deleted
2. **Restore Employee**: Verify all related records are restored
3. **Cascade Soft Delete**: Verify parent deletion affects children
4. **Query Exclusion**: Verify soft-deleted records don't appear in normal queries
5. **Admin Access**: Verify admin can see and manage deleted records
6. **Cleanup Operations**: Verify old records are properly cleaned up

### Test Commands
```bash
# Test the system
npm test

# Run specific tests
npm test -- --grep "soft delete"
```

## Monitoring and Maintenance

### Logging
- All soft delete operations are logged
- Restore operations are tracked
- Cleanup operations report detailed results

### Performance Considerations
- Soft delete operations use transactions for consistency
- Queries automatically exclude deleted records
- Indexes on `is_deleted` field for performance

### Backup Strategy
- Regular database backups include soft-deleted records
- Consider separate backup for very old soft-deleted records
- Monitor storage usage of soft-deleted records

## Troubleshooting

### Common Issues

#### Records Still Appearing After Delete
- Check if `is_deleted` field is properly set
- Verify query includes `is_deleted: false` filter
- Check for hardcoded queries that don't use the filter

#### Restore Not Working
- Verify record exists and is soft-deleted
- Check transaction logs for errors
- Ensure all related records are properly restored

#### Cleanup Not Working
- Verify cleanup job is running
- Check database permissions
- Review cleanup logs for errors

### Debug Commands
```bash
# Check soft-deleted records
npx prisma studio

# Manual cleanup test
curl -X POST http://localhost:3000/api/admin/cleanup \
  -H "Content-Type: application/json" \
  -d '{"daysOld": 30}'

# Check deleted records count
curl http://localhost:3000/api/admin/deleted-records
```

## Future Enhancements

### Planned Features
- **Audit Trail**: Track who performed soft delete/restore operations
- **Bulk Operations**: Soft delete/restore multiple records at once
- **Advanced Cleanup**: Configurable cleanup policies per record type
- **Data Archiving**: Move old soft-deleted records to archive tables

### Performance Optimizations
- **Partitioning**: Partition tables by `is_deleted` status
- **Indexing**: Optimize indexes for soft delete queries
- **Caching**: Cache soft delete status for frequently accessed records

## Conclusion

The soft delete system provides a robust foundation for data management while maintaining data integrity and recovery capabilities. The implementation follows best practices for database design and provides comprehensive admin tools for managing the system.

For questions or issues, refer to the troubleshooting section or contact the development team.
