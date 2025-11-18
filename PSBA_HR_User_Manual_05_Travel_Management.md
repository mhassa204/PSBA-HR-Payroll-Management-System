# PSBA HR Management System - User Manual

## Part 5: Travel Management

---

## Overview

The Travel Management module handles travel requests and expense claims (TADA - Travel Allowance and Daily Allowance) for official travels. This module supports both travel requests and expense claim submissions with multi-stage approval workflows.

**Key Features:**

- Submit travel requests
- Submit travel expense claims
- Approve travel requests
- Approve expense claims
- Manage travel rates
- Track travel history

**Who Can Use This Module:**

- All employees (to submit requests and claims)
- Approvers (Operations, DG, HR, Accounts)
- Accounts staff (for financial processing)

---

## Understanding Travel Management

### Travel Request

A travel request is submitted before or after travel to:

- Inform about official travel plans
- Get approval for travel
- Document travel purpose and destination

### Travel Expense Claim

A travel expense claim is submitted after travel to:

- Claim reimbursement for expenses theoretically incurred
- Document actual expenses
- Get payment approval

**Note:** The system uses TADA (Travel Allowance and Daily Allowance) which is computed based on rates and distances, not actual expense receipts.

### Approval Stages

Travel claims go through multiple approval stages:

1. **Submitted:** Initial submission
2. **Recommended:** Recommender approval
3. **Approved:** Operations or DG approval
4. **Verified:** Establishment verification
5. **Under Process:** Accounts processing
6. **Processed/Settled:** Final financial processing

---

## Submitting a Travel Request

### Accessing Travel Request

1. From the main menu, click **"Travel"**
2. Click **"Requests"** or navigate to **Travel > Requests**
3. Click **"New Request"** or **"Add Request"** button

### Filling Out Travel Request Form

#### Step 1: Basic Information

1. **Departure Date**

   - Select date from calendar
   - Date when you plan to leave

2. **Departure Time** (Optional)

   - Enter time in HH:mm format
   - Example: 09:00

3. **Expected Return Date**

   - Select date from calendar
   - Date when you plan to return

4. **Destination**

   - Enter destination city or location
   - Be specific

5. **Purpose**

   - Describe the purpose of travel
   - Be clear and detailed
   - Example: "Official meeting with stakeholders in Lahore"

6. **Total Days**
   - System may calculate automatically
   - Or enter manually

#### Step 2: Attendees (Optional)

Add other employees traveling with you frame by frame:

1. Click **"Add Attendee"**
2. Search for employee
3. Select from list
4. Repeat for other attendees

#### Step 3: Submit Request

1. Review all information
2. Click **"Submit"** or **"Save"**
3. Request will be created with status "CREATED"
4. Await approval

---

## Viewing Your Travel Requests

### Accessing My Requests

1. Go to Travel > Requests
2. View all your travel requests

### Request Status

- **CREATED:** Just submitted
- **APPROVED:** Approved for travel
- **REJECTED:** Not approved
- **CANCELLED:** Cancelled by you

### Request Details

Click on a request to see:

- Request information
- Status history
- Approval comments
- Attendees

---

## Submitting a Travel Expense Claim

### Accessing Expense Claim

1. Go to Travel > Expense Claims
2. Click **"New Claim"** or **"Add Claim"** button

### Creating Expense Claim

#### Step 1: Basic Information

1. **Claim Date**

   - Enter date of claim submission
   - Usually today's date

2. **From Date**

   - Date travel started
   - Select from calendar

3. **To Date**

   - Date travel ended
   - Select from calendar

4. **Overnight Stay**

   - Check box if you stayed overnight
   - Uncheck if same day travel

5. **Notes**
   - Any additional information
   - Special circumstances

#### Step 2: Link to Travel Request (Optional)

If you submitted a travel request:

1. Select corresponding request
2. System may auto-link
3. Claim will be associated with request

#### Step 3: Travel Segments

Add travel segments (trips):

1. Click **"Add Segment"**
2. Enter segment details:

   - **Departure From:** Starting location
   - **Departure To:** Ending location
   - **Departure Date/Time:** When you left
   - **Arrival Date/Time:** When you arrived
   - **Mode:** Transportation mode (Own Vehicle, Other, etc.)
   - **Distance (km):** Distance traveled

3. Click **"Save Segment"**
4. Add more segments as needed

#### Step 4: Document Upload

Upload supporting documents:

- **Fuel Receipts** (if applicable)
- **Toll Receipts**
- **Photos** from travel
- **Travel Report**
- **Other Documents**

1. Click **"Upload Document"**
2. Select category
3. Choose file
4. Upload

#### Step 5: Submit Claim

1. Review complete claim
2. Check all calculations
3. Verify documents are uploaded
4. Click **"Submit"**
5. Claim status becomes "SUBMITTED"

---

## Understanding Expense Claim Calculations

### TADA System

The system calculates TADA (Travel Allowance and Daily Allowance) based on:

1. **Travel Allowance:**

   - Calculated from distance and rate per km
   - Based on your scale grade
   - Rate per km varies by grade

2. **Per Diem:**

   - Daily allowance rate
   - Based on your scale grade
   - Applied only for overnight stay
   - Calculation: Days × Per Diem Rate

3. **Toll Tax:**
   - Toll receipts if any
   - Added to travel allowance

### Transport Mode Selection

#### Own Vehicle

- Select if using personal vehicle
- System calculates distance allowance
- Rate per km applied
- Toll tax can be added

#### Other Transport

- Select if using other transport (bus, train, etc.)
- System calculates fare amount
- Add actual fare paid
- No per km calculation

### Grade-Based Rates

Rates are predefined by scale grade:

- **BPS-17:** Base rates
- **BPS-18:** Higher rates
- **BPS-19:** Higher rates
- **BPS-20:** Highest rates

These rates are configured by the Accounts department.

---

## Approving Travel Requests

### Accessing Approval Queue

1. Go to Travel > Approvals or Travel > Manage
2. View list of pending requests

### Types of Approvals

#### Operations Approval

- **Who:** Operations department staff
- **Role:** First-level approval
- **Applies to:** Bazaar-originated requests

#### Director General (DG) Approval

- **Who:** Director General
- **Role:** Senior-level approval
- **Applies to:** Department-originated or HQ requests

### Reviewing a Request

1. Click on travel request
2. Review all details:
   - Travel dates
   - Destination and purpose
   - Attendees
   - Employee information

### Making Decision

#### To Approve

1. Click **"Approve"**
2. Add comments if needed
3. Submit approval

#### To Reject

1. Click **"Reject"**
2. Enter rejection reason (required)
3. Submit rejection

### Recommending Requests

Some approvers can **Recommend** requests:

1. Click **"Recommend"** button
2. Add comments
3. Submit recommendation
4. Request moves to next approver

---

## Approving Expense Claims

### Accessing Claim Approvals

1. Go to Travel > Expense Claim Approvals
2. View list of pending claims

### Reviewing a Claim

1. Click on expense claim
2. Review complete details:
   - Travel dates
   - Segments and distance
   - Calculated amounts
   - Uploaded documents
   - Current status

### Approval Stages for Claims

#### Recommender Stage

- First approver in chain
- Can recommend the claim
- Checks basic validity

#### Operations (OPS) Approval

- Approves claims from bazaar locations
- Verifies calculations
- Checks documentation

#### Director General (DG) Approval

- Required for department/HQ-originated claims
- Final authority on high-value claims

#### Establishment Verification

- HR/Establishment department
- Verifies employee details
- Checks compliance with policies

#### Accounts Processing

- Accounts department
- Starts financial processing
- Creates tranches for payment

### Making Decision

#### To Approve/Verify/Process

1. Review all information
2. Verify calculations
3. Check documents
4. Click appropriate action button
5. Add remarks if needed
6. Submit

#### To Reject

1. Click **"Reject"** button
2. Enter rejection reason (required)
3. Specify which stage rejection
4. Submit rejection

---

## Managing Your Approvals

### My Approval Queue

View all items pending your approval:

1. Go to Travel > Approvals
2. Filter by type (Requests or Claims)
3. View pending items

### Filtering Approvals

- **By Status:** Pending, Recommended, etc.
- **By Type:** Requests or Claims
- **By Date:** Date range filter
- **By Employee:** Specific employee

---

## Accounts Department - Tranches

**Note:** Only Accounts staff can access this section.

### What are Tranches?

Tranches are batches of verified claims grouped together for processing and payment.

### Accessing Tranches

1. Go to Accounts > Tranches
2. View all tranches

### Creating a Tranche

1. Click **"Create Tranche"**
2. Enter information:
   - **Code:** Unique tranche code
   - **Title:** Description
   - **Notes:** Additional information
3. Click **"Save"**

### Adding Claims to Tranche

1. Open tranche
2. Click **"Add Claim"**
3. Select verified claims
4. Add to tranche
5. Save

---

## Travel Rate Management

**Note:** Only authorized staff can manage rates.

### Accessing Travel Rates

1. Go to Settings > Travel Rates
2. View rates by scale grade

### Understanding Rates

Display shows:

- **Scale Grade:** Employee pay scale
- **Rate Per KM:** Travel allowance rate
- **Per Diem Rate:** Daily allowance rate
- **Status:** Active or Inactive

### Updating Rates

1. Find the scale grade
2. Click **"Edit"**
3. Update rates
4. Save changes

---

## Common Tasks

### Task: Submit Travel Request

1. Go to Travel > Requests
2. Click "New Request"
3. Fill in all details
4. Submit

### Task: Submit Expense Claim After Travel

1. Go to Travel > Expense Claims
2. Click "New Claim"
3. Enter dates and segments
4. Upload documents
5. Submit

### Task: Check Claim Status

1. Go to Travel > Expense Claims
2. Find your claim
3. View current status
4. Check approval history

### Task: View Approval History

1. Open travel request or claim
2. View status history tab
3. See all approval stages
4. Read approver comments

### Task: Approve Multiple Items

1. Go to Approvals section
2. Use filters
3. Review each item
4. Approve or reject

---

## Important Policies

### Travel Policy

- Follow organizational travel policy
- Obtain prior approval when required
- Submit claims within specified time
- Keep all receipts
- Accurate distance reporting

### Documentation

- Provide all required documents
- Clear and readable receipts
- Valid dates on receipts
- Proper document categorization

### Approval Authority

- Respect approval hierarchy
- Follow proper channels
- Don't bypass stages
- Provide clear reasons

### Rates and Payments

- Rates are fixed by grade
- Payments processed by Accounts
- Payment via bank transfer
- Subject to budget availability

---

## Troubleshooting

### Cannot Submit Request

- Check all required fields
- Verify dates are valid
- Ensure no conflicting requests
- Contact administrator

### Claim Calculations Wrong

- Verify scale grade is correct
- Check travel rates
- Review distance entries
- Contact Accounts for rate updates

### Cannot Approve Claim

- Check your approval permissions
- Verify claim is in correct stage
- Ensure you are authorized approver
- Contact system administrator

### Document Upload Fails

- Check file size
- Verify file format
- Ensure stable connection
- Try smaller file size

---

## Best Practices

### For Employees

1. **Request in Advance:** Submit requests before travel
2. **Accurate Details:** Provide correct dates and distances
3. **Complete Documentation:** Upload all required documents
4. **Follow Timeline:** Submit claims promptly
5. **Clear Communication:** Add notes for special cases

### For Approvers

1. **Timely Action:** Approve/reject promptly
2. **Careful Review:** Check calculations and documents
3. **Policy Compliance:** Ensure adherence to policies
4. **Clear Feedback:** Provide constructive comments
5. **Documentation:** Keep records of approvals

### For Accounts

1. **Regular Processing:** Process claims regularly
2. **Accuracy:** Verify all calculations
3. **Tranche Management:** Organize claims efficiently
4. **Communication:** Keep employees informed
5. **Rate Maintenance:** Keep rates updated

---

## Next Steps

Now that you understand travel management, you may want to learn about:

- **Part 6:** Duty Roster Management
- **Part 7:** Settings and Configuration
- **Part 8:** User Roles and Permissions Reference

---

_End of Part 5: Travel Management_
