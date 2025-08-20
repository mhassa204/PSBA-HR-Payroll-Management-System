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

-- CreateIndex
CREATE UNIQUE INDEX "RoleTag_name_key" ON "RoleTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ScaleGrade_name_key" ON "ScaleGrade"("name");

-- Add new columns to Employment table
ALTER TABLE "Employment" ADD COLUMN "role_tag_id" INTEGER;
ALTER TABLE "Employment" ADD COLUMN "scale_grade_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_role_tag_id_fkey" FOREIGN KEY ("role_tag_id") REFERENCES "RoleTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_scale_grade_id_fkey" FOREIGN KEY ("scale_grade_id") REFERENCES "ScaleGrade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
