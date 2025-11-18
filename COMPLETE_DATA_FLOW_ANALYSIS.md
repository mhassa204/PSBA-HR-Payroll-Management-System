# Complete Data Flow Analysis

## Flow from Frontend to Backend

### 1. Frontend: EditUserForm.jsx
- User clicks "Update User Information"
- `handleUpdate` is called with form data
- Creates `completeData` object with:
  - `educations`: Array of education objects
  - `past_experiences`: Array of experience objects
  - `...filesData`: Files from DocumentManager
  - `documents_to_remove`: Array of document IDs to remove
- Calls `updateEmployee(user.id, completeData)`

### 2. Frontend: employeeStore.updateEmployee
- Calls `employeeService.updateEmployee(id, updateData)`

### 3. Frontend: employeeService.updateEmployee
- Calls `createFormData(employeeData)`
- Converts `educations` array to JSON string: `formData.append('educations', JSON.stringify(value))`
- Sends FormData via PUT request to `/employees/:id`

### 4. Backend: employeeController.updateEmployee
- Receives `req.body` (FormData parsed by multer)
- `req.body.educations` is a JSON string
- Parses it: `processedData.educations = JSON.parse(processedData.educations)`
- Calls `processUploadedFiles(req.files, req)` which creates `documentRecords`
- Calls `employeeService.updateEmployee(id, processedData, processedFiles, documentRecords)`

### 5. Backend: employeeService.updateEmployee
- Order of operations:
  1. Update employee record
  2. Process past experiences (create/update/delete)
  3. Process educations (create/update/delete) - creates `educationIdMapping`
  4. Call `processDocumentChanges` - only handles deletions
  5. Create new documents - uses `educationIdMapping` to map temporary IDs

## Issues Found

### Issue 1: Education Details Not Saving
**Root Cause**: The educations array might be getting lost or not properly included in the update. Need to verify:
- Are educations being sent in FormData?
- Are they being parsed correctly?
- Are they being processed in the service?

### Issue 2: Experience Documents Duplicating
**Root Cause**: When updating an existing document (same associated_id, different file), the old document should be deleted first. The deletion happens at lines 1039-1079, but it might not be working correctly if:
- The deletion check happens after documents are already created
- Or the deletion isn't finding the right documents to delete

### Issue 3: Education Documents Not Saving
**Root Cause**: The ID mapping might not be working because:
- Temporary IDs in documents don't match temporary IDs in educations
- Or the mapping isn't being created properly
- Or documents are being processed before educations are created (but this shouldn't happen based on the order)

