/**
 * PRODUCTION update — July 2026 HR refresh (new joiners + reporting lines).
 * Idempotent and STRICTLY ADDITIVE — safe on a live database, safe to re-run.
 *
 * What it does:
 *   1. Ensures the new location(s) referenced by the new workbook exist.
 *   2. CREATES employees whose CNIC is not in the DB yet (with employment,
 *      salary shell and education). Existing employees are NEVER modified —
 *      all live edits (names, transfers, salaries, ...) are preserved.
 *   3. Sets Employment.reporting_officer_id (= reporting officer's Employee.id,
 *      as string — the format leave/travel approval routing expects) on each
 *      employee's CURRENT employment, but only where it is currently empty.
 *      Existing non-empty values are never overwritten unless you pass
 *      --overwrite-reporting.
 *   4. Skips and reports anomalies: self-reporting rows, employees/ROs not in
 *      the DB, employees without a current employment record.
 *
 * Usage:
 *   node scripts/apply_reporting_line_update.js                  # DRY RUN (default, writes nothing)
 *   node scripts/apply_reporting_line_update.js --apply          # execute
 *   node scripts/apply_reporting_line_update.js --apply --overwrite-reporting
 *
 * Input: prisma/import/reporting_line_update.json
 *        (generated locally by: python prisma/import/transform_reporting_update.py)
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const JSON_PATH = path.join(__dirname, "..", "prisma", "import", "reporting_line_update.json");

const APPLY = process.argv.includes("--apply");
const OVERWRITE_RO = process.argv.includes("--overwrite-reporting");

const toDate = (v) => (v ? new Date(v) : null);
const orNull = (v) => (v === undefined || v === "" ? null : v);
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
  return prisma.city.create({ data: { name, district_id, is_active: true, is_deleted: false } });
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`Missing ${JSON_PATH}. Run: python prisma/import/transform_reporting_update.py`);
  }
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  console.log(`${APPLY ? "🚀 APPLY" : "🔎 DRY RUN (pass --apply to execute)"} — ${data._meta.source_file}`);
  console.log(`   payload: ${data.employees.length} employees, ${data.reporting_lines.length} reporting lines\n`);

  // ---------- Load current DB state ----------
  const dbEmployees = await prisma.employee.findMany({
    select: { id: true, cnic: true, full_name: true, is_deleted: true, email: true },
  });
  const empByCnic = new Map(dbEmployees.filter((e) => !e.is_deleted).map((e) => [e.cnic, e]));
  const usedEmails = new Set(dbEmployees.map((e) => e.email).filter(Boolean));

  const currentEmployments = await prisma.employment.findMany({
    where: { is_current: true, is_deleted: false },
    select: { id: true, employee_id: true, reporting_officer_id: true },
  });
  const curEmpByEmployee = new Map(currentEmployments.map((e) => [e.employee_id, e]));

  const [depts, desigs, grades, locs, eduLevels, roleTags] = await Promise.all([
    prisma.department.findMany({ where: { is_deleted: false }, select: { id: true, name: true } }),
    prisma.designation.findMany({ where: { is_deleted: false }, select: { id: true, title: true } }),
    prisma.scaleGrade.findMany({ select: { id: true, name: true } }),
    prisma.location.findMany({ where: { is_deleted: false }, select: { id: true, name: true } }),
    prisma.educationLevel.findMany({ select: { id: true, name: true } }),
    prisma.roleTag.findMany({ select: { id: true, name: true } }),
  ]);
  const deptByName = new Map(depts.map((d) => [d.name, d.id]));
  const desigByTitle = new Map(desigs.map((d) => [d.title, d.id]));
  const gradeByName = new Map(grades.map((g) => [g.name, g.id]));
  const locByName = new Map(locs.map((l) => [l.name, l.id]));
  const levelByName = new Map(eduLevels.map((l) => [l.name, l.id]));
  const roleTagByName = new Map(roleTags.map((t) => [t.name, t.id]));

  console.log(`   DB now: ${empByCnic.size} employees, ${currentEmployments.length} current employments, ` +
    `${currentEmployments.filter((e) => e.reporting_officer_id && String(e.reporting_officer_id).trim() !== "").length} with reporting officer set\n`);

  // ---------- Plan: new locations ----------
  const locationsToCreate = (data.new_locations || []).filter((l) => !locByName.has(l.name));

  // ---------- Plan: new employees ----------
  const toCreate = data.employees.filter((e) => !empByCnic.has(e.cnic));
  const emailClashes = toCreate.filter((e) => uniqueOrNull(e.email) && usedEmails.has(uniqueOrNull(e.email)));
  const missingMaster = { department: new Set(), designation: new Set(), scale_grade: new Set(), location: new Set() };
  for (const e of toCreate) {
    const em = e.employment;
    if (em.department && !deptByName.has(em.department)) missingMaster.department.add(em.department);
    if (em.designation && !desigByTitle.has(em.designation)) missingMaster.designation.add(em.designation);
    if (em.scale_grade && !gradeByName.has(em.scale_grade)) missingMaster.scale_grade.add(em.scale_grade);
    if (em.location_name && !locByName.has(em.location_name) &&
        !locationsToCreate.some((l) => l.name === em.location_name)) missingMaster.location.add(em.location_name);
  }

  console.log(`── Plan ─────────────────────────────────────────────`);
  console.log(`   Locations to create : ${locationsToCreate.length}${locationsToCreate.length ? " -> " + locationsToCreate.map((l) => l.name).join(", ") : ""}`);
  console.log(`   Employees to create : ${toCreate.length} (existing employees are never touched)`);
  for (const e of toCreate) {
    console.log(`      + ${e.cnic} ${e.full_name} — ${e.employment.designation || "(no designation)"} @ ${e.employment.location_name}`);
  }
  if (emailClashes.length) {
    console.log(`   ⚠️ email clashes (will be created with NULL email): ${emailClashes.map((e) => `${e.cnic} ${e.email}`).join(", ")}`);
  }
  for (const [kind, set] of Object.entries(missingMaster)) {
    if (set.size) console.log(`   ⚠️ ${kind} referenced but missing in DB (left NULL): ${[...set].join(", ")}`);
  }

  // ---------- Plan: reporting lines ----------
  // Employee ids for CNICs created in this run are known only after creation,
  // so classification for those is provisional in dry-run.
  const createSet = new Set(toCreate.map((e) => e.cnic));
  const plan = { set: [], correct: 0, conflict: [], self: [], empMissing: [], roMissing: [], noCurrent: [] };
  for (const rl of data.reporting_lines) {
    if (rl.self) { plan.self.push(rl); continue; }
    const emp = empByCnic.get(rl.cnic);
    const ro = empByCnic.get(rl.ro_cnic);
    const empPending = !emp && createSet.has(rl.cnic);
    const roPending = !ro && createSet.has(rl.ro_cnic);
    if (!emp && !empPending) { plan.empMissing.push(rl); continue; }
    if (!ro && !roPending) { plan.roMissing.push(rl); continue; }
    if (empPending) { plan.set.push({ rl, pendingEmp: true }); continue; } // employment created in this run gets RO directly
    const cur = curEmpByEmployee.get(emp.id);
    if (!cur) { plan.noCurrent.push(rl); continue; }
    const existing = cur.reporting_officer_id ? String(cur.reporting_officer_id).trim() : "";
    const target = ro ? String(ro.id) : null; // null => resolved after creation
    if (existing === "" ) { plan.set.push({ rl, employmentId: cur.id, target }); continue; }
    if (target !== null && existing === target) { plan.correct++; continue; }
    if (target === null) { plan.conflict.push({ rl, existing, target: "(new employee id)" }); continue; }
    plan.conflict.push({ rl, existing, target, employmentId: cur.id });
  }

  console.log(`\n   Reporting lines     : ${data.reporting_lines.length} in file`);
  console.log(`      will set          : ${plan.set.length}`);
  console.log(`      already correct   : ${plan.correct}`);
  console.log(`      conflicts (set to a different value already): ${plan.conflict.length}${OVERWRITE_RO ? "  -> WILL OVERWRITE (--overwrite-reporting)" : "  -> kept as-is (use --overwrite-reporting to replace)"}`);
  for (const c of plan.conflict.slice(0, 20)) {
    console.log(`         ${c.rl.cnic} ${c.rl.name}: db=${JSON.stringify(c.existing)} file->employee ${c.target} (RO ${c.rl.ro_cnic})`);
  }
  console.log(`      self-reporting (skipped, fix in HR source): ${plan.self.length}`);
  for (const rlx of plan.self) console.log(`         ${rlx.cnic} ${rlx.name} (ro_line=${rlx.ro_line})`);
  console.log(`      employee not in DB (skipped): ${plan.empMissing.length}`);
  for (const rlx of plan.empMissing.slice(0, 10)) console.log(`         ${rlx.cnic} ${rlx.name}`);
  console.log(`      RO not in DB (skipped): ${plan.roMissing.length}`);
  for (const rlx of plan.roMissing.slice(0, 10)) console.log(`         ${rlx.cnic} ${rlx.name} -> RO ${rlx.ro_cnic}`);
  console.log(`      no current employment (skipped): ${plan.noCurrent.length}`);
  for (const rlx of plan.noCurrent.slice(0, 10)) console.log(`         ${rlx.cnic} ${rlx.name}`);

  if (!APPLY) {
    console.log(`\n🔎 Dry run complete — nothing written. Re-run with --apply to execute.`);
    return;
  }

  // =========================================================================
  // APPLY
  // =========================================================================
  console.log(`\n── Applying ─────────────────────────────────────────`);

  // 1. New locations
  for (const l of locationsToCreate) {
    let district_id = null, city_id = null;
    if (l.district) {
      district_id = (await ensureDistrict(l.district)).id;
      if (l.city) city_id = (await ensureCity(l.city, district_id)).id;
    }
    const created = await prisma.location.create({
      data: { name: l.name, type: l.type, district_id, city_id, is_active: true, is_deleted: false },
    });
    locByName.set(l.name, created.id);
    console.log(`   📍 created location ${created.id} ${l.name} [${l.type}]`);
  }

  // 2. New employees (create-only)
  let createdCount = 0;
  for (const emp of toCreate) {
    const em = emp.employment;
    let email = uniqueOrNull(emp.email);
    if (email && usedEmails.has(email)) email = null; // never fail the run on a clash
    if (email) usedEmails.add(email);

    const employee = await prisma.employee.create({
      data: {
        cnic: emp.cnic,
        full_name: emp.full_name,
        father_husband_name: orNull(emp.father_husband_name),
        relationship_type: orNull(emp.relationship_type),
        mother_name: orNull(emp.mother_name),
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
        email,
        present_address: orNull(emp.present_address),
        permanent_address: orNull(emp.permanent_address),
        same_address: !!emp.same_address,
        has_disability: !!emp.has_disability,
        missing_note: orNull(emp.missing_note),
        status: emp.status || "Active",
        is_deleted: false,
      },
    });
    empByCnic.set(emp.cnic, { id: employee.id, cnic: emp.cnic, full_name: emp.full_name });

    const employment = await prisma.employment.create({
      data: {
        employee_id: employee.id,
        organization: em.organization || "PSBA",
        department_id: em.department ? deptByName.get(em.department) || null : null,
        designation_id: em.designation ? desigByTitle.get(em.designation) || null : null,
        role_tag_id: em.role_tag ? roleTagByName.get(em.role_tag) || null : null,
        scale_grade_id: em.scale_grade ? gradeByName.get(em.scale_grade) || null : null,
        employment_type: em.employment_type || "Regular",
        joining_date: toDate(em.joining_date),
        office_location: orNull(em.location_name),
        location_id: em.location_name ? locByName.get(em.location_name) || null : null,
        remarks: orNull(em.additional_charge),
        employment_status: "active",
        is_current: true,
        is_deleted: false,
      },
    });
    curEmpByEmployee.set(employee.id, { id: employment.id, employee_id: employee.id, reporting_officer_id: null });

    await prisma.employmentSalary.create({
      data: { employment_id: employment.id, basic_salary: 0, is_deleted: false },
    });

    for (const edu of emp.education || []) {
      await prisma.educationQualification.create({
        data: {
          employee_id: employee.id,
          education_level: edu.raw_text,
          education_level_id: edu.education_level ? levelByName.get(edu.education_level) || null : null,
          institution_name: "Not specified",
          is_deleted: false,
        },
      });
    }
    createdCount++;
    console.log(`   👤 created employee ${employee.id} ${emp.cnic} ${emp.full_name}`);
  }

  // 3. Reporting lines
  let setCount = 0, overwriteCount = 0, lateSkip = [];
  const applyRo = async (rl) => {
    const emp = empByCnic.get(rl.cnic);
    const ro = empByCnic.get(rl.ro_cnic);
    if (!emp || !ro) { lateSkip.push(rl); return; }
    const cur = curEmpByEmployee.get(emp.id);
    if (!cur) { lateSkip.push(rl); return; }
    const target = String(ro.id);
    const existing = cur.reporting_officer_id ? String(cur.reporting_officer_id).trim() : "";
    if (existing === target) return;
    if (existing !== "" && !OVERWRITE_RO) return;
    await prisma.employment.update({ where: { id: cur.id }, data: { reporting_officer_id: target } });
    existing === "" ? setCount++ : overwriteCount++;
  };

  const work = [...plan.set.map((x) => x.rl), ...(OVERWRITE_RO ? plan.conflict.map((x) => x.rl) : [])];
  let done = 0;
  for (const rl of work) {
    await applyRo(rl);
    if (++done % 250 === 0) console.log(`   ...${done}/${work.length} reporting lines processed`);
  }

  console.log(`\n✅ Done: ${createdCount} employees created, ${setCount} reporting lines set` +
    `${OVERWRITE_RO ? `, ${overwriteCount} overwritten` : ""}${lateSkip.length ? `, ${lateSkip.length} late-skipped` : ""}`);

  // Post-verify
  const withRo = await prisma.employment.count({
    where: { is_current: true, is_deleted: false, NOT: { reporting_officer_id: null } },
  });
  const totalEmp = await prisma.employee.count({ where: { is_deleted: false } });
  console.log(`   verify: ${totalEmp} employees, ${withRo} current employments with a reporting officer`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error("❌ Failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
