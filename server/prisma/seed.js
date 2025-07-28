const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const departments = [
    { id: "dept1", name: "Human Resources" },
    { id: "dept2", name: "Engineering" },
    { id: "dept3", name: "Marketing" },
    { id: "dept4", name: "Finance" },
  ];

  const designations = [
    { id: "desg1", name: "Software Engineer" },
    { id: "desg2", name: "HR Manager" },
    { id: "desg3", name: "Marketing Coordinator" },
    { id: "desg4", name: "Financial Analyst" },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { id: dept.id },
      update: {},
      create: dept,
    });
  }

  for (const desg of designations) {
    await prisma.designation.upsert({
      where: { id: desg.id },
      update: {},
      create: desg,
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
