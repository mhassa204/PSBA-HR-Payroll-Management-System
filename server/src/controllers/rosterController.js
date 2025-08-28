const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { isAuthenticated } = require("../middleware/auth");

// Helper: resolve bazaar Location.id for the logged-in user's current employment
async function resolveBazaarIdForUser(user) {
  try {
    if (!user?.employee_id) return null;
    const emp = await prisma.employment.findFirst({
      where: { employee_id: Number(user.employee_id), is_current: true, is_deleted: false },
      include: { location: true },
    });
    const loc = emp?.location;
    if (!loc) return null;

    // Try match by bazaar_name, then by city, then by district
    let bazaar = null;
    if (loc.bazaar_name) {
      bazaar = await prisma.location.findFirst({
        where: {
          type: 'BAZAAR',
          is_deleted: false,
          is_active: true,
          name: loc.bazaar_name,
        },
      });
    }
    if (!bazaar && loc.city) {
      bazaar = await prisma.location.findFirst({
        where: {
          type: 'BAZAAR',
          is_deleted: false,
          is_active: true,
          city: loc.city,
        },
      });
    }
    if (!bazaar && loc.district) {
      bazaar = await prisma.location.findFirst({
        where: {
          type: 'BAZAAR',
          is_deleted: false,
          is_active: true,
          district: loc.district,
        },
      });
    }

    return bazaar?.id ?? null;
  } catch (e) {
    console.error('Failed to resolve bazaar id for user', e);
    return null;
  }
}

// New: get the first active location managed by this user
async function getManagedLocationId(user) {
  if (!user?.id) return null;
  const loc = await prisma.location.findFirst({
    where: { manager_user_id: user.id, is_active: true, is_deleted: false },
    orderBy: { id: 'asc' },
    select: { id: true }
  });
  return loc?.id || null;
}

const rosterController = {
  // List rosters visible to the logged-in user (created by self or within same bazaar if manager)
  async list(req, res) {
    try {
      const user = req.session.user;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const where = { is_deleted: false };
      // Optional filters
      if (req.query.bazaar_id) where.bazaar_id = parseInt(req.query.bazaar_id);
      if (req.query.active === 'true') {
        const now = new Date();
        where.valid_from = { lte: now };
        where.valid_to = { gte: now };
      }

      const [total, rosters] = await Promise.all([
        prisma.dutyRoster.count({ where }),
        prisma.dutyRoster.findMany({
          where,
          include: {
            createdBy: true,
            location: true,
            _count: { select: { entries: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        })
      ]);

      res.json({ success: true, page, limit, total, rosters });
    } catch (e) {
      console.error('Error listing rosters', e);
      res.status(500).json({ success: false, error: 'Failed to list rosters' });
    }
  },

  // Get one roster with entries
  async getById(req, res) {
    try {
      const id = parseInt(req.params.id);
      const roster = await prisma.dutyRoster.findUnique({
        where: { id },
        include: {
          location: true,
          createdBy: true,
          entries: {
            include: {
              employee: {
                include: {
                  employmentRecords: {
                    where: { is_current: true, is_deleted: false },
                    include: { designation: true }
                  }
                }
              }
            }
          }
        }
      });
      if (!roster) return res.status(404).json({ success: false, error: 'Roster not found' });
      res.json({ success: true, roster });
    } catch (e) {
      console.error('Error fetching roster', e);
      res.status(500).json({ success: false, error: 'Failed to fetch roster' });
    }
  },

  // Create roster with entries - only managers can create, and location is auto-assigned
  async create(req, res) {
    try {
      const user = req.session.user;
      const { title, valid_from, valid_to, entries } = req.body; // ignore any bazaar_id from client

      if (!valid_from || !valid_to) {
        return res.status(400).json({ success: false, error: 'valid_from and valid_to are required' });
      }

      const managedLocationId = await getManagedLocationId(user);
      if (!managedLocationId) {
        return res.status(403).json({ success: false, error: 'Only a manager of a location can create a roster' });
      }

      // Validate entries format (weekly_off_days removed)
      const normalizedEntries = (entries || []).map((e) => ({
        employee_id: Number(e.employee_id),
        day_schedules: e.day_schedules || {},
        remarks: e.remarks || null,
      }));

      const created = await prisma.dutyRoster.create({
        data: {
          title: title || null,
          bazaar_id: managedLocationId,
          valid_from: new Date(valid_from),
          valid_to: new Date(valid_to),
          created_by_user_id: user.id,
          entries: {
            create: normalizedEntries
          }
        },
        include: {
          location: true,
          createdBy: true,
          entries: true,
        }
      });

      res.status(201).json({ success: true, roster: created });
    } catch (e) {
      console.error('Error creating roster', e);
      res.status(500).json({ success: false, error: 'Failed to create roster' });
    }
  },

  // Update roster and its entries (replace strategy)
  async update(req, res) {
    try {
      const id = Number(req.params.id);
      const { title, bazaar_id, valid_from, valid_to, entries } = req.body;

      const roster = await prisma.dutyRoster.findUnique({ where: { id } });
      if (!roster) return res.status(404).json({ success: false, error: 'Roster not found' });

      // Delete old entries first
      await prisma.dutyRosterEntry.deleteMany({ where: { roster_id: id } });

      const normalizedEntries = (entries || []).map((e) => ({
        employee_id: Number(e.employee_id),
        day_schedules: e.day_schedules || {},
        remarks: e.remarks || null,
      }));

      // Determine bazaar id for update: preserve if undefined, else use provided (or resolve if nullish)
      let nextBazaarId;
      if (bazaar_id === undefined) {
        nextBazaarId = roster.bazaar_id;
      } else if (bazaar_id) {
        nextBazaarId = Number(bazaar_id);
      } else {
        // explicitly null/empty: try resolve from user, can still be null
        nextBazaarId = await resolveBazaarIdForUser(req.session.user);
      }

      // Update roster basic fields and recreate entries via nested create
      const updated = await prisma.dutyRoster.update({
        where: { id },
        data: {
          title: title ?? roster.title,
          bazaar_id: nextBazaarId,
          valid_from: valid_from ? new Date(valid_from) : roster.valid_from,
          valid_to: valid_to ? new Date(valid_to) : roster.valid_to,
          updatedAt: new Date(),
          entries: { create: normalizedEntries }
        },
        include: {
          location: true,
          createdBy: true,
          entries: true,
        }
      });

      res.json({ success: true, roster: updated });
    } catch (e) {
      console.error('Error updating roster', e);
      res.status(500).json({ success: false, error: 'Failed to update roster' });
    }
  },

  async remove(req, res) {
    try {
      const id = Number(req.params.id);
      await prisma.dutyRoster.update({ where: { id }, data: { is_deleted: true } });
      res.json({ success: true, message: 'Roster deleted' });
    } catch (e) {
      console.error('Error deleting roster', e);
      res.status(500).json({ success: false, error: 'Failed to delete roster' });
    }
  },

  // Fetch employees whose latest employment's reporting_officer_id === logged-in user's employee id
  async employeesForLoggedInOfficer(req, res) {
    try {
      const user = req.session.user;

      // Must be a manager of some location
      const managedLocationId = await getManagedLocationId(user);
      if (!managedLocationId) {
        return res.status(403).json({ success: false, error: 'Only a manager of a location can create roster' });
      }

      if (!user?.employee_id) {
        return res.status(400).json({ success: false, error: 'Logged in user not linked to an employee record' });
      }

      // Find latest employment per employee, filter by reporting_officer_id
      const result = await prisma.employment.findMany({
        where: {
          is_deleted: false,
          reporting_officer_id: String(user.employee_id),
          is_current: true,
          employee: { is_deleted: false, status: 'Active' },
        },
        include: {
          employee: true,
          designation: true,
        }
      });

      const employees = result.map((r) => ({
        id: r.employee.id,
        full_name: r.employee.full_name,
        designation: r.designation?.title || null,
        cnic: r.employee.cnic || null,
        mobile_number: r.employee.mobile_number || null,
      }));

      res.json({ success: true, employees });
    } catch (e) {
      console.error('Error fetching officer employees', e);
      res.status(500).json({ success: false, error: 'Failed to fetch employees' });
    }
  },

  async bazaarsForRoster(req, res) {
    try {
      const user = req.session.user;
      const managedLocationId = await getManagedLocationId(user);
      if (!managedLocationId) {
        return res.status(403).json({ success: false, error: 'Only a manager of a location can create roster' });
      }
      const [bazaars, defaultBazaarId] = await Promise.all([
        prisma.location.findMany({
          where: { type: 'BAZAAR', is_active: true, is_deleted: false },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, city: true, district: true },
        }),
        Promise.resolve(managedLocationId)
      ]);
      res.json({ success: true, bazaars, defaultBazaarId });
    } catch (e) {
      console.error('Error fetching bazaars for roster', e);
      res.status(500).json({ success: false, error: 'Failed to fetch bazaars' });
    }
  },
};

module.exports = rosterController;
