const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Regional Incharge module.
//
// A Regional Incharge is an employee who oversees a set of bazaars as an
// additional duty — they stay posted at their own bazaar. One incharge per
// bazaar; an incharge holds many. The link is Location.regional_incharge_id, so
// coverage can be edited from either side: pick the bazaars for an incharge,
// or set the incharge on a bazaar.
//
// Used by: leave (the incharge recommends leave for his bazaars).
// NOT used by: duty roster approval — bazaar rosters go straight to Operations.

const inchargeInclude = {
  employee: {
    select: {
      id: true,
      full_name: true,
      cnic: true,
      mobile_number: true,
      employmentRecords: {
        where: { is_current: true, is_deleted: false },
        select: {
          designation: { select: { title: true } },
          location: { select: { id: true, name: true } },
        },
      },
    },
  },
  _count: { select: { locations: true } },
};

// Flatten the current employment so the UI doesn't dig through arrays
function shape(row) {
  const employment = row.employee?.employmentRecords?.[0] || null;
  return {
    id: row.id,
    region_name: row.region_name,
    contact_number: row.contact_number,
    notes: row.notes,
    is_active: row.is_active,
    bazaar_count: row._count?.locations ?? 0,
    employee: row.employee
      ? {
          id: row.employee.id,
          full_name: row.employee.full_name,
          cnic: row.employee.cnic,
          mobile_number: row.employee.mobile_number,
          designation: employment?.designation?.title || null,
          posted_at: employment?.location?.name || null,
        }
      : null,
    locations: row.locations || undefined,
  };
}

function cleanName(value) {
  const name = String(value ?? "").trim();
  return name.length ? name : null;
}

const regionalInchargeController = {
  // GET /regional-incharges — the module's list screen
  async list(req, res) {
    try {
      const where = { is_deleted: false };
      if (req.query.active === "true") where.is_active = true;
      if (req.query.active === "false") where.is_active = false;

      const search = String(req.query.search || "").trim();
      if (search) {
        where.OR = [
          { region_name: { contains: search, mode: "insensitive" } },
          { employee: { full_name: { contains: search, mode: "insensitive" } } },
          { contact_number: { contains: search } },
        ];
      }

      const rows = await prisma.regionalIncharge.findMany({
        where,
        include: inchargeInclude,
        orderBy: { region_name: "asc" },
      });

      // Bazaars with nobody looking after them — the gap worth surfacing
      const unassigned = await prisma.location.count({
        where: {
          is_deleted: false,
          is_active: true,
          type: { not: "HEAD_OFFICE" },
          regional_incharge_id: null,
        },
      });

      res.json({
        success: true,
        total: rows.length,
        unassigned_bazaars: unassigned,
        incharges: rows.map(shape),
      });
    } catch (e) {
      console.error("Error listing regional incharges", e);
      res.status(500).json({ success: false, error: "Failed to list regional incharges" });
    }
  },

  // GET /regional-incharges/:id — one region with its bazaars
  async getById(req, res) {
    try {
      const id = Number(req.params.id);
      const row = await prisma.regionalIncharge.findFirst({
        where: { id, is_deleted: false },
        include: {
          ...inchargeInclude,
          locations: {
            select: { id: true, name: true, type: true, is_active: true },
            orderBy: { name: "asc" },
          },
        },
      });
      if (!row) return res.status(404).json({ success: false, error: "Regional incharge not found" });
      res.json({ success: true, incharge: shape(row) });
    } catch (e) {
      console.error("Error fetching regional incharge", e);
      res.status(500).json({ success: false, error: "Failed to fetch regional incharge" });
    }
  },

  // POST /regional-incharges
  async create(req, res) {
    try {
      const employeeId = Number(req.body?.employee_id);
      const regionName = cleanName(req.body?.region_name);
      if (!Number.isInteger(employeeId) || !regionName) {
        return res
          .status(400)
          .json({ success: false, error: "employee_id and region_name are required." });
      }

      const employee = await prisma.employee.findFirst({
        where: { id: employeeId, is_deleted: false },
        select: { id: true, mobile_number: true },
      });
      if (!employee) return res.status(404).json({ success: false, error: "Employee not found." });

      const clash = await prisma.regionalIncharge.findFirst({
        where: {
          is_deleted: false,
          OR: [{ employee_id: employeeId }, { region_name: { equals: regionName, mode: "insensitive" } }],
        },
        select: { id: true, region_name: true, employee_id: true },
      });
      if (clash) {
        return res.status(409).json({
          success: false,
          error:
            clash.employee_id === employeeId
              ? `That employee already holds the region "${clash.region_name}".`
              : `A region named "${clash.region_name}" already exists.`,
        });
      }

      const created = await prisma.regionalIncharge.create({
        data: {
          employee_id: employeeId,
          region_name: regionName,
          contact_number: cleanName(req.body?.contact_number) || employee.mobile_number || null,
          notes: cleanName(req.body?.notes),
        },
        include: inchargeInclude,
      });
      res.status(201).json({ success: true, incharge: shape(created) });
    } catch (e) {
      console.error("Error creating regional incharge", e);
      res.status(500).json({ success: false, error: "Failed to create regional incharge" });
    }
  },

  // PUT /regional-incharges/:id — rename a region, hand it to a successor,
  // change contact, or deactivate it
  async update(req, res) {
    try {
      const id = Number(req.params.id);
      const row = await prisma.regionalIncharge.findFirst({
        where: { id, is_deleted: false },
        select: { id: true },
      });
      if (!row) return res.status(404).json({ success: false, error: "Regional incharge not found" });

      const data = {};
      if (req.body?.region_name !== undefined) {
        const regionName = cleanName(req.body.region_name);
        if (!regionName) {
          return res.status(400).json({ success: false, error: "region_name cannot be empty." });
        }
        const clash = await prisma.regionalIncharge.findFirst({
          where: {
            is_deleted: false,
            id: { not: id },
            region_name: { equals: regionName, mode: "insensitive" },
          },
          select: { id: true },
        });
        if (clash) {
          return res.status(409).json({ success: false, error: `A region named "${regionName}" already exists.` });
        }
        data.region_name = regionName;
      }
      if (req.body?.employee_id !== undefined) {
        const employeeId = Number(req.body.employee_id);
        if (!Number.isInteger(employeeId)) {
          return res.status(400).json({ success: false, error: "Invalid employee_id." });
        }
        const employee = await prisma.employee.findFirst({
          where: { id: employeeId, is_deleted: false },
          select: { id: true },
        });
        if (!employee) return res.status(404).json({ success: false, error: "Employee not found." });
        const clash = await prisma.regionalIncharge.findFirst({
          where: { is_deleted: false, id: { not: id }, employee_id: employeeId },
          select: { region_name: true },
        });
        if (clash) {
          return res.status(409).json({
            success: false,
            error: `That employee already holds the region "${clash.region_name}".`,
          });
        }
        data.employee_id = employeeId;
      }
      if (req.body?.contact_number !== undefined) data.contact_number = cleanName(req.body.contact_number);
      if (req.body?.notes !== undefined) data.notes = cleanName(req.body.notes);
      if (req.body?.is_active !== undefined) data.is_active = !!req.body.is_active;

      const updated = await prisma.regionalIncharge.update({
        where: { id },
        data,
        include: inchargeInclude,
      });
      res.json({ success: true, incharge: shape(updated) });
    } catch (e) {
      console.error("Error updating regional incharge", e);
      res.status(500).json({ success: false, error: "Failed to update regional incharge" });
    }
  },

  // PUT /regional-incharges/:id/bazaars — declarative: this incharge holds
  // exactly the bazaars in the body. Bazaars held by someone else move over.
  async setBazaars(req, res) {
    try {
      const id = Number(req.params.id);
      const row = await prisma.regionalIncharge.findFirst({
        where: { id, is_deleted: false },
        select: { id: true, region_name: true },
      });
      if (!row) return res.status(404).json({ success: false, error: "Regional incharge not found" });

      const ids = [...new Set((req.body?.location_ids || []).map(Number).filter(Number.isInteger))];
      const valid = await prisma.location.findMany({
        where: { id: { in: ids }, is_deleted: false, type: { not: "HEAD_OFFICE" } },
        select: { id: true },
      });
      const validIds = valid.map((l) => l.id);
      if (validIds.length !== ids.length) {
        return res.status(400).json({
          success: false,
          error: "One or more bazaars were not found (head office cannot have a regional incharge).",
        });
      }

      const moved = await prisma.$transaction(async (tx) => {
        // Which of these are being taken from another incharge — reported back
        // so the UI can say so plainly rather than silently reassigning.
        const takenFrom = await tx.location.findMany({
          where: {
            id: { in: validIds },
            regional_incharge_id: { not: null, notIn: [id] },
          },
          select: { name: true, regionalIncharge: { select: { region_name: true } } },
        });
        await tx.location.updateMany({
          where: { regional_incharge_id: id, id: { notIn: validIds } },
          data: { regional_incharge_id: null },
        });
        if (validIds.length) {
          await tx.location.updateMany({
            where: { id: { in: validIds } },
            data: { regional_incharge_id: id },
          });
        }
        return takenFrom;
      });

      res.json({
        success: true,
        region_name: row.region_name,
        count: validIds.length,
        moved_from_other_regions: moved.map((m) => ({
          bazaar: m.name,
          previous_region: m.regionalIncharge?.region_name || null,
        })),
      });
    } catch (e) {
      console.error("Error setting bazaars for regional incharge", e);
      res.status(500).json({ success: false, error: "Failed to update bazaars" });
    }
  },

  // PATCH /regional-incharges/bazaar/:locationId — the other direction: set (or
  // clear, with null) the incharge on a single bazaar
  async setBazaarIncharge(req, res) {
    try {
      const locationId = Number(req.params.locationId);
      const location = await prisma.location.findFirst({
        where: { id: locationId, is_deleted: false },
        select: { id: true, name: true, type: true },
      });
      if (!location) return res.status(404).json({ success: false, error: "Bazaar not found" });
      if (location.type === "HEAD_OFFICE") {
        return res
          .status(400)
          .json({ success: false, error: "Head office does not have a regional incharge." });
      }

      const raw = req.body?.regional_incharge_id;
      let inchargeId = null;
      if (raw !== null && raw !== undefined && raw !== "") {
        inchargeId = Number(raw);
        const incharge = await prisma.regionalIncharge.findFirst({
          where: { id: inchargeId, is_deleted: false },
          select: { id: true },
        });
        if (!incharge) return res.status(404).json({ success: false, error: "Regional incharge not found" });
      }

      const updated = await prisma.location.update({
        where: { id: locationId },
        data: { regional_incharge_id: inchargeId },
        select: {
          id: true,
          name: true,
          regionalIncharge: {
            select: { id: true, region_name: true, employee: { select: { full_name: true } } },
          },
        },
      });
      res.json({ success: true, location: updated });
    } catch (e) {
      console.error("Error setting bazaar regional incharge", e);
      res.status(500).json({ success: false, error: "Failed to update bazaar" });
    }
  },

  // DELETE /regional-incharges/:id — soft delete; bazaars are released, not lost
  async remove(req, res) {
    try {
      const id = Number(req.params.id);
      const row = await prisma.regionalIncharge.findFirst({
        where: { id, is_deleted: false },
        select: { id: true, region_name: true, _count: { select: { locations: true } } },
      });
      if (!row) return res.status(404).json({ success: false, error: "Regional incharge not found" });

      const released = row._count.locations;
      await prisma.$transaction([
        prisma.location.updateMany({
          where: { regional_incharge_id: id },
          data: { regional_incharge_id: null },
        }),
        prisma.regionalIncharge.update({
          where: { id },
          data: { is_deleted: true, is_active: false },
        }),
      ]);
      res.json({
        success: true,
        message: `Removed ${row.region_name}. ${released} bazaar(s) now have no regional incharge.`,
        released,
      });
    } catch (e) {
      console.error("Error deleting regional incharge", e);
      res.status(500).json({ success: false, error: "Failed to delete regional incharge" });
    }
  },

  // GET /regional-incharges/helpers/bazaars — every bazaar with its current
  // incharge, for the assignment screens and the "unassigned" gap list
  async bazaars(req, res) {
    try {
      const locations = await prisma.location.findMany({
        where: { is_deleted: false, type: { not: "HEAD_OFFICE" } },
        select: {
          id: true,
          name: true,
          type: true,
          is_active: true,
          district: { select: { name: true } },
          regional_incharge_id: true,
          regionalIncharge: {
            select: { id: true, region_name: true, employee: { select: { full_name: true } } },
          },
        },
        orderBy: { name: "asc" },
      });
      res.json({ success: true, total: locations.length, bazaars: locations });
    } catch (e) {
      console.error("Error listing bazaars", e);
      res.status(500).json({ success: false, error: "Failed to list bazaars" });
    }
  },
};

module.exports = regionalInchargeController;
