/**
 * PRODUCTION seeder — idempotent, NON-destructive (no wipe). Safe to run on a
 * live production database and safe to re-run. Upserts master data + all employees
 * (keyed by CNIC) from the Excel-derived employees.normalized.json.
 *
 * Workflow to push the Excel data to production:
 *   1. (local) python server/prisma/import/transform_excel.py   # Excel -> JSON
 *   2. commit server/prisma/import/employees.normalized.json
 *   3. (prod)  npx prisma migrate deploy        # or: npx prisma db push
 *   4. (prod)  node prisma/seedProduction.js     # this script (idempotent)
 *
 * Unlike prisma/seed.js (which WIPES and rebuilds for local dev), this only
 * creates/updates rows — existing data is preserved.
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const PUNJAB_GEO = require("./import/punjabGeo");
const { geoForLocation } = require("./import/locationGeo");
const DESIG_DEPT = require("./import/designationDept.json");

const prisma = new PrismaClient();
const JSON_PATH = path.join(__dirname, "import", "employees.normalized.json");
const toDate = (v) => (v ? new Date(v) : null);
const orNull = (v) => (v === undefined || v === "" ? null : v);
/** Unique nullable fields: never persist empty/whitespace strings (PostgreSQL @unique treats "" as a value). */
const uniqueOrNull = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

async function ensureDistrict(name) {
  return prisma.district.upsert({
    where: { name },
    update: {},
    create: { name, is_active: true, is_deleted: false },
  });
}
async function ensureCity(name, district_id) {
  const found = await prisma.city.findFirst({ where: { name, district_id } });
  if (found) return found;
  return prisma.city.create({
    data: { name, district_id, is_active: true, is_deleted: false },
  });
}
async function ensureDepartment(name) {
  const found = await prisma.department.findFirst({ where: { name, is_deleted: false } });
  if (found) return found;
  return prisma.department.create({ data: { name, is_deleted: false } });
}
async function ensureDesignation(title, department_id = null) {
  const found = await prisma.designation.findFirst({
    where: { title, is_deleted: false },
  });
  if (found) {
    if (department_id && found.department_id !== department_id) {
      return prisma.designation.update({ where: { id: found.id }, data: { department_id } });
    }
    return found;
  }
  return prisma.designation.create({ data: { title, department_id, is_deleted: false } });
}
async function ensureScaleGrade(name) {
  const level = parseInt(String(name).split("-")[1], 10) || null;
  return prisma.scaleGrade.upsert({
    where: { name },
    update: {},
    create: { name, level, category: "BS", is_active: true, is_deleted: false },
  });
}
async function ensureEducationLevel(name, order) {
  return prisma.educationLevel.upsert({
    where: { name },
    update: {},
    create: { name, order, is_active: true, is_deleted: false },
  });
}
async function ensureRoleTag(name) {
  return prisma.roleTag.upsert({
    where: { name },
    update: {},
    create: { name, description: name, category: "Operations", is_active: true, is_deleted: false },
  });
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`Missing ${JSON_PATH}. Run transform_excel.py first.`);
  }
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  const md = data.master_data;
  console.log(`🚀 Production seed (idempotent): ${data.employees.length} employees`);

  // Normalize legacy empty strings on unique nullable columns (allows multiple NULLs)
  const fixedEmails = await prisma.employee.updateMany({
    where: { email: "" },
    data: { email: null },
  });
  if (fixedEmails.count) {
    console.log(`🔧 Normalized ${fixedEmails.count} empty employee email(s) to NULL`);
  }
  const fixedDeviceIds = await prisma.employee.updateMany({
    where: { deviceUserId: "" },
    data: { deviceUserId: null },
  });
  if (fixedDeviceIds.count) {
    console.log(`🔧 Normalized ${fixedDeviceIds.count} empty deviceUserId(s) to NULL`);
  }

  // --- Districts + Cities (full Punjab) ---
  const districtByName = {};
  for (const name of new Set([...Object.keys(PUNJAB_GEO), ...md.locations.map((l) => l.district).filter(Boolean)])) {
    districtByName[name] = (await ensureDistrict(name)).id;
  }
  for (const [district, cities] of Object.entries(PUNJAB_GEO)) {
    const did = districtByName[district];
    for (const city of [...new Set(cities)]) await ensureCity(city, did);
  }

  // --- Education levels / Departments / Scale grades / Designations / Role tags ---
  const levelByName = {};
  let order = 1;
  for (const name of md.education_levels) levelByName[name] = (await ensureEducationLevel(name, order++)).id;
  const deptByName = {};
  for (const name of md.departments) deptByName[name] = (await ensureDepartment(name)).id;
  const gradeByName = {};
  for (const name of md.scale_grades) gradeByName[name] = (await ensureScaleGrade(name)).id;
  const desigByTitle = {};
  for (const d of md.designations) {
    const deptName = DESIG_DEPT[d.title];
    const department_id = deptName ? deptByName[deptName] || null : null;
    desigByTitle[d.title] = (await ensureDesignation(d.title, department_id)).id;
  }
  const roleTagByName = {};
  for (const name of md.role_tags_new || []) roleTagByName[name] = (await ensureRoleTag(name)).id;

  // --- Locations (with geo) ---
  const locByName = {};
  for (const loc of md.locations) {
    const geo = geoForLocation(loc.name);
    let district_id = loc.district ? districtByName[loc.district] || null : null;
    let city_id = null;
    if (geo) {
      district_id = districtByName[geo.district] || district_id;
      if (district_id) city_id = (await ensureCity(geo.city, district_id)).id;
    }
    const existing = await prisma.location.findFirst({ where: { name: loc.name } });
    if (existing) {
      await prisma.location.update({ where: { id: existing.id }, data: { type: loc.type, district_id, city_id } });
      locByName[loc.name] = existing.id;
    } else {
      const created = await prisma.location.create({
        data: { name: loc.name, type: loc.type, district_id, city_id, is_active: true, is_deleted: false },
      });
      locByName[loc.name] = created.id;
    }
  }
  console.log(`✅ Master data ready (${Object.keys(districtByName).length} districts, ${md.locations.length} locations)`);

  // --- Employees (upsert by CNIC) + employment + salary + education ---
  let created = 0, updated = 0;
  for (const emp of data.employees) {
    const em = emp.employment;
    const empData = {
      full_name: emp.full_name,
      father_husband_name: orNull(emp.father_husband_name),
      relationship_type: orNull(emp.relationship_type),
      mother_name: orNull(emp.mother_name),
      deviceUserId: uniqueOrNull(emp.device_user_id),
      cnic_issue_date: toDate(emp.cnic_issue_date),
      cnic_expire_date: toDate(emp.cnic_expire_date),
      cnic_lifetime: !!emp.cnic_lifetime,
      date_of_birth: toDate(emp.date_of_birth),
      gender: orNull(emp.gender),
      marital_status: orNull(emp.marital_status),
      nationality: orNull(emp.nationality),
      religion: orNull(emp.religion),
      blood_group: orNull(emp.blood_group),
      domicile_district: orNull(emp.domicile_district),
      mobile_number: orNull(emp.mobile_number),
      whatsapp_number: orNull(emp.whatsapp_number),
      email: uniqueOrNull(emp.email),
      present_address: orNull(emp.present_address),
      permanent_address: orNull(emp.permanent_address),
      same_address: !!emp.same_address,
      has_disability: !!emp.has_disability,
      missing_note: orNull(emp.missing_note),
      status: emp.status || "Active",
    };
    const existed = await prisma.employee.findUnique({ where: { cnic: emp.cnic }, select: { id: true } });
    const employee = await prisma.employee.upsert({
      where: { cnic: emp.cnic },
      update: empData,
      create: { cnic: emp.cnic, ...empData, is_deleted: false },
    });
    existed ? updated++ : created++;

    // Employment: one current record per employee
    const emPayload = {
      organization: em.organization || "PSBA",
      department_id: em.department ? deptByName[em.department] || null : null,
      designation_id: em.designation ? desigByTitle[em.designation] || null : null,
      role_tag_id: em.role_tag ? roleTagByName[em.role_tag] || null : null,
      scale_grade_id: em.scale_grade ? gradeByName[em.scale_grade] || null : null,
      employment_type: em.employment_type || "Regular",
      joining_date: toDate(em.joining_date),
      effective_from: toDate(em.effective_from),
      office_location: orNull(em.location_name),
      location_id: em.location_name ? locByName[em.location_name] || null : null,
      remarks: orNull(em.additional_charge),
      employment_status: "active",
      is_current: true,
    };
    const curEmp = await prisma.employment.findFirst({ where: { employee_id: employee.id, is_current: true } });
    const employment = curEmp
      ? await prisma.employment.update({ where: { id: curEmp.id }, data: emPayload })
      : await prisma.employment.create({ data: { employee_id: employee.id, is_deleted: false, ...emPayload } });

    await prisma.employmentSalary.upsert({
      where: { employment_id: employment.id },
      update: {
        bank_account_primary: orNull(em.salary?.bank_account_primary),
        bank_name_primary: orNull(em.salary?.bank_name_primary),
      },
      create: {
        employment_id: employment.id,
        basic_salary: em.salary?.basic_salary || 0,
        bank_account_primary: orNull(em.salary?.bank_account_primary),
        bank_name_primary: orNull(em.salary?.bank_name_primary),
        is_deleted: false,
      },
    });

    // Education: only seed if the employee has none yet (avoid duplicates on re-run)
    if (emp.education && emp.education.length) {
      const eduCount = await prisma.educationQualification.count({ where: { employee_id: employee.id, is_deleted: false } });
      if (eduCount === 0) {
        for (const edu of emp.education) {
          await prisma.educationQualification.create({
            data: {
              employee_id: employee.id,
              education_level: edu.raw_text,
              education_level_id: edu.education_level ? levelByName[edu.education_level] || null : null,
              institution_name: "Not specified",
              is_deleted: false,
            },
          });
        }
      }
    }

    if ((created + updated) % 250 === 0) console.log(`   ...${created + updated} processed`);
  }

  console.log(`✅ Employees: ${created} created, ${updated} updated.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("🎉 Production seed complete (idempotent).");
  })
  .catch(async (e) => {
    console.error("❌ Production seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
