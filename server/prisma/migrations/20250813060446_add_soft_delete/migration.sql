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
    "has_disability" BOOLEAN NOT NULL DEFAULT false,
    "disability_type" TEXT,
    "disability_description" TEXT,
    "profile_picture" TEXT,
    "missing_note" TEXT,
    "password" TEXT,
    "status" TEXT DEFAULT 'Active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

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
    "institution_name" TEXT NOT NULL,
    "year_of_completion" TEXT NOT NULL,
    "marks_gpa" TEXT,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "role_tag" TEXT,
    "reporting_officer_id" TEXT,
    "office_location" TEXT,
    "remarks" TEXT,
    "scale_grade" TEXT,
    "employment_status" TEXT NOT NULL DEFAULT 'active',
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "filer_status" TEXT NOT NULL DEFAULT 'non_filer',
    "filer_active_status" TEXT,
    "is_on_probation" BOOLEAN NOT NULL DEFAULT false,
    "probation_end_date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

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
CREATE TABLE "EmploymentLocation" (
    "id" SERIAL NOT NULL,
    "employment_id" INTEGER NOT NULL,
    "district" TEXT,
    "city" TEXT,
    "bazaar_name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'HEAD_OFFICE',
    "full_address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmploymentLocation_pkey" PRIMARY KEY ("id")
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EmploymentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employee_id_key" ON "Employee"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cnic_key" ON "Employee"("cnic");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Designation_title_department_id_key" ON "Designation"("title", "department_id");

-- CreateIndex
CREATE INDEX "EmployeeDocument_associated_id_idx" ON "EmployeeDocument"("associated_id");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentSalary_employment_id_key" ON "EmploymentSalary"("employment_id");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentLocation_employment_id_key" ON "EmploymentLocation"("employment_id");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentContract_employment_id_key" ON "EmploymentContract"("employment_id");

-- CreateIndex
CREATE INDEX "EmploymentDocument_associated_id_idx" ON "EmploymentDocument"("associated_id");

-- AddForeignKey
ALTER TABLE "Designation" ADD CONSTRAINT "Designation_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastExperience" ADD CONSTRAINT "PastExperience_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationQualification" ADD CONSTRAINT "EducationQualification_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentSalary" ADD CONSTRAINT "EmploymentSalary_employment_id_fkey" FOREIGN KEY ("employment_id") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentLocation" ADD CONSTRAINT "EmploymentLocation_employment_id_fkey" FOREIGN KEY ("employment_id") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentContract" ADD CONSTRAINT "EmploymentContract_employment_id_fkey" FOREIGN KEY ("employment_id") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentDocument" ADD CONSTRAINT "EmploymentDocument_employment_id_fkey" FOREIGN KEY ("employment_id") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
