-- CreateEnum
CREATE TYPE "DutyRosterStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LeaveApprovalType" AS ENUM ('RECOMMEND', 'ALLOW');

-- CreateEnum
CREATE TYPE "TravelClaimStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'VERIFIED', 'APPROVED', 'UNDER_PROCESS', 'PROCESSED', 'REJECTED', 'REJECTED_OPS', 'REJECTED_DG', 'REJECTED_HR', 'REJECTED_ACCOUNTS', 'PARTIALLY_SETTLED', 'SETTLED');

-- CreateEnum
CREATE TYPE "TravelRequestStatus" AS ENUM ('CREATED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TravelClaimDocCategory" AS ENUM ('FUEL', 'TOLL', 'PICTURE', 'REPORT', 'OTHER');

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "employee_id" TEXT,
    "full_name" TEXT NOT NULL,
    "father_husband_name" TEXT,
    "relationship_type" TEXT,
    "mother_name" TEXT,
    "cnic" TEXT,
    "cnic_issue_date" TIMESTAMP(3),
    "cnic_expire_date" TIMESTAMP(3),
    "date_of_birth" TIMESTAMP(3),
    "gender" TEXT,
    "marital_status" TEXT,
    "nationality" TEXT,
    "religion" TEXT,
    "blood_group" TEXT,
    "domicile_district" TEXT,
    "mobile_number" TEXT,
    "whatsapp_number" TEXT,
    "email" TEXT,
    "present_address" TEXT,
    "permanent_address" TEXT,
    "same_address" BOOLEAN NOT NULL DEFAULT false,
    "district" TEXT,
    "city" TEXT,
    "district_id" INTEGER,
    "city_id" INTEGER,
    "has_disability" BOOLEAN NOT NULL DEFAULT false,
    "disability_type" TEXT,
    "disability_description" TEXT,
    "profile_picture" TEXT,
    "missing_note" TEXT,
    "status" TEXT DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deviceUserId" TEXT,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "head_employee_id" INTEGER,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Designation" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "department_id" INTEGER,
    "level" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Designation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "District" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "district_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationLevel" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleTag" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RoleTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScaleGrade" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ScaleGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelRate" (
    "id" SERIAL NOT NULL,
    "scale_grade_id" INTEGER NOT NULL,
    "rate_per_km" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "per_diem_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TravelRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PastExperience" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "company_name" TEXT NOT NULL,
    "position" TEXT,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PastExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationQualification" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "education_level" TEXT NOT NULL,
    "education_level_id" INTEGER,
    "institution_name" TEXT NOT NULL,
    "year_of_completion" TEXT NOT NULL,
    "marks_gpa" TEXT,
    "start_date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EducationQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "document_name" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "associated_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employment" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "organization" TEXT NOT NULL,
    "department_id" INTEGER,
    "designation_id" INTEGER,
    "employment_type" TEXT NOT NULL DEFAULT 'Regular',
    "effective_from" TIMESTAMP(3),
    "effective_till" TIMESTAMP(3),
    "reporting_officer_id" TEXT,
    "office_location" TEXT,
    "remarks" TEXT,
    "employment_status" TEXT NOT NULL DEFAULT 'active',
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "filer_status" TEXT NOT NULL DEFAULT 'non_filer',
    "filer_active_status" TEXT,
    "is_on_probation" BOOLEAN NOT NULL DEFAULT false,
    "probation_end_date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "role_tag_id" INTEGER,
    "scale_grade_id" INTEGER,
    "location_id" INTEGER,

    CONSTRAINT "Employment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentSalary" (
    "id" SERIAL NOT NULL,
    "employment_id" INTEGER NOT NULL,
    "basic_salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gross_salary" DOUBLE PRECISION,
    "medical_allowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "house_rent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conveyance_allowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "other_allowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "daily_wage_rate" DOUBLE PRECISION,
    "bank_account_primary" TEXT,
    "bank_name_primary" TEXT,
    "bank_branch_code" TEXT,
    "payment_mode" TEXT NOT NULL DEFAULT 'Bank Transfer',
    "salary_effective_from" TIMESTAMP(3),
    "salary_effective_till" TIMESTAMP(3),
    "payroll_status" TEXT NOT NULL DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmploymentSalary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentContract" (
    "id" SERIAL NOT NULL,
    "employment_id" INTEGER NOT NULL,
    "contract_type" TEXT,
    "contract_number" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "renewal_count" INTEGER NOT NULL DEFAULT 0,
    "probation_start" TIMESTAMP(3),
    "probation_end" TIMESTAMP(3),
    "confirmation_status" TEXT,
    "confirmation_date" TIMESTAMP(3),
    "is_renewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmploymentContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentDocument" (
    "id" SERIAL NOT NULL,
    "employment_id" INTEGER NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "document_name" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "associated_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmploymentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "fields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role_id" INTEGER NOT NULL,
    "employee_id" INTEGER,
    "department_id" INTEGER,
    "location_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "sid" VARCHAR(255) NOT NULL,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    "constraints" JSONB,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'BAZAAR',
    "district_id" INTEGER,
    "city_id" INTEGER,
    "full_address" TEXT,
    "opening_time" TEXT,
    "closing_time" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "manager_user_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyRoster" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "bazaar_id" INTEGER,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_to" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "status" "DutyRosterStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "DutyRoster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyRosterEntry" (
    "id" SERIAL NOT NULL,
    "roster_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "day_schedules" JSONB NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DutyRosterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" SERIAL NOT NULL,
    "ip_address" TEXT NOT NULL,
    "port_number" INTEGER NOT NULL,
    "location_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "deviceUserId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "device_ip" TEXT NOT NULL,
    "device_port" INTEGER NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "device_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Leave" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "submission_time" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "custom_type" TEXT,
    "backup_employee_id" INTEGER,
    "backup_duty_from" TEXT,
    "backup_duty_to" TEXT,
    "duty_from" TEXT,
    "duty_to" TEXT,
    "documents" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Leave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveApprovalRoute" (
    "id" SERIAL NOT NULL,
    "leave_id" INTEGER NOT NULL,
    "type" "LeaveApprovalType" NOT NULL,
    "approver_user_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveApprovalRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBank" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LeaveBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBankDefault" (
    "id" SERIAL NOT NULL,
    "leave_bank_id" INTEGER NOT NULL,
    "leave_type_id" INTEGER NOT NULL,
    "days" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveBankDefault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBankAllocation" (
    "id" SERIAL NOT NULL,
    "leave_bank_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "leave_type_id" INTEGER NOT NULL,
    "days" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveBankAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelRequest" (
    "id" SERIAL NOT NULL,
    "applicant_id" INTEGER NOT NULL,
    "submission_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departure_date" TIMESTAMP(3) NOT NULL,
    "departure_time" TEXT,
    "expected_return_date" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "destination" TEXT,
    "total_days" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "status" "TravelRequestStatus" NOT NULL DEFAULT 'CREATED',

    CONSTRAINT "TravelRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelRequestEmployee" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelRequestEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelRequestStatusEntry" (
    "id" SERIAL NOT NULL,
    "request_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "remarks" TEXT,
    "actor_employee_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelRequestStatusEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelClaim" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "travel_request_id" INTEGER,
    "claim_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT DEFAULT 'PKR',
    "total_claimed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_approved" DOUBLE PRECISION DEFAULT 0,
    "notes" TEXT,
    "status" "TravelClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "from_date" TIMESTAMP(3),
    "to_date" TIMESTAMP(3),
    "overnight_stay" BOOLEAN NOT NULL DEFAULT false,
    "transport_mode" TEXT DEFAULT 'OWN',
    "fuel_total" DOUBLE PRECISION DEFAULT 0,
    "fare_total" DOUBLE PRECISION DEFAULT 0,
    "total_distance_km" DOUBLE PRECISION DEFAULT 0,
    "rate_per_km" DOUBLE PRECISION DEFAULT 0,
    "distance_amount" DOUBLE PRECISION DEFAULT 0,
    "toll_tax_total" DOUBLE PRECISION DEFAULT 0,
    "travel_total" DOUBLE PRECISION DEFAULT 0,
    "per_diem_days" INTEGER DEFAULT 0,
    "per_diem_rate" DOUBLE PRECISION DEFAULT 0,
    "per_diem_amount" DOUBLE PRECISION DEFAULT 0,
    "grand_total" DOUBLE PRECISION DEFAULT 0,
    "created_by_department_id" INTEGER,
    "created_by_location_id" INTEGER,

    CONSTRAINT "TravelClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelClaimStatusEntry" (
    "id" SERIAL NOT NULL,
    "claim_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "remarks" TEXT,
    "actor_employee_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelClaimStatusEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelClaimSegment" (
    "id" SERIAL NOT NULL,
    "claim_id" INTEGER NOT NULL,
    "departure_from" TEXT NOT NULL,
    "departure_to" TEXT NOT NULL,
    "depart_date" TIMESTAMP(3),
    "depart_time" TEXT,
    "arrive_date" TIMESTAMP(3),
    "arrive_time" TEXT,
    "mode" TEXT,
    "distance_km" DOUBLE PRECISION DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelClaimSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelClaimDocument" (
    "id" SERIAL NOT NULL,
    "claim_id" INTEGER NOT NULL,
    "category" "TravelClaimDocCategory" NOT NULL,
    "file_path" TEXT NOT NULL,
    "mime_type" TEXT,
    "file_size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelClaimDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelClaimTranche" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "title" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" INTEGER,

    CONSTRAINT "TravelClaimTranche_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelClaimTrancheItem" (
    "id" SERIAL NOT NULL,
    "tranche_id" INTEGER NOT NULL,
    "claim_id" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelClaimTrancheItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employee_id_key" ON "Employee"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cnic_key" ON "Employee"("cnic");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_deviceUserId_key" ON "Employee"("deviceUserId");

-- CreateIndex
CREATE INDEX "Department_head_employee_id_idx" ON "Department"("head_employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "Designation_title_department_id_key" ON "Designation"("title", "department_id");

-- CreateIndex
CREATE UNIQUE INDEX "District_name_key" ON "District"("name");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_district_id_key" ON "City"("name", "district_id");

-- CreateIndex
CREATE UNIQUE INDEX "EducationLevel_name_key" ON "EducationLevel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RoleTag_name_key" ON "RoleTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ScaleGrade_name_key" ON "ScaleGrade"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TravelRate_scale_grade_id_key" ON "TravelRate"("scale_grade_id");

-- CreateIndex
CREATE INDEX "EmployeeDocument_associated_id_idx" ON "EmployeeDocument"("associated_id");

-- CreateIndex
CREATE INDEX "Employment_location_id_idx" ON "Employment"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentSalary_employment_id_key" ON "EmploymentSalary"("employment_id");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentContract_employment_id_key" ON "EmploymentContract"("employment_id");

-- CreateIndex
CREATE INDEX "EmploymentDocument_associated_id_idx" ON "EmploymentDocument"("associated_id");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_employee_id_key" ON "User"("employee_id");

-- CreateIndex
CREATE INDEX "User_department_id_idx" ON "User"("department_id");

-- CreateIndex
CREATE INDEX "User_location_id_idx" ON "User"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_category_idx" ON "SystemSetting"("category");

-- CreateIndex
CREATE INDEX "Location_district_id_idx" ON "Location"("district_id");

-- CreateIndex
CREATE INDEX "Location_city_id_idx" ON "Location"("city_id");

-- CreateIndex
CREATE INDEX "DutyRoster_bazaar_id_idx" ON "DutyRoster"("bazaar_id");

-- CreateIndex
CREATE INDEX "DutyRoster_created_by_user_id_idx" ON "DutyRoster"("created_by_user_id");

-- CreateIndex
CREATE INDEX "DutyRosterEntry_roster_id_idx" ON "DutyRosterEntry"("roster_id");

-- CreateIndex
CREATE INDEX "DutyRosterEntry_employee_id_idx" ON "DutyRosterEntry"("employee_id");

-- CreateIndex
CREATE INDEX "Device_location_id_idx" ON "Device"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "Device_ip_address_port_number_key" ON "Device"("ip_address", "port_number");

-- CreateIndex
CREATE INDEX "Attendance_deviceUserId_idx" ON "Attendance"("deviceUserId");

-- CreateIndex
CREATE INDEX "Attendance_attendanceDate_idx" ON "Attendance"("attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_deviceUserId_device_ip_device_port_type_attendan_key" ON "Attendance"("deviceUserId", "device_ip", "device_port", "type", "attendanceDate");

-- CreateIndex
CREATE INDEX "Leave_employee_id_date_idx" ON "Leave"("employee_id", "date");

-- CreateIndex
CREATE INDEX "Leave_backup_employee_id_idx" ON "Leave"("backup_employee_id");

-- CreateIndex
CREATE INDEX "LeaveApprovalRoute_leave_id_idx" ON "LeaveApprovalRoute"("leave_id");

-- CreateIndex
CREATE INDEX "LeaveApprovalRoute_approver_user_id_idx" ON "LeaveApprovalRoute"("approver_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_name_key" ON "LeaveType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBankDefault_leave_bank_id_leave_type_id_key" ON "LeaveBankDefault"("leave_bank_id", "leave_type_id");

-- CreateIndex
CREATE INDEX "LeaveBankAllocation_employee_id_idx" ON "LeaveBankAllocation"("employee_id");

-- CreateIndex
CREATE INDEX "LeaveBankAllocation_leave_type_id_idx" ON "LeaveBankAllocation"("leave_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBankAllocation_leave_bank_id_employee_id_leave_type_id_key" ON "LeaveBankAllocation"("leave_bank_id", "employee_id", "leave_type_id");

-- CreateIndex
CREATE INDEX "TravelRequest_applicant_id_idx" ON "TravelRequest"("applicant_id");

-- CreateIndex
CREATE INDEX "TravelRequestEmployee_employee_id_idx" ON "TravelRequestEmployee"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "TravelRequestEmployee_request_id_employee_id_key" ON "TravelRequestEmployee"("request_id", "employee_id");

-- CreateIndex
CREATE INDEX "TravelRequestStatusEntry_request_id_idx" ON "TravelRequestStatusEntry"("request_id");

-- CreateIndex
CREATE INDEX "TravelRequestStatusEntry_actor_employee_id_idx" ON "TravelRequestStatusEntry"("actor_employee_id");

-- CreateIndex
CREATE INDEX "TravelClaim_created_by_department_id_idx" ON "TravelClaim"("created_by_department_id");

-- CreateIndex
CREATE INDEX "TravelClaim_created_by_location_id_idx" ON "TravelClaim"("created_by_location_id");

-- CreateIndex
CREATE UNIQUE INDEX "TravelClaim_travel_request_id_employee_id_key" ON "TravelClaim"("travel_request_id", "employee_id");

-- CreateIndex
CREATE INDEX "TravelClaimStatusEntry_claim_id_idx" ON "TravelClaimStatusEntry"("claim_id");

-- CreateIndex
CREATE INDEX "TravelClaimStatusEntry_actor_employee_id_idx" ON "TravelClaimStatusEntry"("actor_employee_id");

-- CreateIndex
CREATE INDEX "TravelClaimSegment_claim_id_idx" ON "TravelClaimSegment"("claim_id");

-- CreateIndex
CREATE INDEX "TravelClaimDocument_claim_id_idx" ON "TravelClaimDocument"("claim_id");

-- CreateIndex
CREATE INDEX "TravelClaimDocument_category_idx" ON "TravelClaimDocument"("category");

-- CreateIndex
CREATE UNIQUE INDEX "TravelClaimTranche_code_key" ON "TravelClaimTranche"("code");

-- CreateIndex
CREATE INDEX "TravelClaimTrancheItem_claim_id_idx" ON "TravelClaimTrancheItem"("claim_id");

-- CreateIndex
CREATE UNIQUE INDEX "TravelClaimTrancheItem_tranche_id_claim_id_key" ON "TravelClaimTrancheItem"("tranche_id", "claim_id");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_head_employee_id_fkey" FOREIGN KEY ("head_employee_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Designation" ADD CONSTRAINT "Designation_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRate" ADD CONSTRAINT "TravelRate_scale_grade_id_fkey" FOREIGN KEY ("scale_grade_id") REFERENCES "ScaleGrade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastExperience" ADD CONSTRAINT "PastExperience_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationQualification" ADD CONSTRAINT "EducationQualification_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationQualification" ADD CONSTRAINT "EducationQualification_education_level_id_fkey" FOREIGN KEY ("education_level_id") REFERENCES "EducationLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_role_tag_id_fkey" FOREIGN KEY ("role_tag_id") REFERENCES "RoleTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_scale_grade_id_fkey" FOREIGN KEY ("scale_grade_id") REFERENCES "ScaleGrade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentSalary" ADD CONSTRAINT "EmploymentSalary_employment_id_fkey" FOREIGN KEY ("employment_id") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_employment_id_fkey" FOREIGN KEY ("employment_id") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentDocument" ADD CONSTRAINT "EmploymentDocument_employment_id_fkey" FOREIGN KEY ("employment_id") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_manager_user_id_fkey" FOREIGN KEY ("manager_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyRoster" ADD CONSTRAINT "DutyRoster_bazaar_id_fkey" FOREIGN KEY ("bazaar_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyRoster" ADD CONSTRAINT "DutyRoster_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyRosterEntry" ADD CONSTRAINT "DutyRosterEntry_roster_id_fkey" FOREIGN KEY ("roster_id") REFERENCES "DutyRoster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyRosterEntry" ADD CONSTRAINT "DutyRosterEntry_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Leave" ADD CONSTRAINT "Leave_backup_employee_id_fkey" FOREIGN KEY ("backup_employee_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApprovalRoute" ADD CONSTRAINT "LeaveApprovalRoute_leave_id_fkey" FOREIGN KEY ("leave_id") REFERENCES "Leave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveApprovalRoute" ADD CONSTRAINT "LeaveApprovalRoute_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBank" ADD CONSTRAINT "LeaveBank_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBankDefault" ADD CONSTRAINT "LeaveBankDefault_leave_bank_id_fkey" FOREIGN KEY ("leave_bank_id") REFERENCES "LeaveBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBankDefault" ADD CONSTRAINT "LeaveBankDefault_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBankAllocation" ADD CONSTRAINT "LeaveBankAllocation_leave_bank_id_fkey" FOREIGN KEY ("leave_bank_id") REFERENCES "LeaveBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBankAllocation" ADD CONSTRAINT "LeaveBankAllocation_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBankAllocation" ADD CONSTRAINT "LeaveBankAllocation_leave_type_id_fkey" FOREIGN KEY ("leave_type_id") REFERENCES "LeaveType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequest" ADD CONSTRAINT "TravelRequest_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequestEmployee" ADD CONSTRAINT "TravelRequestEmployee_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "TravelRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequestEmployee" ADD CONSTRAINT "TravelRequestEmployee_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequestStatusEntry" ADD CONSTRAINT "TravelRequestStatusEntry_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "TravelRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelRequestStatusEntry" ADD CONSTRAINT "TravelRequestStatusEntry_actor_employee_id_fkey" FOREIGN KEY ("actor_employee_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelClaim" ADD CONSTRAINT "TravelClaim_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelClaim" ADD CONSTRAINT "TravelClaim_travel_request_id_fkey" FOREIGN KEY ("travel_request_id") REFERENCES "TravelRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelClaim" ADD CONSTRAINT "TravelClaim_created_by_department_id_fkey" FOREIGN KEY ("created_by_department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelClaimStatusEntry" ADD CONSTRAINT "TravelClaimStatusEntry_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "TravelClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelClaimStatusEntry" ADD CONSTRAINT "TravelClaimStatusEntry_actor_employee_id_fkey" FOREIGN KEY ("actor_employee_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelClaimSegment" ADD CONSTRAINT "TravelClaimSegment_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "TravelClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelClaimDocument" ADD CONSTRAINT "TravelClaimDocument_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "TravelClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelClaimTranche" ADD CONSTRAINT "TravelClaimTranche_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelClaimTrancheItem" ADD CONSTRAINT "TravelClaimTrancheItem_tranche_id_fkey" FOREIGN KEY ("tranche_id") REFERENCES "TravelClaimTranche"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelClaimTrancheItem" ADD CONSTRAINT "TravelClaimTrancheItem_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "TravelClaim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
