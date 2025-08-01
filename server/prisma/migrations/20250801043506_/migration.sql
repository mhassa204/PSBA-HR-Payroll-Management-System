/*
  Warnings:

  - The primary key for the `Department` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Department` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `Designation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `name` on the `Designation` table. All the data in the column will be lost.
  - The `id` column on the `Designation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `cnic_expiry_date` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `department_id` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `designation_id` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `father_or_husband_name` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `past_experience` on the `Employee` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[title,department_id]` on the table `Designation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employee_id]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `title` to the `Designation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_department_id_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_designation_id_fkey";

-- AlterTable
ALTER TABLE "Department" DROP CONSTRAINT "Department_pkey",
ADD COLUMN     "code" TEXT,
ADD COLUMN     "description" TEXT,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Department_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Designation" DROP CONSTRAINT "Designation_pkey",
DROP COLUMN "name",
ADD COLUMN     "department_id" INTEGER,
ADD COLUMN     "level" INTEGER,
ADD COLUMN     "title" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Designation_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "document_name" TEXT,
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "mime_type" TEXT;

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "cnic_expiry_date",
DROP COLUMN "department_id",
DROP COLUMN "designation_id",
DROP COLUMN "father_or_husband_name",
DROP COLUMN "past_experience",
ADD COLUMN     "cnic_expire_date" TIMESTAMP(3),
ADD COLUMN     "employee_id" TEXT,
ADD COLUMN     "father_husband_name" TEXT,
ADD COLUMN     "has_past_experience" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mission_note" TEXT,
ADD COLUMN     "past_experiences" JSONB,
ADD COLUMN     "relationship_type" TEXT;

-- CreateTable
CREATE TABLE "Employment" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "organization" TEXT NOT NULL,
    "department_id" INTEGER,
    "designation_id" INTEGER,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "salary" DOUBLE PRECISION,
    "employment_type" TEXT,
    "office_location" TEXT,
    "scale_grade" TEXT,
    "employment_status" TEXT DEFAULT 'active',
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Designation_title_department_id_key" ON "Designation"("title", "department_id");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employee_id_key" ON "Employee"("employee_id");

-- AddForeignKey
ALTER TABLE "Designation" ADD CONSTRAINT "Designation_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
