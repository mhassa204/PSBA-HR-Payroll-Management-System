/*
  Warnings:

  - You are about to drop the column `disability_status` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `document_missing_note` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `filer_active_status` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `filer_status` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `grade_scale` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `has_past_experience` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `joining_date_mwo` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `joining_date_pmbmc` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `joining_date_psba` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `latest_qualification` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `medical_fitness_file` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `medical_fitness_status` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `mission_note` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `past_experiences` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `profile_picture_file` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `special_duty_note` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `termination_or_suspend_date` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `termination_reason` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `employment_status` on the `Employment` table. All the data in the column will be lost.
  - You are about to drop the column `end_date` on the `Employment` table. All the data in the column will be lost.
  - You are about to drop the column `is_current` on the `Employment` table. All the data in the column will be lost.
  - You are about to drop the column `salary` on the `Employment` table. All the data in the column will be lost.
  - You are about to drop the column `scale_grade` on the `Employment` table. All the data in the column will be lost.
  - You are about to drop the column `start_date` on the `Employment` table. All the data in the column will be lost.
  - You are about to drop the `Document` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Salary` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `employment_type` on table `Employment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Salary" DROP CONSTRAINT "Salary_employeeId_fkey";

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "disability_status",
DROP COLUMN "document_missing_note",
DROP COLUMN "filer_active_status",
DROP COLUMN "filer_status",
DROP COLUMN "grade_scale",
DROP COLUMN "has_past_experience",
DROP COLUMN "joining_date_mwo",
DROP COLUMN "joining_date_pmbmc",
DROP COLUMN "joining_date_psba",
DROP COLUMN "latest_qualification",
DROP COLUMN "medical_fitness_file",
DROP COLUMN "medical_fitness_status",
DROP COLUMN "mission_note",
DROP COLUMN "past_experiences",
DROP COLUMN "profile_picture_file",
DROP COLUMN "special_duty_note",
DROP COLUMN "termination_or_suspend_date",
DROP COLUMN "termination_reason",
ADD COLUMN     "disability_type" TEXT,
ADD COLUMN     "has_disability" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "same_address" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Employment" DROP COLUMN "employment_status",
DROP COLUMN "end_date",
DROP COLUMN "is_current",
DROP COLUMN "salary",
DROP COLUMN "scale_grade",
DROP COLUMN "start_date",
ADD COLUMN     "effective_from" TIMESTAMP(3),
ADD COLUMN     "effective_till" TIMESTAMP(3),
ADD COLUMN     "is_on_probation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "probation_end_date" TIMESTAMP(3),
ADD COLUMN     "reporting_officer_id" TEXT,
ADD COLUMN     "role_tag" TEXT,
ALTER COLUMN "employment_type" SET NOT NULL,
ALTER COLUMN "employment_type" SET DEFAULT 'Regular';

-- DropTable
DROP TABLE "Document";

-- DropTable
DROP TABLE "Salary";

-- CreateTable
CREATE TABLE "PastExperience" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "company_name" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmploymentSalary" (
    "id" SERIAL NOT NULL,
    "employment_id" INTEGER NOT NULL,
    "basic_salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
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

    CONSTRAINT "EmploymentLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentSalary_employment_id_key" ON "EmploymentSalary"("employment_id");

-- CreateIndex
CREATE UNIQUE INDEX "EmploymentLocation_employment_id_key" ON "EmploymentLocation"("employment_id");

-- AddForeignKey
ALTER TABLE "PastExperience" ADD CONSTRAINT "PastExperience_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationQualification" ADD CONSTRAINT "EducationQualification_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentSalary" ADD CONSTRAINT "EmploymentSalary_employment_id_fkey" FOREIGN KEY ("employment_id") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmploymentLocation" ADD CONSTRAINT "EmploymentLocation_employment_id_fkey" FOREIGN KEY ("employment_id") REFERENCES "Employment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
