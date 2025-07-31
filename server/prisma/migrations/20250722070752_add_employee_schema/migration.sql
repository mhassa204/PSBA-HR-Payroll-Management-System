-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "father_or_husband_name" TEXT,
    "mother_name" TEXT,
    "cnic" TEXT,
    "cnic_issue_date" TIMESTAMP(3),
    "cnic_expiry_date" TIMESTAMP(3),
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
    "district" TEXT,
    "city" TEXT,
    "latest_qualification" TEXT,
    "past_experience" TEXT,
    "department_id" TEXT,
    "designation_id" TEXT,
    "joining_date_mwo" TIMESTAMP(3),
    "joining_date_pmbmc" TIMESTAMP(3),
    "joining_date_psba" TIMESTAMP(3),
    "termination_or_suspend_date" TIMESTAMP(3),
    "grade_scale" TEXT,
    "termination_reason" TEXT,
    "special_duty_note" TEXT,
    "document_missing_note" TEXT,
    "disability_status" BOOLEAN NOT NULL DEFAULT false,
    "disability_description" TEXT,
    "medical_fitness_status" BOOLEAN NOT NULL DEFAULT false,
    "medical_fitness_file" TEXT,
    "filer_status" TEXT DEFAULT 'Non-Filer',
    "filer_active_status" TEXT,
    "status" TEXT DEFAULT 'Active',
    "profile_picture_file" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Designation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Designation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Salary" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Salary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_cnic_key" ON "Employee"("cnic");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Salary" ADD CONSTRAINT "Salary_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
