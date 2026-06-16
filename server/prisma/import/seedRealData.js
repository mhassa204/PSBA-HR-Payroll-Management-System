/**
 * JSON-driven seeding of the REAL PSBA data produced by transform_excel.py.
 *
 * Consumes employees.normalized.json and creates:
 *   districts, education levels (12), departments (15), scale grades (BS-n),
 *   designations (canonical), special-unit role tags, locations (75),
 *   and 1,546 employees each with Employment + EmploymentSalary + EducationQualification.
 *
 * Returns lookup maps so the caller (seed.js) can wire users/leadership by CNIC.
 * No dummy data here — this is the single source of real employee records.
 */
const fs = require("fs");
const path = require("path");
const PUNJAB_GEO = require("./punjabGeo");
const { geoForLocation } = require("./locationGeo");
const DESIG_DEPT = require("./designationDept.json"); // designation title -> dept name

const JSON_PATH = path.join(__dirname, "employees.normalized.json");

function loadData() {
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(
      `Normalized data not found at ${JSON_PATH}. Run: python server/prisma/import/transform_excel.py`
    );
  }
  return JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
}

const toDate = (v) => (v ? new Date(v) : null);
const orNull = (v) => (v === undefined || v === "" ? null : v);
/** Unique nullable fields: never persist empty/whitespace strings (PostgreSQL @unique treats "" as a value). */
const uniqueOrNull = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};

async function seedRealData(prisma) {
  const data = loadData();
  const md = data.master_data;
  console.log(
    `📦 Loading real data: ${data.employees.length} employees, ${md.locations.length} locations`
  );

  // ---- 1. Districts + Cities (full Punjab master data, req #10) ----
  const districtNames = [
    ...new Set([
      ...Object.keys(PUNJAB_GEO),
      ...md.locations.map((l) => l.district).filter(Boolean),
    ]),
  ];
  const districtByName = {};
  for (const name of districtNames) {
    const d = await prisma.district.create({
      data: { name, is_active: true, is_deleted: false },
    });
    districtByName[name] = d.id;
  }
  // Cities/tehsils per district (deduped per district)
  let cityCount = 0;
  for (const [district, cities] of Object.entries(PUNJAB_GEO)) {
    const district_id = districtByName[district];
    const seen = new Set();
    for (const city of cities) {
      const key = city.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      await prisma.city.create({
        data: { name: city, district_id, is_active: true, is_deleted: false },
      });
      cityCount++;
    }
  }
  console.log(`✅ Districts: ${districtNames.length}, Cities: ${cityCount}`);

  // ---- 2. Education levels (12, ordered) ----
  const levelByName = {};
  let order = 1;
  for (const name of md.education_levels) {
    const l = await prisma.educationLevel.create({
      data: { name, order: order++, is_active: true, is_deleted: false },
    });
    levelByName[name] = l.id;
  }
  console.log(`✅ Education levels: ${md.education_levels.length}`);

  // ---- 3. Departments (15 — replaces seed's dummy set) ----
  const deptByName = {};
  for (const name of md.departments) {
    const dep = await prisma.department.create({
      data: { name, is_deleted: false },
    });
    deptByName[name] = dep.id;
  }
  console.log(`✅ Departments: ${md.departments.length}`);

  // ---- 4. Scale grades (BS-1 .. BS-20 as present) ----
  const gradeByName = {};
  for (const name of md.scale_grades) {
    const level = parseInt(String(name).split("-")[1], 10) || null;
    const sg = await prisma.scaleGrade.create({
      data: {
        name,
        description: `Basic Scale ${level}`,
        level,
        category: "BS",
        is_active: true,
        is_deleted: false,
      },
    });
    gradeByName[name] = sg.id;
  }
  console.log(`✅ Scale grades: ${md.scale_grades.length}`);

  // ---- 5. Designations (canonical, department-less for operational roles) ----
  const desigByTitle = {};
  for (const d of md.designations) {
    // HO office designations link to their department; field roles stay deptless
    const deptName = DESIG_DEPT[d.title];
    const department_id = deptName ? deptByName[deptName] || null : null;
    const des = await prisma.designation.create({
      data: { title: d.title, department_id, is_deleted: false },
    });
    desigByTitle[d.title] = des.id;
  }
  console.log(`✅ Designations: ${md.designations.length}`);

  // ---- 6. Role tags for special units (in addition to base tags from seed.js) ----
  const roleTagByName = {};
  for (const name of md.role_tags_new || []) {
    const rt = await prisma.roleTag.create({
      data: {
        name,
        description: name,
        category: "Operations",
        is_active: true,
        is_deleted: false,
      },
    });
    roleTagByName[name] = rt.id;
  }

  // ---- 7. Locations (75: bazaars, mobile bazaars, head office, special units) ----
  // Each location is associated with its district + city (created on demand).
  const cityCache = {}; // `${district_id}|${cityName}` -> city id
  const ensureCityId = async (cityName, district_id) => {
    if (!cityName || !district_id) return null;
    const key = `${district_id}|${cityName}`;
    if (cityCache[key]) return cityCache[key];
    let c = await prisma.city.findFirst({ where: { name: cityName, district_id } });
    if (!c) {
      c = await prisma.city.create({
        data: { name: cityName, district_id, is_active: true, is_deleted: false },
      });
    }
    cityCache[key] = c.id;
    return c.id;
  };

  const locByName = {};
  let locWithGeo = 0;
  for (const loc of md.locations) {
    const geo = geoForLocation(loc.name);
    let district_id = loc.district ? districtByName[loc.district] || null : null;
    let city_id = null;
    if (geo) {
      district_id = districtByName[geo.district] || district_id;
      city_id = await ensureCityId(geo.city, district_id);
      if (district_id) locWithGeo++;
    }
    const created = await prisma.location.create({
      data: {
        name: loc.name,
        type: loc.type, // BAZAAR | MOBILE_BAZAAR | HEAD_OFFICE | SPECIAL_UNIT
        district_id,
        city_id,
        is_active: true,
        is_deleted: false,
      },
    });
    locByName[loc.name] = created.id;
  }
  console.log(`✅ Locations: ${md.locations.length} (${locWithGeo} with district+city)`);

  // ---- 8. Employees + Employment + Salary + Education ----
  let count = 0;
  const employeeIdByCnic = {};
  for (const emp of data.employees) {
    const created = await prisma.employee.create({
      data: {
        full_name: emp.full_name,
        father_husband_name: orNull(emp.father_husband_name),
        relationship_type: orNull(emp.relationship_type),
        mother_name: orNull(emp.mother_name),
        cnic: emp.cnic, // required, unique — single source of truth
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
        is_deleted: false,
      },
    });
    employeeIdByCnic[emp.cnic] = created.id;

    const em = emp.employment;
    const employment = await prisma.employment.create({
      data: {
        employee_id: created.id,
        organization: em.organization || "PSBA",
        department_id: em.department ? deptByName[em.department] || null : null,
        designation_id: em.designation
          ? desigByTitle[em.designation] || null
          : null,
        role_tag_id: em.role_tag ? roleTagByName[em.role_tag] || null : null,
        scale_grade_id: em.scale_grade
          ? gradeByName[em.scale_grade] || null
          : null,
        employment_type: em.employment_type || "Regular",
        joining_date: toDate(em.joining_date),
        effective_from: toDate(em.effective_from), // left null per req #2
        office_location: orNull(em.location_name),
        location_id: em.location_name ? locByName[em.location_name] || null : null,
        remarks: orNull(em.additional_charge),
        employment_status: "active",
        is_current: true,
        is_deleted: false,
      },
    });

    await prisma.employmentSalary.create({
      data: {
        employment_id: employment.id,
        basic_salary: em.salary?.basic_salary || 0,
        bank_account_primary: orNull(em.salary?.bank_account_primary),
        bank_name_primary: orNull(em.salary?.bank_name_primary),
        is_deleted: false,
      },
    });

    for (const edu of emp.education || []) {
      await prisma.educationQualification.create({
        data: {
          employee_id: created.id,
          education_level: edu.raw_text, // original text preserved (lossless)
          education_level_id: edu.education_level
            ? levelByName[edu.education_level] || null
            : null,
          institution_name: "Not specified",
          is_deleted: false,
        },
      });
    }

    count++;
    if (count % 250 === 0) console.log(`   ...seeded ${count} employees`);
  }
  console.log(`✅ Employees: ${count} (with employment, salary, education)`);

  return {
    districtByName,
    deptByName,
    locByName,
    employeeIdByCnic,
    levelByName,
    gradeByName,
  };
}

module.exports = { seedRealData };
