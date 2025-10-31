const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { isAuthenticated } = require("../middleware/auth");

// Helper: resolve bazaar Location.id for the logged-in user's current employment
async function resolveBazaarIdForUser(user) {
  try {
    if (!user?.employee_id) return null;
    const emp = await prisma.employment.findFirst({
      where: { employee_id: Number(user.employee_id), is_current: true, is_deleted: false },
      include: { location: { include: { city: true, district: true } } },
    });
    const loc = emp?.location;
    if (!loc) return null;

    // If employment already linked to a bazaar, use it directly
    if (loc.type === 'BAZAAR' && loc.is_active && !loc.is_deleted) {
      return loc.id;
    }

    // Try match by name, then by city_id, then by district_id
    let bazaar = null;
    if (loc.name) {
      bazaar = await prisma.location.findFirst({
        where: {
          type: 'BAZAAR',
          is_deleted: false,
          is_active: true,
          name: loc.name,
        },
      });
    }
    if (!bazaar && loc.city_id) {
      bazaar = await prisma.location.findFirst({
        where: {
          type: 'BAZAAR',
          is_deleted: false,
          is_active: true,
          city_id: loc.city_id,
        },
      });
    }
    if (!bazaar && loc.district_id) {
      bazaar = await prisma.location.findFirst({
        where: {
          type: 'BAZAAR',
          is_deleted: false,
          is_active: true,
          district_id: loc.district_id,
        },
      });
    }

    return bazaar?.id ?? null;
  } catch (e) {
    console.error('Failed to resolve bazaar id for user', e);
    return null;
  }
}

/**
 * Determine if user is a head of department at head quarter (HOD at HQ).
 * This requires user's employments, department with head_employee_id matching user, and location type HQ.
 */
async function isUserHodHQ(user, prisma) {
  if (!user?.employee_id) return false;
  // Find current employments at HQ as HOD
  const empRecs = await prisma.employment.findMany({
    where: {
      employee_id: user.employee_id,
      is_current: true,
      location: { type: 'HEAD_OFFICE' },
    },
    include: { department: true },
  });
  if (!empRecs.length) return false;
  // Must be department head
  const deptIds = empRecs.map(e => e.department_id).filter(Boolean);
  if (!deptIds.length) return false;
  const match = await prisma.department.findFirst({
    where: { id: { in: deptIds }, head_employee_id: user.employee_id }
  });
  return !!match;
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
                    include: { designation: true, role_tag: true }
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
      const { title, valid_from, valid_to, entries } = req.body;
      if (!valid_from || !valid_to) {
        return res.status(400).json({ success: false, error: 'valid_from and valid_to are required' });
      }

      let assigned_location_id = null;
      let assigned_department_id = null;

      // Allow if location_id present and is a bazaar location
      if (user.location_id) {
        const loc = await prisma.location.findUnique({
          where: { id: user.location_id },
          select: { id: true, type: true, is_active: true, is_deleted: true },
        });
        if (loc && loc.type === 'BAZAAR' && loc.is_active && !loc.is_deleted) {
          assigned_location_id = loc.id;
        }
      }

      // Allow if user heads any department; use the first headed department for roster.department_id
      if (user.employee_id && !assigned_department_id) {
        const headedDepts = await prisma.department.findMany({ where: { head_employee_id: user.employee_id } });
        if (headedDepts && headedDepts.length > 0) {
          assigned_department_id = headedDepts[0].id;
        }
      }

      if (!assigned_location_id && !assigned_department_id) {
        return res.status(403).json({ success: false, error: 'Only a bazaar/location-based user or a head of department can create a roster.' });
      }

      // Validate entries format
      const normalizedEntries = (entries || []).map((e) => ({
        employee_id: Number(e.employee_id),
        day_schedules: e.day_schedules || {},
        remarks: e.remarks || null,
      }));
      const created = await prisma.dutyRoster.create({
        data: {
          title: title || null,
          bazaar_id: assigned_location_id,
          department_id: assigned_department_id,
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

      // Guard: If roster is APPROVED, only authorized system users (not the creator) may modify; Super Admin exempt
      if (roster.status === 'APPROVED') {
        const user = req.session.user;
        const isSuperAdmin = user?.role?.name === 'Super Admin';
        if (!isSuperAdmin) {
          const isSystemUser = user?.role?.type === 'system';
          const perms = user?.permissions || [];
          const hasPermission = perms.includes('*') || perms.includes('roster.status');
          const isCreator = roster.created_by_user_id === user?.id;
          if (!isSystemUser || !hasPermission || isCreator) {
            return res.status(403).json({ success: false, error: 'Approved rosters can only be modified by authorized system users (creator cannot modify).' });
          }
        }
      }

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

      // Load roster to enforce approved guard
      const roster = await prisma.dutyRoster.findUnique({ where: { id } });
      if (!roster) return res.status(404).json({ success: false, error: 'Roster not found' });

      if (roster.status === 'APPROVED') {
        const user = req.session.user;
        const isSuperAdmin = user?.role?.name === 'Super Admin';
        if (!isSuperAdmin) {
          const isSystemUser = user?.role?.type === 'system';
          const perms = user?.permissions || [];
          const hasPermission = perms.includes('*') || perms.includes('roster.status');
          const isCreator = roster.created_by_user_id === user?.id;
          if (!isSystemUser || !hasPermission || isCreator) {
            return res.status(403).json({ success: false, error: 'Approved rosters can only be deleted by authorized system users (creator cannot delete).' });
          }
        }
      }

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
      const employeesSet = new Map();
      const prisma = require('@prisma/client').PrismaClient ? new (require('@prisma/client').PrismaClient)() : req.app?.locals?.prisma;

      let isLocationUser = false;
      let isHod = false;

      // If user.location_id points to an active bazaar
      if (user.location_id) {
        const loc = await prisma.location.findUnique({
          where: { id: user.location_id },
          select: { id: true, type: true, is_active: true, is_deleted: true },
        });
        if (loc && loc.type === 'BAZAAR' && loc.is_active && !loc.is_deleted) {
          isLocationUser = true;
          const employments = await prisma.employment.findMany({
            where: { 
              is_current: true, 
              is_deleted: false, 
              location_id: loc.id,
              employee: { is_deleted: false, status: 'Active' },
            },
            include: { employee: true, designation: true, role_tag: true }
          });
          for (const r of employments) {
            employeesSet.set(r.employee.id, {
              id: r.employee.id,
              full_name: r.employee.full_name,
              designation: r.designation?.title || null,
              cnic: r.employee.cnic || null,
              mobile_number: r.employee.mobile_number || null,
              role_tag_id: r.role_tag?.id || null,
              role_tag_name: r.role_tag?.name || 'Unassigned',
            });
          }
        }
      }

      // If user is HOD of any department, include all employees in those departments (and HOD too)
      if (user.employee_id) {
        const headedDepts = await prisma.department.findMany({ where: { head_employee_id: user.employee_id } });
        if (headedDepts && headedDepts.length > 0) {
          isHod = true;
          const deptIds = headedDepts.map(d => d.id);
          const employments = await prisma.employment.findMany({
            where: { 
              is_current: true, 
              is_deleted: false, 
              department_id: { in: deptIds },
              employee: { is_deleted: false, status: 'Active' },
            },
            include: { employee: true, designation: true, role_tag: true }
          });
          for (const r of employments) {
            employeesSet.set(r.employee.id, {
              id: r.employee.id,
              full_name: r.employee.full_name,
              designation: r.designation?.title || null,
              cnic: r.employee.cnic || null,
              mobile_number: r.employee.mobile_number || null,
              role_tag_id: r.role_tag?.id || null,
              role_tag_name: r.role_tag?.name || 'Unassigned',
            });
          }
        }
      }

      if (!isLocationUser && !isHod) {
        return res.status(403).json({ success: false, error: 'Only a bazaar/location-based user or a head of department can view employees for roster.' });
      }
      const employees = Array.from(employeesSet.values());
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
      const [rawBazaars, defaultBazaarId] = await Promise.all([
        prisma.location.findMany({
          where: { type: 'BAZAAR', is_active: true, is_deleted: false },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, city: { select: { name: true } }, district: { select: { name: true } } },
        }),
        Promise.resolve(managedLocationId)
      ]);
      const bazaars = rawBazaars.map(b => ({ id: b.id, name: b.name, city: b.city?.name || null, district: b.district?.name || null }));
      res.json({ success: true, bazaars, defaultBazaarId });
    } catch (e) {
      console.error('Error fetching bazaars for roster', e);
      res.status(500).json({ success: false, error: 'Failed to fetch bazaars' });
    }
  },

  async approve(req, res) {
    try {
      const user = req.session.user;
      const perms = user?.permissions || [];
      const canChangeStatus = perms.includes('*') || perms.includes('roster.status.change');
      if (!canChangeStatus) {
        return res.status(403).json({ success: false, error: 'You do not have permission to approve rosters' });
      }

      const id = Number(req.params.id);
      const roster = await prisma.dutyRoster.findUnique({ where: { id } });
      if (!roster || roster.is_deleted) return res.status(404).json({ success: false, error: 'Roster not found' });

      const updated = await prisma.dutyRoster.update({
        where: { id },
        data: { status: 'APPROVED' },
        include: { location: true, createdBy: true }
      });
      res.json({ success: true, roster: updated });
    } catch (e) {
      console.error('Error approving roster', e);
      res.status(500).json({ success: false, error: 'Failed to approve roster' });
    }
  },

  async reject(req, res) {
    try {
      const user = req.session.user;
      const perms = user?.permissions || [];
      const canChangeStatus = perms.includes('*') || perms.includes('roster.status.change');
      if (!canChangeStatus) {
        return res.status(403).json({ success: false, error: 'You do not have permission to reject rosters' });
      }

      const id = Number(req.params.id);
      const roster = await prisma.dutyRoster.findUnique({ where: { id } });
      if (!roster || roster.is_deleted) return res.status(404).json({ success: false, error: 'Roster not found' });

      const updated = await prisma.dutyRoster.update({
        where: { id },
        data: { status: 'REJECTED' },
        include: { location: true, createdBy: true }
      });
      res.json({ success: true, roster: updated });
    } catch (e) {
      console.error('Error rejecting roster', e);
      res.status(500).json({ success: false, error: 'Failed to reject roster' });
    }
  },

  async setStatus(req, res) {
    try {
      const user = req.session.user;
      const perms = user?.permissions || [];
      const canChangeStatus = perms.includes('*') || perms.includes('roster.status.change');
      if (!canChangeStatus) {
        return res.status(403).json({ success: false, error: 'You do not have permission to change roster status' });
      }

      const id = Number(req.params.id);
      const { status } = req.body || {};
      const allowed = ['PENDING', 'APPROVED', 'REJECTED'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status value' });
      }

      const roster = await prisma.dutyRoster.findUnique({ where: { id } });
      if (!roster || roster.is_deleted) return res.status(404).json({ success: false, error: 'Roster not found' });

      const updated = await prisma.dutyRoster.update({
        where: { id },
        data: { status },
        include: { location: true, createdBy: true }
      });
      res.json({ success: true, roster: updated });
    } catch (e) {
      console.error('Error changing roster status', e);
      res.status(500).json({ success: false, error: 'Failed to change status' });
    }
  },
};

module.exports = rosterController;
