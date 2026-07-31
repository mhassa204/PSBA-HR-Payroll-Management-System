/**
 * PRODUCTION update — 30-7-26 v3 HR refresh.
 * Idempotent, dry-run by default, safe to re-run. Analysis: EXCEL_V3_ANALYSIS.md.
 *
 * Phases:
 *   1. Rename 'Sahulat Bazaar Nishtar Town' -> 'Sahulat Bazaar Nishter Town'.
 *   2. Ensure locations: 'Sahulat Bazaar One Unit Bahawalpur (On the GO)'
 *      (expected to exist — matched fuzzily, created only if truly missing) and
 *      'Sahulat Bazaar Sue-e-Asal (On the GO)' (new).
 *   3. CREATE employees whose CNIC is not in the DB (with employment, salary
 *      shell, education). Existing employees are never re-created.
 *   4. Location moves (plain Employment.location_id update, NO transfer history
 *      — user decision 2026-07-31), overwrite-only-untouched: applied only if
 *      the DB location still equals the 10-7-26 baseline location; manual UI
 *      transfers are preserved and reported as conflicts. Under-construction
 *      targets (Minchinabad/Pasrur/Samundri) are skipped by the ETL already.
 *   5. Field updates on existing employees:
 *        fill-if-empty : email (unique-checked), mother_name ('Unknown' counts
 *                        as empty), and any baseline-tracked field that is empty
 *        untouched-rule: cnic issue/expiry(+lifetime), date_of_birth,
 *                        mobile_number, father_husband_name, designation —
 *                        overwritten only if DB still equals the baseline value.
 *   6. Reporting officer fill-where-empty (--overwrite-reporting to replace).
 *   7. Soft-delete removals (employees gone from the workbook — confirmed exits)
 *      using the app's mask convention so the attendance droplet deactivates them.
 *   8. Create login accounts for the ensured locations if they have none
 *      (slug email, default password — create_roster_accounts.js convention).
 *
 * Usage:
 *   node scripts/apply_v3_update.js                        # DRY RUN
 *   node scripts/apply_v3_update.js --apply                # execute
 *   node scripts/apply_v3_update.js --apply --overwrite-reporting
 *
 * Input: prisma/import/v3_update.json (python prisma/import/transform_v3.py)
 */
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { encrypt } = require("../src/utils/cryptoUtil");
const { maskUniqueFieldsForSoftDelete } = require("../src/utils/softDeleteUtil");

const prisma = new PrismaClient();
const JSON_PATH = path.join(__dirname, "..", "prisma", "import", "v3_update.json");

const APPLY = process.argv.includes("--apply");
const OVERWRITE_RO = process.argv.includes("--overwrite-reporting");
const DEFAULT_PASSWORD = "abc123";

const toDate = (v) => (v ? new Date(v) : null);
const orNull = (v) => (v === undefined || v === "" ? null : v);
const trimOrEmpty = (v) => (v === undefined || v === null ? "" : String(v).trim());
const dateStr = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");
const normKey = (v) => trimOrEmpty(v).toLowerCase().replace(/[^a-z0-9]/g, "");

async function ensureDistrict(name) {
  return prisma.district.upsert({ where: { name }, update: {}, create: { name, is_active: true, is_deleted: false } });
}
async function ensureCity(name, district_id) {
  const found = await prisma.city.findFirst({ where: { name, district_id } });
  if (found) return found;
  return prisma.city.create({ data: { name, district_id, is_active: true, is_deleted: false } });
}

function slugFromName(name, isMobile) {
  const stop = new Set(["sahulat", "model", "cart", "bazaar", "bazar", "on", "the", "go", "otg"]);
  const tokens = String(name || "").toLowerCase().replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t && !stop.has(t));
  const base = tokens.join("").slice(0, 24) || "loc";
  return `${base}${isMobile ? ".otg" : ""}@psba.gop.pk`;
}

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    throw new Error(`Missing ${JSON_PATH}. Run: python prisma/import/transform_v3.py`);
  }
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));
  const baseline = data.baseline || {};
  console.log(`${APPLY ? "🚀 APPLY" : "🔎 DRY RUN (pass --apply to execute)"} — ${data._meta.source_file}`);
  console.log(`   payload: ${data.employees.length} employees, ${data.reporting_lines.length} reporting lines, ${data.removals.length} removal(s)\n`);

  // ---------- Load current DB state ----------
  const dbEmployees = await prisma.employee.findMany({
    select: {
      id: true, cnic: true, full_name: true, is_deleted: true, email: true,
      mother_name: true, father_husband_name: true, date_of_birth: true,
      mobile_number: true, cnic_issue_date: true, cnic_expire_date: true, cnic_lifetime: true,
    },
  });
  const empByCnic = new Map(dbEmployees.filter((e) => !e.is_deleted).map((e) => [String(e.cnic).split("__DEL__")[0], e]));
  const deletedCnics = new Set(dbEmployees.filter((e) => e.is_deleted).map((e) => String(e.cnic).split("__DEL__")[0]));
  const usedEmails = new Set(dbEmployees.map((e) => e.email && e.email.toLowerCase()).filter(Boolean));

  const currentEmployments = await prisma.employment.findMany({
    where: { is_current: true, is_deleted: false },
    select: {
      id: true, employee_id: true, reporting_officer_id: true, location_id: true,
      designation_id: true, location: { select: { id: true, name: true } },
      designation: { select: { id: true, title: true } },
    },
  });
  const curEmpByEmployee = new Map(currentEmployments.map((e) => [e.employee_id, e]));

  const [depts, desigs, grades, locs, eduLevels, roleTags, users, employeeRole] = await Promise.all([
    prisma.department.findMany({ where: { is_deleted: false }, select: { id: true, name: true } }),
    prisma.designation.findMany({ where: { is_deleted: false }, select: { id: true, title: true } }),
    prisma.scaleGrade.findMany({ select: { id: true, name: true } }),
    prisma.location.findMany({ where: { is_deleted: false }, select: { id: true, name: true, type: true } }),
    prisma.educationLevel.findMany({ select: { id: true, name: true } }),
    prisma.roleTag.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ where: { is_deleted: false }, select: { email: true, location_id: true } }),
    prisma.role.findFirst({ where: { name: "Employee", is_deleted: false } }),
  ]);
  const deptByName = new Map(depts.map((d) => [d.name, d.id]));
  const desigByTitle = new Map(desigs.map((d) => [d.title, d.id]));
  const gradeByName = new Map(grades.map((g) => [g.name, g.id]));
  const locByName = new Map(locs.map((l) => [l.name, l.id]));
  const levelByName = new Map(eduLevels.map((l) => [l.name, l.id]));
  const roleTagByName = new Map(roleTags.map((t) => [t.name, t.id]));
  const usedUserEmails = new Set(users.map((u) => u.email.toLowerCase()));
  const usersByLocation = new Set(users.map((u) => u.location_id).filter(Boolean));

  console.log(`   DB now: ${empByCnic.size} employees, ${currentEmployments.length} current employments, ${locs.length} locations\n`);

  const report = { conflicts: [], skipped: [], notes: [] };

  // =========================================================================
  // 1. Location renames
  // =========================================================================
  console.log(`── 1. Location renames ──────────────────────────────`);
  const renamePlan = [];
  for (const rn of data.location_renames || []) {
    const fromLoc = locs.find((l) => l.name === rn.from);
    const toLoc = locs.find((l) => l.name === rn.to);
    if (toLoc && fromLoc) {
      report.conflicts.push(`RENAME: both "${rn.from}" and "${rn.to}" exist — keeping both, employees mapped to "${rn.to}". Merge manually.`);
      console.log(`   ⚠️ both exist: ${rn.from} AND ${rn.to} — no rename, review manually`);
    } else if (toLoc) {
      console.log(`   ✓ already renamed: ${rn.to}`);
    } else if (fromLoc) {
      renamePlan.push({ id: fromLoc.id, from: rn.from, to: rn.to });
      console.log(`   ~ rename location ${fromLoc.id}: "${rn.from}" -> "${rn.to}"`);
    } else {
      report.notes.push(`RENAME: neither "${rn.from}" nor "${rn.to}" found in DB`);
      console.log(`   ⚠️ neither name found: ${rn.from} / ${rn.to}`);
    }
  }

  // =========================================================================
  // 2. Ensure locations (fuzzy match before create — One Unit BWP was added manually)
  // =========================================================================
  console.log(`\n── 2. Ensure locations ──────────────────────────────`);
  const ensurePlan = []; // {payloadName, action: 'use'|'create', locId?, dbName?}
  for (const l of data.locations_to_ensure || []) {
    let match = locs.find((x) => x.name === l.name);
    if (!match) {
      const want = normKey(l.name);
      match = locs.find((x) => {
        const k = normKey(x.name);
        return k === want || (want.includes("oneunit") && k.includes("oneunit") && k.includes("bahawalpur"))
          || (want.includes("sueeasal") && k.includes("sueeasal"));
      });
    }
    if (match) {
      ensurePlan.push({ payloadName: l.name, action: "use", locId: match.id, dbName: match.name });
      console.log(`   ✓ exists: "${l.name}" -> DB "${match.name}" (id ${match.id})`);
    } else {
      if (l.expect_existing) {
        report.notes.push(`Location "${l.name}" was expected to exist in prod but was NOT found — it will be CREATED.`);
        console.log(`   ⚠️ expected to exist but missing — will create: ${l.name}`);
      } else {
        console.log(`   + create: ${l.name} [${l.type}] (${l.district})`);
      }
      ensurePlan.push({ payloadName: l.name, action: "create", def: l });
    }
  }

  // Resolve a payload location name -> {id, name} AFTER phases 1-2 (dry-run aware).
  // Head office is matched by TYPE: the seed named it "Head Quarter" but prod
  // renamed it "Headquarters" — name lookup breaks there.
  const hqLoc = locs.find((l) => l.name === "Head Quarter" && l.type === "HEAD_OFFICE")
    || locs.find((l) => l.type === "HEAD_OFFICE");
  const resolveLoc = (payloadName) => {
    if (!payloadName) return null;
    if (payloadName === "Head Quarter") return hqLoc ? { id: hqLoc.id, name: hqLoc.name } : null;
    const ensured = ensurePlan.find((p) => p.payloadName === payloadName);
    if (ensured && ensured.locId) return { id: ensured.locId, name: ensured.dbName };
    if (ensured) return { id: null, name: payloadName, pendingCreate: true };
    if (locByName.has(payloadName)) return { id: locByName.get(payloadName), name: payloadName };
    const renamed = (data.location_renames || []).find((r) => r.to === payloadName);
    if (renamed) {
      const plan = renamePlan.find((p) => p.to === payloadName);
      if (plan) return { id: plan.id, name: payloadName, pendingRename: true };
      if (locByName.has(renamed.from)) return { id: locByName.get(renamed.from), name: renamed.from };
    }
    return null;
  };

  // =========================================================================
  // 3. New employees
  // =========================================================================
  const toCreate = data.employees.filter((e) => !empByCnic.has(e.cnic));
  console.log(`\n── 3. Employees to create: ${toCreate.length} ─────────────────────`);
  const missingMaster = { department: new Set(), designation: new Set(), scale_grade: new Set(), location: new Set() };
  for (const e of toCreate) {
    const em = e.employment;
    if (em.department && !deptByName.has(em.department)) missingMaster.department.add(em.department);
    if (em.designation && !desigByTitle.has(em.designation)) missingMaster.designation.add(em.designation);
    if (em.scale_grade && !gradeByName.has(em.scale_grade)) missingMaster.scale_grade.add(em.scale_grade);
    if (em.location_name && !resolveLoc(em.location_name)) missingMaster.location.add(em.location_name);
    const redo = deletedCnics.has(e.cnic) ? " [was DELETED in HR before — re-creating fresh]" : "";
    console.log(`   + ${e.cnic} ${e.full_name} — ${em.designation || "(no designation)"} @ ${em.location_name || "(keep/none)"}${em.joining_date ? "" : " [no joining date]"}${redo}`);
  }
  const recreates = toCreate.filter((e) => deletedCnics.has(e.cnic));
  if (recreates.length) {
    console.log(`   ℹ️ ${recreates.length} of these were previously DELETED in HR (workbook still lists them) — they will be re-created as new records (old data stays soft-deleted)`);
  }
  for (const [kind, set] of Object.entries(missingMaster)) {
    if (set.size) console.log(`   ⚠️ ${kind} referenced but missing in DB (left NULL): ${[...set].join(", ")}`);
  }

  // 3b. Existing employees with NO current employment — create one from the workbook.
  const emplFixPlan = data.employees.filter((e) => {
    const dbEmp = empByCnic.get(e.cnic);
    return dbEmp && !curEmpByEmployee.get(dbEmp.id);
  });
  const emplFixSet = new Set(emplFixPlan.map((e) => e.cnic));
  if (emplFixPlan.length) {
    console.log(`\n   Employments to create for EXISTING employees (had none): ${emplFixPlan.length}`);
    for (const e of emplFixPlan) {
      console.log(`   ⊕ ${e.cnic} ${e.full_name} — ${e.employment.designation || "(no designation)"} @ ${e.employment.location_name || "(none)"}`);
    }
  }

  // =========================================================================
  // 4. Location moves (existing employees, untouched-rule)
  // =========================================================================
  console.log(`\n── 4. Location moves ────────────────────────────────`);
  const movePlan = [];
  let moveOk = 0, moveKeep = 0;
  for (const e of data.employees) {
    const em = e.employment;
    if (em.location_keep_current) { moveKeep++; continue; }
    const dbEmp = empByCnic.get(e.cnic);
    if (!dbEmp) continue; // created in this run with the right location already
    const cur = curEmpByEmployee.get(dbEmp.id);
    if (!cur) {
      if (!emplFixSet.has(e.cnic)) report.skipped.push(`MOVE ${e.cnic} ${e.full_name}: no current employment`);
      continue; // employment (with the right location) created in phase 3b
    }
    const target = resolveLoc(em.location_name);
    if (!target) { report.skipped.push(`MOVE ${e.cnic} ${e.full_name}: target location "${em.location_name}" unresolved`); continue; }
    const dbLocName = cur.location?.name || "";
    if (target.id !== null && cur.location_id === target.id) { moveOk++; continue; }
    if (normKey(dbLocName) === normKey(target.name)) { moveOk++; continue; } // rename pending
    const baseLocName = baseline[e.cnic]?.location_name || "";
    const untouched = !cur.location_id || normKey(dbLocName) === normKey(baseLocName)
      // baseline stores the FINAL mapped name (post-rename); accept the pre-rename DB spelling too
      || normKey(dbLocName) === normKey(baseLocName.replace("Nishter Town", "Nishtar Town"));
    if (!untouched) {
      report.conflicts.push(`MOVE ${e.cnic} ${e.full_name}: DB="${dbLocName}" was manually changed (baseline "${baseLocName}", file wants "${target.name}") — kept`);
      continue;
    }
    movePlan.push({ cnic: e.cnic, name: e.full_name, employmentId: cur.id, from: dbLocName || "(none)", toName: target.name, payloadName: em.location_name });
  }
  console.log(`   moves to apply: ${movePlan.length} (already correct: ${moveOk}, keep-current: ${moveKeep})`);
  for (const m of movePlan) console.log(`   → ${m.cnic} ${m.name}: ${m.from} -> ${m.toName}`);

  // =========================================================================
  // 5. Field updates (existing employees)
  // =========================================================================
  console.log(`\n── 5. Field updates ─────────────────────────────────`);
  const FIELDS = [
    { key: "cnic_issue_date", get: (e) => e.cnic_issue_date, db: (d) => dateStr(d.cnic_issue_date), pv: (v) => v || "", set: (v) => ({ cnic_issue_date: toDate(v) }) },
    { key: "cnic_expire_date", get: (e) => e.cnic_expire_date, db: (d) => dateStr(d.cnic_expire_date), pv: (v) => v || "", set: (v) => ({ cnic_expire_date: toDate(v) }) },
    { key: "date_of_birth", get: (e) => e.date_of_birth, db: (d) => dateStr(d.date_of_birth), pv: (v) => v || "", set: (v) => ({ date_of_birth: toDate(v) }) },
    { key: "mobile_number", get: (e) => e.mobile_number, db: (d) => trimOrEmpty(d.mobile_number), pv: (v) => trimOrEmpty(v), set: (v) => ({ mobile_number: orNull(v) }) },
    { key: "father_husband_name", get: (e) => e.father_husband_name, db: (d) => trimOrEmpty(d.father_husband_name), pv: (v) => trimOrEmpty(v), set: (v) => ({ father_husband_name: orNull(v) }) },
  ];
  const fieldPlan = []; // {employeeId, cnic, name, patch, why}
  let emailFills = 0, motherFills = 0, lifetimeFlips = 0;
  const emailClash = [];
  for (const e of data.employees) {
    const dbEmp = empByCnic.get(e.cnic);
    if (!dbEmp) continue;
    const base = baseline[e.cnic];
    const patch = {};
    const why = [];

    // fill-if-empty: email
    const email = e.email && e.email.toLowerCase();
    if (email && !trimOrEmpty(dbEmp.email)) {
      if (usedEmails.has(email)) { emailClash.push(`${e.cnic} ${e.full_name}: ${email} already in use`); }
      else { usedEmails.add(email); patch.email = email; why.push("email(fill)"); emailFills++; }
    }
    // fill-if-empty-or-Unknown: mother_name
    const dbMother = trimOrEmpty(dbEmp.mother_name);
    if (e.mother_name && e.mother_name !== "Unknown" && (!dbMother || dbMother === "Unknown")) {
      patch.mother_name = e.mother_name; why.push("mother_name(fill)"); motherFills++;
    }
    // untouched-rule fields
    for (const f of FIELDS) {
      const fileV = f.pv(f.get(e));
      const dbV = f.db(dbEmp);
      if (!fileV || fileV === dbV) continue;
      const baseV = base ? f.pv(f.get(base)) : "";
      if (!dbV || dbV === baseV) { Object.assign(patch, f.set(f.get(e))); why.push(f.key + (dbV ? "" : "(fill)")); }
      else report.conflicts.push(`FIELD ${e.cnic} ${e.full_name}.${f.key}: DB="${dbV}" (baseline "${baseV}", file "${fileV}") — manually edited, kept`);
    }
    // cnic_lifetime follows expiry semantics (untouched rule on the pair)
    if (e.cnic_lifetime !== undefined && !!e.cnic_lifetime !== !!dbEmp.cnic_lifetime) {
      const baseLt = base ? !!base.cnic_lifetime : false;
      if (!!dbEmp.cnic_lifetime === baseLt) { patch.cnic_lifetime = !!e.cnic_lifetime; why.push("cnic_lifetime"); lifetimeFlips++; }
    }
    if (Object.keys(patch).length) fieldPlan.push({ employeeId: dbEmp.id, cnic: e.cnic, name: e.full_name, patch, why });
  }
  // designation fill (only where DB designation empty AND baseline had none — e.g. Aneeza Zafar)
  const desigPlan = [];
  for (const e of data.employees) {
    const dbEmp = empByCnic.get(e.cnic);
    if (!dbEmp) continue;
    const em = e.employment;
    if (!em.designation) continue;
    const cur = curEmpByEmployee.get(dbEmp.id);
    if (!cur || cur.designation_id) continue;
    const target = desigByTitle.get(em.designation);
    if (target) desigPlan.push({ employmentId: cur.id, cnic: e.cnic, name: e.full_name, designation: em.designation, designationId: target });
    else report.skipped.push(`DESIGNATION ${e.cnic} ${e.full_name}: "${em.designation}" not in DB`);
  }
  console.log(`   employees with field updates: ${fieldPlan.length} (emails filled: ${emailFills}, mothers filled: ${motherFills}, lifetime flags: ${lifetimeFlips})`);
  console.log(`   designation fills (was empty): ${desigPlan.length}`);
  for (const d of desigPlan) console.log(`   → ${d.cnic} ${d.name}: designation = ${d.designation}`);
  if (emailClash.length) console.log(`   ⚠️ email clashes (skipped): ${emailClash.length}\n      ${emailClash.join("\n      ")}`);

  // =========================================================================
  // 6. Reporting lines (fill where empty)
  // =========================================================================
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
    if (empPending) { plan.set.push({ rl, pendingEmp: true }); continue; }
    const cur = curEmpByEmployee.get(emp.id);
    if (!cur) {
      if (emplFixSet.has(rl.cnic)) { plan.set.push({ rl, pendingEmp: true }); continue; } // employment created in phase 3b
      plan.noCurrent.push(rl); continue;
    }
    const existing = cur.reporting_officer_id ? String(cur.reporting_officer_id).trim() : "";
    const target = ro ? String(ro.id) : null;
    if (existing === "") { plan.set.push({ rl, employmentId: cur.id, target }); continue; }
    if (target !== null && existing === target) { plan.correct++; continue; }
    plan.conflict.push({ rl, existing, target: target ?? "(new employee id)" });
  }
  console.log(`\n── 6. Reporting lines ───────────────────────────────`);
  console.log(`   will set: ${plan.set.length}, already correct: ${plan.correct}, conflicts: ${plan.conflict.length}${OVERWRITE_RO ? " (WILL OVERWRITE)" : " (kept; --overwrite-reporting to replace)"}`);
  console.log(`   skipped — self: ${plan.self.length}, employee missing: ${plan.empMissing.length}, RO missing: ${plan.roMissing.length}, no current employment: ${plan.noCurrent.length}`);

  // =========================================================================
  // 7. Removals (soft delete)
  // =========================================================================
  console.log(`\n── 7. Removals ──────────────────────────────────────`);
  const removePlan = [];
  for (const rm of data.removals || []) {
    const dbEmp = empByCnic.get(rm.cnic);
    if (!dbEmp) { console.log(`   ✓ ${rm.cnic} ${rm.name} — already absent/deleted`); continue; }
    removePlan.push({ ...rm, employeeId: dbEmp.id });
    console.log(`   − soft-delete ${rm.cnic} ${rm.name} (last seen @ ${rm.last_cost_center})`);
  }

  // =========================================================================
  // 8. Location login accounts
  // =========================================================================
  console.log(`\n── 8. Location accounts ─────────────────────────────`);
  const accountPlan = [];
  for (const p of ensurePlan) {
    const locId = p.locId ?? null; // created locations handled after creation
    const nm = p.dbName || p.payloadName;
    if (locId && usersByLocation.has(locId)) { console.log(`   ✓ account exists for ${nm}`); continue; }
    const email = slugFromName(nm, true);
    if (usedUserEmails.has(email)) { report.conflicts.push(`ACCOUNT ${nm}: email ${email} already in use — skipped`); continue; }
    usedUserEmails.add(email);
    accountPlan.push({ ensured: p, email });
    console.log(`   + ${email.padEnd(38)} -> ${nm}`);
  }

  // ---------- Summary of anomalies ----------
  if (report.conflicts.length || report.skipped.length || report.notes.length) {
    console.log(`\n── Anomalies ────────────────────────────────────────`);
    for (const c of report.conflicts) console.log(`   ⚠️ ${c}`);
    for (const c of report.skipped) console.log(`   ↷ ${c}`);
    for (const c of report.notes) console.log(`   ℹ️ ${c}`);
  }

  if (!APPLY) {
    console.log(`\n🔎 Dry run complete — nothing written. Re-run with --apply to execute.`);
    return;
  }

  // =========================================================================
  // APPLY
  // =========================================================================
  console.log(`\n── Applying ─────────────────────────────────────────`);

  // 1. Renames
  for (const rn of renamePlan) {
    await prisma.location.update({ where: { id: rn.id }, data: { name: rn.to } });
    locByName.delete(rn.from); locByName.set(rn.to, rn.id);
    console.log(`   ✏️ renamed location ${rn.id} -> ${rn.to}`);
  }

  // 2. Ensure locations
  for (const p of ensurePlan) {
    if (p.action !== "create") continue;
    const l = p.def;
    let district_id = null, city_id = null;
    if (l.district) {
      district_id = (await ensureDistrict(l.district)).id;
      if (l.city) city_id = (await ensureCity(l.city, district_id)).id;
    }
    const created = await prisma.location.create({
      data: { name: l.name, type: l.type, district_id, city_id, is_active: true, is_deleted: false },
    });
    p.locId = created.id; p.dbName = created.name;
    locByName.set(l.name, created.id);
    console.log(`   📍 created location ${created.id} ${l.name} [${l.type}]`);
  }

  // 3. New employees
  let createdCount = 0;
  for (const emp of toCreate) {
    const em = emp.employment;
    let email = emp.email ? String(emp.email).trim().toLowerCase() : null;
    if (email && usedEmails.has(email)) email = null;
    if (email) usedEmails.add(email);
    const locRef = resolveLoc(em.location_name);

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
        office_location: orNull(locRef ? locRef.name : em.location_name),
        location_id: locRef ? locRef.id : null,
        remarks: orNull(em.additional_charge),
        employment_status: "active",
        is_current: true,
        is_deleted: false,
      },
    });
    curEmpByEmployee.set(employee.id, { id: employment.id, employee_id: employee.id, reporting_officer_id: null });

    await prisma.employmentSalary.create({ data: { employment_id: employment.id, basic_salary: 0, is_deleted: false } });
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
    console.log(`   👤 created ${employee.id} ${emp.cnic} ${emp.full_name}`);
  }

  // 3b. Employments for existing employees that had none
  for (const emp of emplFixPlan) {
    const dbEmp = empByCnic.get(emp.cnic);
    if (!dbEmp || curEmpByEmployee.get(dbEmp.id)) continue;
    const em = emp.employment;
    const locRef = resolveLoc(em.location_name);
    const employment = await prisma.employment.create({
      data: {
        employee_id: dbEmp.id,
        organization: em.organization || "PSBA",
        department_id: em.department ? deptByName.get(em.department) || null : null,
        designation_id: em.designation ? desigByTitle.get(em.designation) || null : null,
        role_tag_id: em.role_tag ? roleTagByName.get(em.role_tag) || null : null,
        scale_grade_id: em.scale_grade ? gradeByName.get(em.scale_grade) || null : null,
        employment_type: em.employment_type || "Regular",
        joining_date: toDate(em.joining_date),
        office_location: orNull(locRef ? locRef.name : em.location_name),
        location_id: locRef ? locRef.id : null,
        remarks: orNull(em.additional_charge),
        employment_status: "active",
        is_current: true,
        is_deleted: false,
      },
    });
    curEmpByEmployee.set(dbEmp.id, { id: employment.id, employee_id: dbEmp.id, reporting_officer_id: null });
    await prisma.employmentSalary.create({ data: { employment_id: employment.id, basic_salary: 0, is_deleted: false } });
    console.log(`   ⊕ created employment for existing ${emp.cnic} ${emp.full_name} @ ${locRef ? locRef.name : "(none)"}`);
  }

  // 4. Location moves
  let movedCount = 0;
  for (const m of movePlan) {
    const target = resolveLoc(m.payloadName);
    if (!target || target.id == null) { console.log(`   ⚠️ move skipped (unresolved): ${m.cnic} -> ${m.payloadName}`); continue; }
    await prisma.employment.update({
      where: { id: m.employmentId },
      data: { location_id: target.id, office_location: target.name },
    });
    movedCount++;
  }
  console.log(`   📦 location moves applied: ${movedCount}`);

  // 5. Field updates
  let patchedCount = 0;
  for (const f of fieldPlan) {
    await prisma.employee.update({ where: { id: f.employeeId }, data: f.patch });
    patchedCount++;
    if (patchedCount % 250 === 0) console.log(`   ...${patchedCount}/${fieldPlan.length} employees patched`);
  }
  for (const d of desigPlan) {
    await prisma.employment.update({ where: { id: d.employmentId }, data: { designation_id: d.designationId } });
  }
  console.log(`   📝 employees patched: ${patchedCount}, designations filled: ${desigPlan.length}`);

  // 6. Reporting lines
  let setCount = 0, overwriteCount = 0, lateSkip = 0;
  const work = [...plan.set.map((x) => x.rl), ...(OVERWRITE_RO ? plan.conflict.map((x) => x.rl) : [])];
  for (const rl of work) {
    const emp = empByCnic.get(rl.cnic);
    const ro = empByCnic.get(rl.ro_cnic);
    if (!emp || !ro) { lateSkip++; continue; }
    const cur = curEmpByEmployee.get(emp.id);
    if (!cur) { lateSkip++; continue; }
    const target = String(ro.id);
    const existing = cur.reporting_officer_id ? String(cur.reporting_officer_id).trim() : "";
    if (existing === target) continue;
    if (existing !== "" && !OVERWRITE_RO) continue;
    await prisma.employment.update({ where: { id: cur.id }, data: { reporting_officer_id: target } });
    existing === "" ? setCount++ : overwriteCount++;
  }
  console.log(`   🔗 reporting lines set: ${setCount}${OVERWRITE_RO ? `, overwritten: ${overwriteCount}` : ""}${lateSkip ? `, late-skipped: ${lateSkip}` : ""}`);

  // 7. Removals (app soft-delete convention: mask unique fields + cascade)
  for (const rm of removePlan) {
    const full = await prisma.employee.findUnique({ where: { id: rm.employeeId } });
    const { masked } = maskUniqueFieldsForSoftDelete("Employee", full);
    await prisma.employee.update({ where: { id: rm.employeeId }, data: { is_deleted: true, ...masked } });
    await prisma.pastExperience.updateMany({ where: { employee_id: rm.employeeId }, data: { is_deleted: true } });
    await prisma.educationQualification.updateMany({ where: { employee_id: rm.employeeId }, data: { is_deleted: true } });
    await prisma.employment.updateMany({ where: { employee_id: rm.employeeId }, data: { is_deleted: true } });
    console.log(`   🗑️ soft-deleted ${rm.cnic} ${rm.name}`);
  }

  // 8. Location accounts
  if (!employeeRole) {
    console.log(`   ⚠️ Employee role not found — no accounts created`);
  } else {
    for (const a of accountPlan) {
      const locId = a.ensured.locId;
      if (!locId) { console.log(`   ⚠️ account skipped (location unresolved): ${a.email}`); continue; }
      if (usersByLocation.has(locId)) continue;
      await prisma.user.create({
        data: { email: a.email, password: encrypt(DEFAULT_PASSWORD), role_id: employeeRole.id, location_id: locId, is_deleted: false },
      });
      usersByLocation.add(locId);
      console.log(`   🔑 created account ${a.email} (password: ${DEFAULT_PASSWORD})`);
    }
  }

  // Post-verify
  const totalEmp = await prisma.employee.count({ where: { is_deleted: false } });
  const withRo = await prisma.employment.count({
    where: { is_current: true, is_deleted: false, NOT: { reporting_officer_id: null } },
  });
  console.log(`\n✅ Done: ${createdCount} created, ${movedCount} moved, ${patchedCount} patched, ${setCount} ROs set, ${removePlan.length} removed.`);
  console.log(`   verify: ${totalEmp} active employees, ${withRo} current employments with a reporting officer`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => {
    console.error("❌ Failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
