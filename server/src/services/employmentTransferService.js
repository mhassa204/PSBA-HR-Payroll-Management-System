// src/services/employmentTransferService.js
// Employee transfer operations: move an employment's current posting
// (Employment.location_id) and/or record historical (backdated) transfers,
// always writing EmploymentHistory rows with the caller-supplied effective
// date in changed_at. The generic updateEmployment path is deliberately
// bypassed here — it stamps changed_at = now(), which breaks backdating.
const prisma = require("../utils/prisma");
const employmentHistoryService = require("./employmentHistoryService");

const httpError = (status, message, code) => {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
};

const parseId = (value, label) => {
  const id = parseInt(value);
  if (Number.isNaN(id)) throw httpError(400, `Invalid ${label}`);
  return id;
};

// Single remarks column in schema; order reference is folded in as a prefix.
const composeRemarks = (remarks, orderReference) => {
  const cleanRemarks = typeof remarks === "string" ? remarks.trim() : "";
  const cleanRef =
    typeof orderReference === "string" ? orderReference.trim() : "";
  if (cleanRef.length > 200) throw httpError(400, "Order reference too long (max 200 characters)");
  if (cleanRemarks.length > 1000) throw httpError(400, "Remarks too long (max 1000 characters)");
  if (cleanRef && cleanRemarks) return `Order Ref: ${cleanRef} — ${cleanRemarks}`;
  if (cleanRef) return `Order Ref: ${cleanRef}`;
  return cleanRemarks || null;
};

const parseEffectiveDate = (value) => {
  if (!value) throw httpError(400, "Effective date is required");
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) throw httpError(400, "Invalid effective date");
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (parsed > endOfToday) {
    throw httpError(400, "Effective date cannot be in the future");
  }
  return parsed;
};

const employmentIncludes = {
  location: { include: { city: true, district: true } },
  department: true,
  designation: true,
  employee: { select: { id: true, full_name: true, cnic: true } },
};

const employmentTransferService = {
  /**
   * Perform a transfer (mode TRANSFER: moves current posting + logs history)
   * or record a historical transfer (mode RECORD_ONLY: history row only).
   */
  async transferEmployment(employmentId, payload = {}, changedByUserId = null) {
    const id = parseId(employmentId, "employment id");
    const mode = payload.mode === "RECORD_ONLY" ? "RECORD_ONLY" : "TRANSFER";
    const toLocationId = parseId(payload.to_location_id, "target location");
    const effectiveDate = parseEffectiveDate(payload.effective_date);
    const remarks = composeRemarks(payload.remarks, payload.order_reference);

    return prisma.$transaction(async (tx) => {
      const employment = await tx.employment.findFirst({
        where: { id, is_deleted: false },
      });
      if (!employment) throw httpError(404, "Employment record not found");

      const toLocation = await tx.location.findFirst({
        where: { id: toLocationId, is_deleted: false },
      });
      if (!toLocation) throw httpError(400, "Target location not found");

      if (mode === "TRANSFER") {
        if (
          payload.expected_current_location_id !== undefined &&
          payload.expected_current_location_id !== null &&
          parseInt(payload.expected_current_location_id) !==
            employment.location_id
        ) {
          throw httpError(
            409,
            "The current posting changed while you were editing. Refresh and try again.",
            "STALE_STATE"
          );
        }
        if (!toLocation.is_active) {
          throw httpError(400, "Target location is inactive");
        }
        if (employment.location_id === toLocationId) {
          throw httpError(400, "Employee is already posted at this location");
        }

        const oldLabel = await employmentHistoryService.getFieldLabel(
          tx,
          "location_id",
          employment.location_id
        );
        const newLabel = await employmentHistoryService.getFieldLabel(
          tx,
          "location_id",
          toLocationId
        );

        // Optional department/designation change alongside the transfer
        const updateData = { location_id: toLocationId };
        const extraChanges = [];
        for (const [key, fieldName] of [
          ["to_department_id", "department_id"],
          ["to_designation_id", "designation_id"],
        ]) {
          if (payload[key] === undefined || payload[key] === null || payload[key] === "") continue;
          const newId = parseId(payload[key], fieldName.replace("_id", ""));
          if (newId === employment[fieldName]) continue;
          const model = fieldName === "department_id" ? tx.department : tx.designation;
          const target = await model.findFirst({
            where: { id: newId, is_deleted: false },
          });
          if (!target) throw httpError(400, `Target ${fieldName.replace("_id", "")} not found`);
          updateData[fieldName] = newId;
          extraChanges.push({
            fieldName,
            oldValue: employment[fieldName],
            newValue: newId,
          });
        }

        await tx.employment.update({ where: { id }, data: updateData });

        const transfer = await tx.employmentHistory.create({
          data: {
            employment_id: id,
            history_type: "TRANSFER",
            field_name: "location_id",
            old_value:
              employment.location_id === null
                ? null
                : String(employment.location_id),
            new_value: String(toLocationId),
            old_value_label: oldLabel,
            new_value_label: newLabel,
            change_description:
              await employmentHistoryService.generateChangeDescription(
                tx,
                "location_id",
                oldLabel,
                newLabel
              ),
            changed_by: changedByUserId,
            remarks,
            changed_at: effectiveDate,
          },
        });

        const additionalChanges = [];
        for (const change of extraChanges) {
          const changeOldLabel = await employmentHistoryService.getFieldLabel(
            tx,
            change.fieldName,
            change.oldValue
          );
          const changeNewLabel = await employmentHistoryService.getFieldLabel(
            tx,
            change.fieldName,
            change.newValue
          );
          additionalChanges.push(
            await tx.employmentHistory.create({
              data: {
                employment_id: id,
                history_type: employmentHistoryService.categorizeChange(
                  change.fieldName
                ),
                field_name: change.fieldName,
                old_value:
                  change.oldValue === null ? null : String(change.oldValue),
                new_value: String(change.newValue),
                old_value_label: changeOldLabel,
                new_value_label: changeNewLabel,
                change_description:
                  await employmentHistoryService.generateChangeDescription(
                    tx,
                    change.fieldName,
                    changeOldLabel,
                    changeNewLabel
                  ),
                changed_by: changedByUserId,
                remarks,
                changed_at: effectiveDate,
              },
            })
          );
        }

        const updated = await tx.employment.findUnique({
          where: { id },
          include: employmentIncludes,
        });
        return { transfer, additionalChanges, employment: updated };
      }

      // RECORD_ONLY: historical entry, current posting untouched. The "from"
      // is historical and unknowable from current state — never defaulted.
      let fromLocationId = null;
      if (
        payload.from_location_id !== undefined &&
        payload.from_location_id !== null &&
        payload.from_location_id !== ""
      ) {
        fromLocationId = parseId(payload.from_location_id, "previous location");
        const fromLocation = await tx.location.findFirst({
          where: { id: fromLocationId, is_deleted: false },
        });
        if (!fromLocation) throw httpError(400, "Previous location not found");
        if (fromLocationId === toLocationId) {
          throw httpError(400, "Previous and target locations are the same");
        }
      }

      const oldLabel = await employmentHistoryService.getFieldLabel(
        tx,
        "location_id",
        fromLocationId
      );
      const newLabel = await employmentHistoryService.getFieldLabel(
        tx,
        "location_id",
        toLocationId
      );

      const transfer = await tx.employmentHistory.create({
        data: {
          employment_id: id,
          history_type: "TRANSFER",
          field_name: "location_id",
          old_value: fromLocationId === null ? null : String(fromLocationId),
          new_value: String(toLocationId),
          old_value_label: oldLabel,
          new_value_label: newLabel,
          change_description:
            await employmentHistoryService.generateChangeDescription(
              tx,
              "location_id",
              oldLabel,
              newLabel
            ),
          changed_by: changedByUserId,
          remarks,
          changed_at: effectiveDate,
        },
      });

      const current = await tx.employment.findUnique({
        where: { id },
        include: employmentIncludes,
      });
      return { transfer, additionalChanges: [], employment: current };
    });
  },

  /**
   * Transfer history for one employment, with "recorded by" resolved to a
   * display name (EmploymentHistory.changed_by has no Prisma relation).
   */
  async getTransferHistory(employmentId) {
    const id = parseId(employmentId, "employment id");

    const employment = await prisma.employment.findFirst({
      where: { id, is_deleted: false },
      include: employmentIncludes,
    });
    if (!employment) throw httpError(404, "Employment record not found");

    const transfers = await prisma.employmentHistory.findMany({
      where: { employment_id: id, history_type: "TRANSFER" },
      orderBy: [{ changed_at: "desc" }, { id: "desc" }],
    });

    const userIds = [
      ...new Set(transfers.map((t) => t.changed_by).filter((v) => v !== null)),
    ];
    let userMap = new Map();
    if (userIds.length) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          email: true,
          employee: { select: { full_name: true } },
        },
      });
      userMap = new Map(
        users.map((u) => [u.id, u.employee?.full_name || u.email])
      );
    }

    const enriched = transfers.map((t) => ({
      ...t,
      changed_by_label: t.changed_by
        ? userMap.get(t.changed_by) || "Unknown user"
        : "System",
    }));

    return { employment, transfers: enriched, total: enriched.length };
  },
};

module.exports = employmentTransferService;
