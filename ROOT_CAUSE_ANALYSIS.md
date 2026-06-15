# Root Cause Analysis: Employee Edit Form Issues

## Issues Identified

1. **Education details not getting saved when updating user information**
2. **Experience documents getting saved twice**
3. **Education documents not getting saved at all**

---

## Issue 1: Education Details Not Getting Saved

### Root Cause

Primary observed behavior: existing education qualifications disappear after updating an employee.

There are two contributing causes:

1. Frontend filtering (see original notes) could omit new/incomplete education entries if they lacked minimal data.
2. More critically, the backend `employeeController.updateEmployee` previously forced `processedData.educations = []` whenever the client did not send an `educations` field. This made the service treat the request as an explicit complete replacement with an empty set, triggering deletion of all existing education records.

Deletion flow detail:

- Client performs a partial update (e.g., changing address) without sending `educations`.
- Controller injects empty array.
- Service sees an empty, provided array and enters the education processing branch.
- Existing records fetched; incoming list is empty; all existing educations flagged for deletion.

Result: User perceives “education details not saved” because records were unintentionally removed.

### Solution Implemented

1. Controller no longer injects an empty array when `educations` is absent; instead it sets a flag `_educationsProvided`.
2. Service processes education mutations only when `_educationsProvided` is true; otherwise it preserves existing data.
3. Frontend already keeps positive IDs; ensure any future filtering retains them.

---

## Issue 2: Experience Documents Getting Saved Twice

### Root Cause

The duplication occurs in the backend `employeeService.js` during document processing:

1. Documents are processed in `processUploadedFiles` which creates `documentRecords` array
2. These `documentRecords` are passed to `updateEmployee`
3. In `updateEmployee`, documents are created at lines 860-1057
4. **Problem**: The deletion logic at lines 991-1025 deletes existing documents with the same `associated_id` BEFORE creating new ones, which is correct. However:

   - If the same file is processed multiple times (e.g., form submission happens twice, or browser refresh)
   - Or if `documentRecords` contains duplicate entries
   - The deduplication logic at lines 874-968 uses a `Set` to track `(file_type, associated_id, file_path)` combinations
   - **But**: If the same document is uploaded twice in the same request, and the `file_path` is the same (which it will be for the same file), the deduplication should work
   - **However**: The issue might be that documents are being created in `processUploadedFiles` AND then again in the document creation section, OR the deletion isn't happening correctly

5. **Another possibility**: The deletion at lines 1012-1021 deletes documents with the same `associated_id`, but if a document is being updated (same associated_id, different file), it should delete the old one. But if the deletion happens AFTER the document is already created, or if there's a race condition, duplicates can occur.

6. **Most likely cause**: The deletion logic only deletes documents if `documentsToCreate` has entries. But if documents are being processed multiple times (e.g., if `processDocumentChanges` is called and then documents are created again), duplicates can occur.

### Solution

- Ensure documents are only created once per request
- Improve the deduplication logic to check for existing documents before creation
- Add a check to prevent creating documents that already exist with the same `file_path` and `associated_id`

---

## Issue 3: Education Documents Not Getting Saved

### Root Cause

The issue occurs in the ID mapping process for education documents:

1. When a new education is added in the form, it gets a temporary negative ID (e.g., `-1234567890`)
2. When an education document is uploaded, it's associated with this temporary ID
3. In the backend, when educations are processed:
   - New educations are created first (lines 719-780)
   - The temporary ID is mapped to the new database ID in `educationIdMapping` (line 764)
4. **Problem**: When documents are processed (lines 860-1057), the mapping logic tries to map temporary IDs:

   - At lines 900-941, it checks if `doc.associated_id < 0` (temporary ID)
   - It then tries to find the mapping in `educationIdMapping[doc.associated_id]`
   - **However**: If the mapping doesn't exist (e.g., because the education wasn't created, or the ID doesn't match), the document is skipped (returns `null` at line 939)
   - This causes education documents to not be saved

5. **Additional issue**: The mapping might fail if:

   - The education wasn't created (e.g., due to validation failure)
   - The temporary ID in the document doesn't match the temporary ID used when creating the education
   - The education was filtered out before creation (due to the filter issue in Issue 1)

6. **Another possibility**: For existing educations (positive IDs), documents should work fine. But for new educations, if the mapping fails, documents won't be saved.

### Solution

- Ensure education documents are only processed AFTER educations are created and mapped
- Add better error handling and logging for failed mappings
- Ensure temporary IDs are consistent between education creation and document processing
- Add a fallback to match documents to educations by other criteria if ID mapping fails

---

## Summary of Fixes Needed / Applied

1. Backend safeguard (APPLIED): Skip education processing when field not supplied.
2. Education filtering (FRONTEND): Keep existing (positive ID) entries; only drop truly empty new placeholders.
3. Document duplication: Maintain dedup + pre-delete sequence; consider future consolidation.
4. Education document mapping: Current mapping retained; future enhancement could add secondary matching fallback.
5. Documentation (APPLIED): Root cause and fix recorded for future audits.
