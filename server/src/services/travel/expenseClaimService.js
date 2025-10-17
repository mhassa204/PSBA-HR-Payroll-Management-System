const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const withinLastNDays = (date, days) => {
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= days;
};

async function getEmployeeScaleGrade(employeeId) {
  const emp = await prisma.employment.findFirst({
    where: { employee_id: employeeId, is_current: true },
    include: { scale_grade: true },
  });
  return emp?.scale_grade_id
    ? { id: emp.scale_grade_id, grade: emp.scale_grade }
    : null;
}
async function getRatesForEmployee(employeeId) {
  const sg = await getEmployeeScaleGrade(employeeId);
  if (!sg) return { rate_per_km: 0, per_diem_rate: 0 };
  const rate = await prisma.travelRate.findFirst({
    where: { scale_grade_id: sg.id, is_active: true },
  });
  return {
    rate_per_km: rate?.rate_per_km || 0,
    per_diem_rate: rate?.per_diem_rate || 0,
  };
}

module.exports = {
  getAuthContext: async (req) => {
    const employee_id = Number(req.session.user?.employee_id);
    const isSuperAdmin =
      req.session.user?.role?.name === "Super Admin" ||
      (req.session.user?.permissions || []).includes("*");
    const roleName = req.session.user?.role?.name || "";
    // Derive deptName similarly to travel request service for department-type users
    let deptName = "";
    if (req.session.user?.department_id) {
      try {
        const { PrismaClient } = require("@prisma/client");
        const p = new PrismaClient();
        const dept = await p.department.findFirst({
          where: {
            id: Number(req.session.user.department_id),
            is_deleted: false,
          },
        });
        deptName = dept?.name || "";
        await p.$disconnect();
      } catch (_) {}
    }
    return { employee_id, isSuperAdmin, roleName, deptName };
  },
  listEligibleRequests: async (employee_id, userEmail) => {
    // Fetch approved TADA requests either for the applicant (employee_id) OR
    // created by the logged-in email (from CREATED status entry actor or remarks)
    const orFilters = [];
    if (employee_id) {
      orFilters.push({ applicant_id: Number(employee_id) });
    }
    if (userEmail) {
      const email = String(userEmail);
      orFilters.push({
        statusEntries: {
          some: {
            action: "CREATED",
            OR: [
              {
                actor: {
                  user: {
                    is: { email: { equals: email, mode: "insensitive" } },
                  },
                },
              },
              { remarks: { contains: email, mode: "insensitive" } },
            ],
          },
        },
      });
    }
    if (orFilters.length === 0) return [];

    return prisma.travelRequest.findMany({
      where: {
        is_deleted: false,
        status: "APPROVED",
        OR: orFilters,
      },
      orderBy: { createdAt: "desc" },
      include: {
        attendees: { include: { employee: true } },
        claims: true,
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: { actor: { include: { user: true } } },
        },
        applicant: true,
      },
    });
  },
  listClaims: async (employee_id, isSuperAdmin) => {
    if (!employee_id) return [];
    const claims = await prisma.travelClaim.findMany({
      where: {
        is_deleted: false,
        ...(isSuperAdmin
          ? {}
          : {
              OR: [
                { employee_id },
                { request: { applicant_id: employee_id } },
                // New: allow reporting officer to view their reportees' claims (within-city as well)
                {
                  employee: {
                    employmentRecords: {
                      some: {
                        is_current: true,
                        is_deleted: false,
                        reporting_officer_id: String(employee_id),
                      },
                    },
                  },
                },
              ],
            }),
      },
      include: {
        documents: true,
        segments: true,
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: { designation: true, department: true, location: true },
            },
          },
        },
        request: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return claims;
  },
  // New: Department account listing — show claims for employees in the department
  listClaimsForDepartment: async (department_id) => {
    if (!department_id) return [];
    return prisma.travelClaim.findMany({
      where: {
        is_deleted: false,
        employee: {
          employmentRecords: {
            some: {
              is_current: true,
              is_deleted: false,
              department_id: Number(department_id),
            },
          },
        },
      },
      include: {
        documents: true,
        segments: true,
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: { designation: true, department: true, location: true },
            },
          },
        },
        request: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },
  createClaim: async (employee_id, data) => {
    // Support two modes:
    // 1) Request-linked (existing)
    // 2) Within-city (no travel_request_id) for a reportee of the current user; multiple allowed
    if (!data.employee_id) throw new Error("employee_id required");
    const attendeeEmpId = Number(data.employee_id);

    if (data.travel_request_id) {
      // ...existing request-linked creation path...
      const request = await prisma.travelRequest.findUnique({
        where: { id: Number(data.travel_request_id) },
        include: { attendees: true },
      });
      if (!request || request.applicant_id !== employee_id)
        throw new Error("Forbidden");
      if (request.status !== "APPROVED")
        throw new Error("Request not approved");
      const isAttendee = request.attendees.some(
        (a) => a.employee_id === attendeeEmpId
      );
      if (!isAttendee) throw new Error("Employee not attendee");
      const existing = await prisma.travelClaim.findFirst({
        where: {
          travel_request_id: request.id,
          employee_id: attendeeEmpId,
          is_deleted: false,
        },
      });
      if (existing) throw new Error("Claim already exists");
      const rates = await getRatesForEmployee(attendeeEmpId);
      const created = await prisma.travelClaim.create({
        data: {
          travel_request_id: request.id,
          employee_id: attendeeEmpId,
          from_date: request.departure_date,
          to_date: request.expected_return_date,
          per_diem_days: 0,
          rate_per_km: rates.rate_per_km,
          per_diem_rate: rates.per_diem_rate,
          toll_tax_total: 0,
          transport_mode: "OWN",
          fuel_total: 0,
          fare_total: 0,
        },
      });
      return prisma.travelClaim.findUnique({
        where: { id: created.id },
        include: {
          documents: true,
          segments: true,
          request: true,
          employee: {
            include: {
              employmentRecords: {
                where: { is_current: true, is_deleted: false },
                include: {
                  location: true,
                  designation: true,
                  department: true,
                },
              },
            },
          },
        },
      });
    }

    // New: Within-city creation (no travel request)
    // Validate that the selected employee is either self or reports to the current user
    if (attendeeEmpId !== employee_id) {
      const reporteeEmployment = await prisma.employment.findFirst({
        where: {
          employee_id: attendeeEmpId,
          is_current: true,
          is_deleted: false,
          reporting_officer_id: String(employee_id),
        },
        include: { location: true },
      });
      if (!reporteeEmployment) throw new Error("Employee is not your reportee");
    }
    const rates = await getRatesForEmployee(attendeeEmpId);
    const created = await prisma.travelClaim.create({
      data: {
        travel_request_id: null,
        employee_id: attendeeEmpId,
        from_date: null,
        to_date: null,
        per_diem_days: 0,
        rate_per_km: rates.rate_per_km,
        per_diem_rate: rates.per_diem_rate,
        toll_tax_total: 0,
        transport_mode: "OWN",
        fuel_total: 0,
        fare_total: 0,
      },
    });
    return prisma.travelClaim.findUnique({
      where: { id: created.id },
      include: {
        documents: true,
        segments: true,
        request: true,
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: { location: true, designation: true, department: true },
            },
          },
        },
      },
    });
  },
  _canAccess(claim, employee_id, isSuperAdmin) {
    if (isSuperAdmin) return true;
    if (!claim) return false;
    if (claim.employee_id === employee_id) return true;
    if (claim.request && claim.request.applicant_id === employee_id)
      return true;
    // New: reporting officer of the employee can access
    if (claim.employee && claim.employee.employmentRecords) {
      const isRO = claim.employee.employmentRecords.some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          String(er.reporting_officer_id || "") === String(employee_id)
      );
      if (isRO) return true;
    }
    return false;
  },
  getClaim: async (id, employee_id, isSuperAdmin, department_id) => {
    const parsedId = Number(id);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw new Error("Invalid claim id");
    }
    const claim = await prisma.travelClaim.findUnique({
      where: { id: parsedId },
      include: {
        documents: true,
        segments: true,
        // Enrich request so PDF export has attendees and request status history
        request: {
          include: {
            attendees: { include: { employee: true } },
            statusEntries: {
              orderBy: { createdAt: "asc" },
              include: { actor: { include: { user: true } } },
            },
          },
        },
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: { location: true, designation: true, department: true },
            },
          },
        },
        // Include claim status history for PDF export parity with single-claim view
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: { actor: { include: { user: true } } },
        },
      },
    });
    if (!claim || claim.is_deleted) return null;
    let allowed = module.exports._canAccess(claim, employee_id, isSuperAdmin);
    if (!allowed && !employee_id && department_id) {
      allowed = (claim.employee?.employmentRecords || []).some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          Number(er.department_id) === Number(department_id)
      );
    }
    if (!allowed) throw new Error("Forbidden");
    // If draft and rates missing/zero, pull latest rates
    if (
      claim.status === "DRAFT" &&
      (!claim.rate_per_km || !claim.per_diem_rate)
    ) {
      const rates = await getRatesForEmployee(claim.employee_id);
      const upd = await prisma.travelClaim.update({
        where: { id: claim.id },
        data: {
          rate_per_km: rates.rate_per_km,
          per_diem_rate: rates.per_diem_rate,
        },
      });
      return prisma.travelClaim.findUnique({
        where: { id: upd.id },
        include: {
          documents: true,
          segments: true,
          request: {
            include: {
              attendees: { include: { employee: true } },
              statusEntries: {
                orderBy: { createdAt: "asc" },
                include: { actor: { include: { user: true } } },
              },
            },
          },
          employee: {
            include: {
              employmentRecords: {
                where: { is_current: true, is_deleted: false },
                include: {
                  location: true,
                  designation: true,
                  department: true,
                },
              },
            },
          },
          statusEntries: {
            orderBy: { createdAt: "asc" },
            include: { actor: { include: { user: true } } },
          },
        },
      });
    }
    return claim;
  },
  updateClaim: async (
    id,
    employee_id,
    isSuperAdmin,
    data,
    ctx,
    department_id
  ) => {
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(id) },
      include: {
        request: true,
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
            },
          },
        },
        statusEntries: true,
      },
    });
    if (!claim || claim.is_deleted) throw new Error("Not found");
    const editableByAccounts =
      ctx &&
      (ctx.isSuperAdmin || ctx.isAccountsApprover) &&
      !claim.statusEntries.some((e) => e.action === "PROCESS_STARTED");
    let canAccess =
      module.exports._canAccess(claim, employee_id, isSuperAdmin) ||
      editableByAccounts;
    // Department-based account: allow editing if claimant currently belongs to the same department
    if (!canAccess && !employee_id && department_id) {
      canAccess = (claim.employee?.employmentRecords || []).some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          Number(er.department_id) === Number(department_id)
      );
    }
    if (!canAccess) throw new Error("Forbidden");

    if (!editableByAccounts) {
      if (claim.status !== "DRAFT")
        throw new Error("Only draft claims editable");
    }

    const updateData = {};

    // Accounts approver can adjust these even post-APPROVED/VERIFIED but before Accounts approval
    if (editableByAccounts) {
      if ("total_distance_km" in data)
        updateData.total_distance_km = Number(data.total_distance_km || 0);
      if ("rate_per_km" in data)
        updateData.rate_per_km = Number(data.rate_per_km || 0);
      if ("per_diem_days" in data)
        updateData.per_diem_days = Number(data.per_diem_days || 0);
      if ("per_diem_rate" in data)
        updateData.per_diem_rate = Number(data.per_diem_rate || 0);
      if ("distance_amount" in data)
        updateData.distance_amount = Number(data.distance_amount || 0);
      if ("travel_total" in data)
        updateData.travel_total = Number(data.travel_total || 0);
      if ("per_diem_amount" in data)
        updateData.per_diem_amount = Number(data.per_diem_amount || 0);
      if ("grand_total" in data)
        updateData.grand_total = Number(data.grand_total || 0);
      // Newly allowed for Accounts edits
      if ("toll_tax_total" in data)
        updateData.toll_tax_total = Number(data.toll_tax_total || 0);
      if ("fare_total" in data)
        updateData.fare_total = Number(data.fare_total || 0);
    }

    // Regular editable fields in DRAFT
    if (!editableByAccounts) {
      ["from_date", "to_date"].forEach((f) => {
        if (data[f]) updateData[f] = new Date(data[f]);
      });
      if ("overnight_stay" in data)
        updateData.overnight_stay = !!data.overnight_stay;
      if ("toll_tax_total" in data)
        updateData.toll_tax_total = Number(data.toll_tax_total || 0);
      if ("per_diem_days" in data)
        updateData.per_diem_days = Number(data.per_diem_days || 0);
      if ("transport_mode" in data)
        updateData.transport_mode = String(
          data.transport_mode || "OWN"
        ).toUpperCase();
      if ("fuel_total" in data)
        updateData.fuel_total = Number(data.fuel_total || 0);
      if ("fare_total" in data)
        updateData.fare_total = Number(data.fare_total || 0);
      if ("rate_per_km" in data)
        updateData.rate_per_km = Number(data.rate_per_km || 0);
      if ("per_diem_rate" in data)
        updateData.per_diem_rate = Number(data.per_diem_rate || 0);
    }

    const updated = await prisma.travelClaim.update({
      where: { id: claim.id },
      data: updateData,
    });

    // Recompute totals if Accounts didn't explicitly pass dependent totals
    if (!editableByAccounts) {
      return module.exports.recomputeTotals(claim.id);
    } else {
      // Ensure totals are consistent even if some fields missing
      const A =
        "total_distance_km" in updateData
          ? updateData.total_distance_km
          : updated.total_distance_km || 0;
      const B =
        "rate_per_km" in updateData
          ? updateData.rate_per_km
          : updated.rate_per_km || 0;
      const D =
        "toll_tax_total" in updateData
          ? updateData.toll_tax_total
          : updated.toll_tax_total || 0;
      const mode = (updated.transport_mode || "OWN").toUpperCase();
      const fare =
        "fare_total" in updateData
          ? updateData.fare_total
          : updated.fare_total || 0;
      const C =
        "distance_amount" in updateData ? updateData.distance_amount : A * B;
      const E =
        "travel_total" in updateData
          ? updateData.travel_total
          : C + D + (mode !== "OWN" ? fare : 0);
      const pdDays =
        "per_diem_days" in updateData
          ? updateData.per_diem_days
          : updated.per_diem_days || 0;
      const pdRate =
        "per_diem_rate" in updateData
          ? updateData.per_diem_rate
          : updated.per_diem_rate || 0;
      const F =
        "per_diem_amount" in updateData
          ? updateData.per_diem_amount
          : pdDays * pdRate;
      const G = "grand_total" in updateData ? updateData.grand_total : E + F;
      await prisma.travelClaim.update({
        where: { id: claim.id },
        data: {
          total_distance_km: A,
          distance_amount: C,
          travel_total: E,
          per_diem_amount: F,
          grand_total: G,
          rate_per_km: B,
          per_diem_rate: pdRate,
        },
      });
      return prisma.travelClaim.findUnique({
        where: { id: claim.id },
        include: {
          documents: true,
          segments: true,
          request: true,
          employee: true,
          statusEntries: { orderBy: { createdAt: "asc" } },
        },
      });
    }
  },
  recomputeTotals: async (claimId) => {
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(claimId) },
      include: {
        segments: true,
        documents: true,
        request: true,
        employee: true,
      },
    });
    if (!claim) return null;
    const total_distance_km = (claim.segments || []).reduce(
      (s, a) => s + Number(a.distance_km || 0),
      0
    );
    const A = total_distance_km;
    const B = Number(claim.rate_per_km || 0);
    const C = A * B;
    const D = Number(claim.toll_tax_total || 0);
    const mode = (claim.transport_mode || "OWN").toUpperCase();
    const fare = Number(claim.fare_total || 0);
    const E = C + D + (mode !== "OWN" ? fare : 0);
    const per_diem_days = Number(claim.per_diem_days || 0);
    const per_diem_rate = Number(claim.per_diem_rate || 0);
    const F = per_diem_days * per_diem_rate;
    const G = E + F;
    await prisma.travelClaim.update({
      where: { id: claim.id },
      data: {
        total_distance_km: A,
        distance_amount: C,
        travel_total: E,
        per_diem_amount: F,
        grand_total: G,
      },
    });
    return prisma.travelClaim.findUnique({
      where: { id: claim.id },
      include: {
        documents: true,
        segments: true,
        request: {
          include: {
            attendees: { include: { employee: true } },
            statusEntries: {
              orderBy: { createdAt: "asc" },
              include: { actor: { include: { user: true } } },
            },
          },
        },
        employee: true,
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: { actor: { include: { user: true } } },
        },
      },
    });
  },
  addSegment: async (
    claimId,
    employee_id,
    isSuperAdmin,
    payload,
    department_id
  ) => {
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(claimId) },
      include: {
        request: true,
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
            },
          },
        },
      },
    });
    if (!claim || claim.is_deleted) throw new Error("Not found");
    let allowed = module.exports._canAccess(claim, employee_id, isSuperAdmin);
    if (!allowed && !employee_id && department_id) {
      allowed = (claim.employee?.employmentRecords || []).some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          Number(er.department_id) === Number(department_id)
      );
    }
    if (!allowed) throw new Error("Forbidden");
    if (claim.status !== "DRAFT") throw new Error("Only draft claims editable");
    await prisma.travelClaimSegment.create({
      data: {
        claim_id: claim.id,
        departure_from: payload.departure_from || "",
        departure_to: payload.departure_to || "",
        depart_date: payload.depart_date ? new Date(payload.depart_date) : null,
        depart_time: payload.depart_time || null,
        arrive_date: payload.arrive_date ? new Date(payload.arrive_date) : null,
        arrive_time: payload.arrive_time || null,
        mode: payload.mode || null,
        distance_km: Number(payload.distance_km || 0),
      },
    });
    return module.exports.recomputeTotals(claim.id);
  },
  updateSegment: async (
    claimId,
    segmentId,
    employee_id,
    isSuperAdmin,
    payload,
    department_id
  ) => {
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(claimId) },
      include: {
        request: true,
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
            },
          },
        },
      },
    });
    if (!claim || claim.is_deleted) throw new Error("Not found");
    let allowed = module.exports._canAccess(claim, employee_id, isSuperAdmin);
    if (!allowed && !employee_id && department_id) {
      allowed = (claim.employee?.employmentRecords || []).some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          Number(er.department_id) === Number(department_id)
      );
    }
    if (!allowed) throw new Error("Forbidden");
    if (claim.status !== "DRAFT") throw new Error("Only draft claims editable");
    const seg = await prisma.travelClaimSegment.findUnique({
      where: { id: Number(segmentId) },
    });
    if (!seg || seg.claim_id !== claim.id) throw new Error("Not found");
    await prisma.travelClaimSegment.update({
      where: { id: seg.id },
      data: {
        departure_from: payload.departure_from || "",
        departure_to: payload.departure_to || "",
        depart_date: payload.depart_date
          ? new Date(payload.depart_date)
          : seg.depart_date,
        depart_time: payload.depart_time || null,
        arrive_date: payload.arrive_date
          ? new Date(payload.arrive_date)
          : seg.arrive_date,
        arrive_time: payload.arrive_time || null,
        mode: payload.mode || null,
        distance_km: Number(payload.distance_km || 0),
      },
    });
    return module.exports.recomputeTotals(claim.id);
  },
  deleteSegment: async (
    claimId,
    segmentId,
    employee_id,
    isSuperAdmin,
    department_id
  ) => {
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(claimId) },
      include: {
        request: true,
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
            },
          },
        },
      },
    });
    if (!claim || claim.is_deleted) throw new Error("Not found");
    let allowed = module.exports._canAccess(claim, employee_id, isSuperAdmin);
    if (!allowed && !employee_id && department_id) {
      allowed = (claim.employee?.employmentRecords || []).some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          Number(er.department_id) === Number(department_id)
      );
    }
    if (!allowed) throw new Error("Forbidden");
    if (claim.status !== "DRAFT") throw new Error("Only draft claims editable");
    await prisma.travelClaimSegment.deleteMany({
      where: { id: Number(segmentId), claim_id: claim.id },
    });
    return module.exports.recomputeTotals(claim.id);
  },
  addDocuments: async (
    claimId,
    employee_id,
    isSuperAdmin,
    files,
    category,
    department_id
  ) => {
    // Supports multi-file uploads; category may be FUEL, TOLL, PICTURE, REPORT, OTHER
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(claimId) },
      include: {
        documents: true,
        request: true,
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
            },
          },
        },
      },
    });
    if (!claim || claim.is_deleted) throw new Error("Not found");
    let allowed = module.exports._canAccess(claim, employee_id, isSuperAdmin);
    if (!allowed && !employee_id && department_id) {
      allowed = (claim.employee?.employmentRecords || []).some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          Number(er.department_id) === Number(department_id)
      );
    }
    if (!allowed) throw new Error("Forbidden");
    if (claim.status !== "DRAFT") throw new Error("Only draft claims editable");
    const cat = String(category || "OTHER").toUpperCase();
    // Allow multiple REPORT uploads; submission will ensure at least one exists (for request-linked claims)
    const createMany = files.map((f) => ({
      claim_id: claim.id,
      category: cat,
      file_path:
        f._savedRelPath || f.path.replace(/.*uploads[\\/]/, "uploads/"),
      mime_type: f.mimetype,
      file_size: f.size,
    }));
    await prisma.travelClaimDocument.createMany({ data: createMany });
    return prisma.travelClaim.findUnique({
      where: { id: claim.id },
      include: {
        documents: true,
        segments: true,
        request: true,
        employee: true,
      },
    });
  },
  deleteDocument: async (
    claimId,
    docId,
    employee_id,
    isSuperAdmin,
    department_id
  ) => {
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(claimId) },
      include: {
        request: true,
        documents: true,
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
            },
          },
        },
      },
    });
    if (!claim || claim.is_deleted) throw new Error("Not found");
    let allowed = module.exports._canAccess(claim, employee_id, isSuperAdmin);
    if (!allowed && !employee_id && department_id) {
      allowed = (claim.employee?.employmentRecords || []).some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          Number(er.department_id) === Number(department_id)
      );
    }
    if (!allowed) throw new Error("Forbidden");
    if (claim.status !== "DRAFT") throw new Error("Only draft claims editable");
    const doc = await prisma.travelClaimDocument.findUnique({
      where: { id: Number(docId) },
    });
    if (!doc || doc.claim_id !== claim.id) throw new Error("Not found");
    // Allow deleting REPORT too; submission requires at least one remaining
    await prisma.travelClaimDocument.delete({ where: { id: doc.id } });
    return prisma.travelClaim.findUnique({
      where: { id: claim.id },
      include: {
        documents: true,
        segments: true,
        request: true,
        employee: true,
      },
    });
  },
  deleteClaim: async (id, employee_id, isSuperAdmin, department_id) => {
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(id) },
      include: {
        request: true,
        documents: true,
        segments: true,
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
            },
          },
        },
      },
    });
    if (!claim || claim.is_deleted) throw new Error("Not found");
    let allowed = module.exports._canAccess(claim, employee_id, isSuperAdmin);
    // Department-based account: allow deletion if claimant currently belongs to the same department
    if (!allowed && !employee_id && department_id) {
      allowed = (claim.employee?.employmentRecords || []).some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          Number(er.department_id) === Number(department_id)
      );
    }
    if (!allowed) throw new Error("Forbidden");
    if (claim.status !== "DRAFT")
      throw new Error("Only draft claims deletable");
    await prisma.travelClaim.delete({ where: { id: claim.id } });
    return { success: true };
  },
  submitClaim: async (
    id,
    employee_id,
    isSuperAdmin,
    actorLabel,
    department_id
  ) => {
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(id) },
      include: {
        documents: true,
        request: true,
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
            },
          },
        },
      },
    });
    if (!claim) throw new Error("Not found");
    let allowed = module.exports._canAccess(claim, employee_id, isSuperAdmin);
    if (!allowed && !employee_id && department_id) {
      allowed = (claim.employee?.employmentRecords || []).some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          Number(er.department_id) === Number(department_id)
      );
    }
    if (!allowed) throw new Error("Forbidden");
    if (claim.status !== "DRAFT")
      throw new Error("Only draft claims can be submitted");
    const isWithinCity = !claim.travel_request_id;
    const hasReport = (claim.documents || []).some(
      (d) => d.category === "REPORT"
    );
    if (!isWithinCity && !hasReport)
      throw new Error("Report document required before submission");
    // If submitted by a department account, persist the origin department for routing
    const updateData = { status: "SUBMITTED" };
    if (!employee_id && department_id) {
      updateData.created_by_department_id = Number(department_id);
    }
    await prisma.travelClaim.update({
      where: { id: claim.id },
      data: updateData,
    });
    // Record SUBMITTED
    await prisma.travelClaimStatusEntry.create({
      data: {
        claim_id: claim.id,
        action: "SUBMITTED",
        actor_employee_id: employee_id,
        remarks: actorLabel || null,
      },
    });

    // Auto-approve when DG submits their own claim (normal or within-city), then route to Establishment
    try {
      if (employee_id && Number(employee_id) === Number(claim.employee_id)) {
        const er = await prisma.employment.findFirst({
          where: {
            employee_id: Number(employee_id),
            is_current: true,
            is_deleted: false,
          },
          include: { designation: true },
        });
        const isDG = /^director\s*general$/i.test(er?.designation?.title || "");
        if (isDG) {
          // Mark claim as APPROVED and add DG_APPROVED entry
          await prisma.travelClaim.update({
            where: { id: claim.id },
            data: { status: "APPROVED" },
          });
          await prisma.travelClaimStatusEntry.create({
            data: {
              claim_id: claim.id,
              action: "DG_APPROVED",
              actor_employee_id: Number(employee_id),
              remarks: actorLabel || null,
            },
          });
        }
      }
    } catch (_) {}

    return prisma.travelClaim.findUnique({
      where: { id: claim.id },
      include: {
        documents: true,
        segments: true,
        request: true,
        employee: true,
        statusEntries: { orderBy: { createdAt: "asc" } },
      },
    });
  },
  listPendingApprovals: async (ctx) => {
    // Adjusted to support recommender stage for within-city (no request)
    const stageFilters = [];

    // Recommendation stages
    if (ctx.meEmpId) {
      // Personal/standard path: immediate in-charge of applicant (request-linked)
      stageFilters.push({
        status: "SUBMITTED",
        request: {
          applicant: {
            employmentRecords: {
              some: {
                is_current: true,
                is_deleted: false,
                reporting_officer_id: String(ctx.meEmpId),
              },
            },
          },
        },
        statusEntries: { none: { action: "RECOMMENDED" } },
      });
      // Within-city — employee's in-charge
      stageFilters.push({
        status: "SUBMITTED",
        employee: {
          employmentRecords: {
            some: {
              is_current: true,
              is_deleted: false,
              reporting_officer_id: String(ctx.meEmpId),
            },
          },
        },
        request: null,
        statusEntries: { none: { action: "RECOMMENDED" } },
      });

      // Department-originated (dept account): route to HoD of the submitting department (created_by_department_id)
      stageFilters.push({
        status: "SUBMITTED",
        statusEntries: { none: { action: "RECOMMENDED" } },
        AND: [
          { created_by_department_id: { not: null } },
          {
            OR: [
              {
                createdByDepartment: {
                  is: { head_employee_id: Number(ctx.meEmpId) },
                },
              },
              {
                createdByDepartment: {
                  head: { is: { id: Number(ctx.meEmpId) } },
                },
              },
            ],
          },
        ],
      });
      // Legacy fallback: no created_by_department_id but submitted with [DEPT] marker; route via claimant's HoD
      stageFilters.push({
        status: "SUBMITTED",
        created_by_department_id: null,
        statusEntries: {
          none: { action: "RECOMMENDED" },
          some: {
            action: "SUBMITTED",
            remarks: { contains: "[DEPT]", mode: "insensitive" },
          },
        },
        employee: {
          employmentRecords: {
            some: {
              is_current: true,
              is_deleted: false,
              department: { is: { head_employee_id: Number(ctx.meEmpId) } },
            },
          },
        },
      });

      // HQ-origin (personal at Head Office): claimant's department HoD is me
      stageFilters.push({
        status: "SUBMITTED",
        statusEntries: { none: { action: "RECOMMENDED" } },
        AND: [
          { created_by_department_id: null },
          {
            employee: {
              employmentRecords: {
                some: {
                  is_current: true,
                  is_deleted: false,
                  location: { is: { type: "HEAD_OFFICE" } },
                  department: { is: { head_employee_id: Number(ctx.meEmpId) } },
                },
              },
            },
          },
        ],
      });

      // Fallback: Department-originated but route via claimant's HoD as well (data inconsistencies)
      stageFilters.push({
        status: "SUBMITTED",
        statusEntries: { none: { action: "RECOMMENDED" } },
        AND: [
          { created_by_department_id: { not: null } },
          {
            employee: {
              employmentRecords: {
                some: {
                  is_current: true,
                  is_deleted: false,
                  department: { is: { head_employee_id: Number(ctx.meEmpId) } },
                },
              },
            },
          },
        ],
      });

      // Department-originated: HoD’s RO is me (based on submitting department HoD)
      stageFilters.push({
        status: "SUBMITTED",
        statusEntries: { some: { action: "RECOMMENDED" } },
        AND: [
          { created_by_department_id: { not: null } },
          {
            createdByDepartment: {
              is: {
                head: {
                  is: {
                    employmentRecords: {
                      some: {
                        is_current: true,
                        is_deleted: false,
                        reporting_officer_id: String(ctx.meEmpId),
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      });

      // HQ-origin (personal): claimant's department HoD's RO is me (at Head Office)
      stageFilters.push({
        status: "SUBMITTED",
        statusEntries: { some: { action: "RECOMMENDED" } },
        AND: [
          { created_by_department_id: null },
          {
            employee: {
              employmentRecords: {
                some: {
                  is_current: true,
                  is_deleted: false,
                  location: { is: { type: "HEAD_OFFICE" } },
                  department: {
                    is: {
                      head: {
                        is: {
                          employmentRecords: {
                            some: {
                              is_current: true,
                              is_deleted: false,
                              reporting_officer_id: String(ctx.meEmpId),
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      });

      // Fallback: Department-originated but allow HoD’s RO via claimant’s department HoD as well
      stageFilters.push({
        status: "SUBMITTED",
        statusEntries: { some: { action: "RECOMMENDED" } },
        AND: [
          { created_by_department_id: { not: null } },
          {
            employee: {
              employmentRecords: {
                some: {
                  is_current: true,
                  is_deleted: false,
                  department: {
                    is: {
                      head: {
                        is: {
                          employmentRecords: {
                            some: {
                              is_current: true,
                              is_deleted: false,
                              reporting_officer_id: String(ctx.meEmpId),
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      });
    }

    // First stage (OPS/DG) requires recommendation(s)
    const firstStageNone = {
      action: {
        in: ["OPS_APPROVED", "OPS_REJECTED", "DG_APPROVED", "DG_REJECTED"],
      },
    };
    if (ctx.isOps || ctx.canApproveClaimOps) {
      stageFilters.push({
        status: "SUBMITTED",
        employee: {
          employmentRecords: {
            some: {
              is_current: true,
              location: { is: { type: "BAZAAR" } },
            },
          },
        },
        // Exclude department-origin and HQ-origin from OPS; only bazaar-origin standard claims
        created_by_department_id: null,
        statusEntries: {
          none: firstStageNone,
          some: { action: "RECOMMENDED" },
        },
      });
    }
    const looksLikeDG =
      !!ctx.isDG ||
      !!ctx.canApproveClaimDG ||
      /(^|\b)(director\s*general|dg)(\b|$)/i.test(
        String(ctx.desigTitle || "")
      ) ||
      /(^|\b)(director\s*general|dg)(\b|$)/i.test(String(ctx.roleName || ""));
    if (looksLikeDG) {
      // DG sees standard claims requiring recommendation
      stageFilters.push({
        status: "SUBMITTED",
        employee: {
          employmentRecords: {
            some: {
              is_current: true,
              location: { is: { type: "HEAD_OFFICE" } },
            },
          },
        },
        statusEntries: {
          none: firstStageNone,
          some: { action: "RECOMMENDED" },
        },
      });
      // DG fallback: include any SUBMITTED claim with at least one recommendation
      // and no first-stage (OPS/DG) decision, regardless of origin/location
      stageFilters.push({
        status: "SUBMITTED",
        statusEntries: {
          some: { action: "RECOMMENDED" },
          none: firstStageNone,
        },
      });
      // DG explicit: include department-origin claims regardless of recommendation count
      // This prevents hiding items due to origin/location quirks; decision API still enforces rec requirements.
      stageFilters.push({
        status: "SUBMITTED",
        OR: [
          { created_by_department_id: { not: null } },
          {
            statusEntries: {
              some: {
                action: "SUBMITTED",
                OR: [
                  { remarks: { contains: "[DEPT]", mode: "insensitive" } },
                  { remarks: { contains: "department", mode: "insensitive" } },
                  {
                    remarks: { contains: "submitted by", mode: "insensitive" },
                  },
                ],
              },
            },
          },
          {
            statusEntries: {
              some: { action: "SUBMITTED", actor_employee_id: null },
            },
          },
        ],
        statusEntries: { none: firstStageNone },
      });
      // Department/HQ-origin: DG sees after recommendations
      stageFilters.push({
        status: "SUBMITTED",
        statusEntries: {
          some: { action: "RECOMMENDED" },
          none: firstStageNone,
        },
        OR: [
          // Explicit department-origin
          { created_by_department_id: { not: null } },
          // Legacy department-origin marker in SUBMITTED remarks
          {
            statusEntries: {
              some: {
                action: "SUBMITTED",
                OR: [
                  { remarks: { contains: "[DEPT]", mode: "insensitive" } },
                  { remarks: { contains: "department", mode: "insensitive" } },
                  {
                    remarks: { contains: "submitted by", mode: "insensitive" },
                  },
                ],
              },
            },
          },
          // Department account submitted (no employee actor recorded)
          {
            statusEntries: {
              some: { action: "SUBMITTED", actor_employee_id: null },
            },
          },
          // Head Office personal claims
          {
            employee: {
              employmentRecords: {
                some: {
                  is_current: true,
                  is_deleted: false,
                  location: { is: { type: "HEAD_OFFICE" } },
                },
              },
            },
          },
          // Request applicant at Head Office (request-linked claims)
          {
            request: {
              applicant: {
                employmentRecords: {
                  some: {
                    is_current: true,
                    is_deleted: false,
                    location: { is: { type: "HEAD_OFFICE" } },
                  },
                },
              },
            },
          },
        ],
      });
      // Fast-track for DG direct reports (skip recommendation) remains
      if (ctx.meEmpId) {
        stageFilters.push({
          status: "SUBMITTED",
          employee: {
            employmentRecords: {
              some: {
                is_current: true,
                is_deleted: false,
                location: { is: { type: "HEAD_OFFICE" } },
                reporting_officer_id: String(ctx.meEmpId),
              },
            },
          },
          statusEntries: {
            none: firstStageNone,
          },
        });
      }
    }

    // Establishment stage (replaces HR) — allow by ctx flag, role name, or department name
    const looksEstablishment =
      !!ctx.isEstablishment ||
      /^\s*establishment/i.test(String(ctx.roleName || "")) ||
      /(^|\b)establishment(\b|$)/i.test(String(ctx.deptName || ""));
    if (looksEstablishment) {
      stageFilters.push({
        status: "APPROVED",
        statusEntries: {
          some: { action: { in: ["OPS_APPROVED", "DG_APPROVED"] } },
          none: {
            action: {
              in: ["ESTABLISHMENT_VERIFIED", "ESTABLISHMENT_REJECTED"],
            },
          },
        },
      });
    }

    // Accounts stage (processing, not approval)
    const looksAccounts =
      !!ctx.isAccountsApprover ||
      /^\s*accounts/i.test(String(ctx.roleName || "")) ||
      /(accounts|finance|budget|payroll|reconciliation)/i.test(
        String(ctx.deptName || "")
      );
    if (looksAccounts) {
      stageFilters.push({
        status: "VERIFIED",
        statusEntries: {
          some: { action: "ESTABLISHMENT_VERIFIED" },
          none: { action: { in: ["PROCESS_STARTED"] } },
        },
      });
    }

    if (stageFilters.length === 0) return [];

    let claims = await prisma.travelClaim.findMany({
      where: { OR: stageFilters, is_deleted: false },
      orderBy: { createdAt: "desc" },
      include: {
        createdByDepartment: {
          include: {
            head: {
              include: {
                employmentRecords: {
                  where: { is_current: true, is_deleted: false },
                },
              },
            },
          },
        },
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: {
                designation: true,
                department: {
                  include: {
                    head: {
                      include: {
                        employmentRecords: {
                          where: { is_current: true, is_deleted: false },
                        },
                      },
                    },
                  },
                },
                location: true,
              },
            },
          },
        },
        request: {
          include: {
            applicant: {
              include: {
                employmentRecords: {
                  where: { is_current: true, is_deleted: false },
                  include: {
                    location: true,
                    designation: true,
                    department: {
                      include: {
                        head: {
                          include: {
                            employmentRecords: {
                              where: { is_current: true, is_deleted: false },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        documents: true,
        segments: true,
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: {
            actor: {
              include: {
                employmentRecords: {
                  where: { is_current: true, is_deleted: false },
                  include: {
                    designation: true,
                    department: true,
                    location: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // DG safety-net: if nothing matched due to origin/location quirks, include
    // a broad, role-appropriate set to avoid hiding valid department-origin items.
    if (looksLikeDG && (!claims || claims.length === 0)) {
      const me = String(ctx.meEmpId || "");
      claims = await prisma.travelClaim.findMany({
        where: {
          is_deleted: false,
          status: "SUBMITTED",
          OR: [
            // Any SUBMITTED with at least one recommendation
            { statusEntries: { some: { action: "RECOMMENDED" } } },
            // Direct reports to DG (fast-track)
            {
              employee: {
                employmentRecords: {
                  some: {
                    is_current: true,
                    is_deleted: false,
                    reporting_officer_id: me,
                  },
                },
              },
            },
          ],
          // Exclude those already decided at first stage (OPS/DG)
          statusEntries: {
            none: {
              action: {
                in: [
                  "OPS_APPROVED",
                  "OPS_REJECTED",
                  "DG_APPROVED",
                  "DG_REJECTED",
                ],
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        include: {
          createdByDepartment: {
            include: {
              head: {
                include: {
                  employmentRecords: {
                    where: { is_current: true, is_deleted: false },
                  },
                },
              },
            },
          },
          employee: {
            include: {
              employmentRecords: {
                where: { is_current: true, is_deleted: false },
                include: {
                  designation: true,
                  department: {
                    include: {
                      head: {
                        include: {
                          employmentRecords: {
                            where: { is_current: true, is_deleted: false },
                          },
                        },
                      },
                    },
                  },
                  location: true,
                },
              },
            },
          },
          request: {
            include: {
              applicant: {
                include: {
                  employmentRecords: {
                    where: { is_current: true, is_deleted: false },
                    include: {
                      location: true,
                      designation: true,
                      department: {
                        include: {
                          head: {
                            include: {
                              employmentRecords: {
                                where: { is_current: true, is_deleted: false },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          documents: true,
          segments: true,
          statusEntries: {
            orderBy: { createdAt: "asc" },
            include: {
              actor: {
                include: {
                  employmentRecords: {
                    where: { is_current: true, is_deleted: false },
                    include: {
                      designation: true,
                      department: true,
                      location: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }
    return claims;
  },
  decideClaim: async (id, actorEmpId, ctx, action, remarks) => {
    const claim = await prisma.travelClaim.findUnique({
      where: { id: Number(id) },
      include: {
        request: {
          include: {
            applicant: {
              include: {
                employmentRecords: {
                  where: { is_current: true, is_deleted: false },
                  include: {
                    location: true,
                    designation: true,
                    department: true,
                  },
                },
              },
            },
          },
        },
        statusEntries: { orderBy: { createdAt: "asc" } },
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: { designation: true, department: true, location: true },
            },
          },
        },
      },
    });
    if (!claim || claim.is_deleted) throw new Error("Not found");

    // Determine claimant location and first-stage branch
    const getClaimerLocationType = () =>
      claim.employee?.employmentRecords?.[0]?.location?.type || "HEAD_OFFICE";
    const deriveFirstStage = () => {
      const hasOpsDecision = claim.statusEntries.some((e) =>
        e.action.startsWith("OPS_")
      );
      const hasDgDecision = claim.statusEntries.some((e) =>
        e.action.startsWith("DG_")
      );
      if (hasOpsDecision && !hasDgDecision) return "OPS";
      if (hasDgDecision && !hasOpsDecision) return "DG";
      if (hasOpsDecision && hasDgDecision) {
        const firstRelevant = claim.statusEntries.find((e) =>
          [
            "OPS_APPROVED",
            "OPS_REJECTED",
            "DG_APPROVED",
            "DG_REJECTED",
          ].includes(e.action)
        );
        if (firstRelevant)
          return firstRelevant.action.startsWith("OPS_") ? "OPS" : "DG";
      }
      return getClaimerLocationType() === "BAZAAR" ? "OPS" : "DG";
    };
    const FIRST_STAGE_ACTOR = deriveFirstStage();

    // New: compute HoD chain for low-BPS claimants
    const sg = await getEmployeeScaleGrade(claim.employee_id);
    const isLowBps = !!(
      sg?.grade &&
      sg.grade.category === "BPS" &&
      Number(sg.grade.level || 0) < 17
    );
    // Department-originated detection: SUBMITTED entry remarks contain [DEPT]
    // Department-origin detection: submitted by a department account (explicit persisted field)
    const isDeptOrigin = !!claim.created_by_department_id;
    // HQ-origin detection: claimant belongs to Head Office
    const isHQOrigin = getClaimerLocationType() === "HEAD_OFFICE";
    const currentEmp =
      (claim.employee?.employmentRecords || []).find(
        (er) => er.is_current && !er.is_deleted
      ) ||
      claim.employee?.employmentRecords?.[0] ||
      null;
    // Prefer HoD based on origin:
    // - Department-origin: HoD of the submitting department (created_by_department_id)
    // - Otherwise: HoD of claimant's current department
    let hodId = null;
    if (claim.created_by_department_id) {
      const originDept = await prisma.department.findFirst({
        where: {
          id: Number(claim.created_by_department_id),
          is_deleted: false,
        },
        select: { head_employee_id: true },
      });
      if (originDept?.head_employee_id)
        hodId = Number(originDept.head_employee_id);
    }
    if (!hodId && currentEmp?.department?.head_employee_id) {
      hodId = Number(currentEmp.department.head_employee_id);
    }
    const hodEmployment = hodId
      ? await prisma.employment.findFirst({
          where: { employee_id: hodId, is_current: true, is_deleted: false },
        })
      : null;
    const hodRoId = hodEmployment?.reporting_officer_id
      ? Number(hodEmployment.reporting_officer_id)
      : null;
    const recommendationCount = (claim.statusEntries || []).filter(
      (e) => e.action === "RECOMMENDED"
    ).length;

    const rejectionMap = {
      OPS: "OPS_REJECTED",
      DG: "DG_REJECTED",
      ESTABLISHMENT: "ESTABLISHMENT_REJECTED",
      ACCOUNTS: "ACCOUNTS_REJECTED",
      RECOMMENDER: "RECOMMENDER_REJECTED",
    };

    // Helper: DG direct-report bypass
    const isDirectReportToDG = () =>
      ctx.isDG &&
      (claim.employee?.employmentRecords || []).some(
        (er) =>
          er.is_current &&
          !er.is_deleted &&
          String(er.reporting_officer_id || "") === String(ctx.meEmpId || "")
      );

    // Determine who is allowed to recommend at this moment
    const me = Number(ctx.meEmpId || 0);
    const applicantEmps = claim.request?.applicant?.employmentRecords || [];
    const employeeEmps = claim.employee?.employmentRecords || [];

    // Expected recommendation chain:
    // - For low-BPS and HoD set: HoD first, then HoD's RO; DG direct reports bypass recommender
    // - Else (high-BPS or no HoD): immediate in-charge of applicant (request-linked) or employee (within-city)
    const expectedRecommenderId = (() => {
      // Department-origin: HoD first, then HoD's RO (if exists)
      if (isDeptOrigin && hodId && !isDirectReportToDG()) {
        if (recommendationCount === 0) return hodId;
        if (recommendationCount === 1) return hodRoId || null;
        return null; // already completed recommendations
      }
      // Fallback to immediate in-charge
      const appRo = applicantEmps.find(
        (er) => er.is_current && !er.is_deleted
      )?.reporting_officer_id;
      const empRo = employeeEmps.find(
        (er) => er.is_current && !er.is_deleted
      )?.reporting_officer_id;
      return claim.request
        ? appRo
          ? Number(appRo)
          : empRo
          ? Number(empRo)
          : null
        : empRo
        ? Number(empRo)
        : null;
    })();

    const canActStage = (stageKey) => {
      if (ctx.isSuperAdmin) return true;
      if (stageKey === "RECOMMENDER") {
        if (expectedRecommenderId) return me === Number(expectedRecommenderId);
        // If no explicit expected recommender (e.g., no HoD or all recommendations done), allow legacy immediate in-charge checks
        const meStr = String(me || "");
        return (
          applicantEmps.some(
            (er) =>
              er.is_current &&
              !er.is_deleted &&
              String(er.reporting_officer_id || "") === meStr
          ) ||
          employeeEmps.some(
            (er) =>
              er.is_current &&
              !er.is_deleted &&
              String(er.reporting_officer_id || "") === meStr
          )
        );
      }
      if (stageKey === "OPS") return !!(ctx.isOps || ctx.canApproveClaimOps);
      // Only a real DG (designation) can act at DG stage; do not allow permission-only
      if (stageKey === "DG") return !!ctx.isDG;
      if (stageKey === "ESTABLISHMENT") return !!ctx.isEstablishment;
      if (stageKey === "ACCOUNTS") return !!ctx.isAccountsApprover; // DG cannot act as Accounts
      return false;
    };

    const currentStatus = claim.status;
    const lastEntry = claim.statusEntries[claim.statusEntries.length - 1];
    const actionUpper = action.toUpperCase();

    const reload = async () =>
      prisma.travelClaim.findUnique({
        where: { id: Number(id) },
        include: {
          documents: true,
          segments: true,
          request: {
            include: {
              applicant: {
                include: {
                  employmentRecords: {
                    where: { is_current: true, is_deleted: false },
                    include: {
                      location: true,
                      designation: true,
                      department: true,
                    },
                  },
                },
              },
            },
          },
          employee: {
            include: {
              employmentRecords: {
                where: { is_current: true, is_deleted: false },
                include: {
                  designation: true,
                  department: true,
                  location: true,
                },
              },
            },
          },
          statusEntries: {
            orderBy: { createdAt: "asc" },
            include: {
              actor: {
                include: {
                  employmentRecords: {
                    where: { is_current: true, is_deleted: false },
                    include: {
                      designation: true,
                      department: true,
                      location: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    // Fallback-safe status updater for enum compatibility
    const updateStatusSafe = async (target, fallbacks = []) => {
      try {
        await prisma.travelClaim.update({
          where: { id: claim.id },
          data: { status: target },
        });
      } catch (e) {
        for (const fb of fallbacks) {
          try {
            await prisma.travelClaim.update({
              where: { id: claim.id },
              data: { status: fb },
            });
            return;
          } catch (_) {}
        }
        throw e;
      }
    };

    const approvalStatusMap = {
      OPS_APPROVED: ["APPROVED"],
      DG_APPROVED: ["APPROVED"],
      ESTABLISHMENT_VERIFIED: ["VERIFIED"],
      // Accounts processing start moves to UNDER_PROCESS (later tranching sets PROCESSED)
      PROCESS_STARTED: ["UNDER_PROCESS", "PROCESSED", "SETTLED"],
    };
    const isApprovalAction = (a) =>
      [
        "OPS_APPROVED",
        "DG_APPROVED",
        "ESTABLISHMENT_VERIFIED",
        "PROCESS_STARTED",
      ].includes(a);
    const REJECTION_STATUSES = new Set([
      "REJECTED",
      "REJECTED_OPS",
      "REJECTED_DG",
      "REJECTED_HR",
      "REJECTED_ACCOUNTS",
    ]);
    // Map a status entry action to its stage key
    const mapActionToStage = (act) =>
      act.startsWith("OPS_")
        ? "OPS"
        : act.startsWith("DG_")
        ? "DG"
        : act.startsWith("ESTABLISHMENT_") || act === "ESTABLISHMENT_VERIFIED"
        ? "ESTABLISHMENT"
        : act === "PROCESS_STARTED" || act.startsWith("ACCOUNTS_")
        ? "ACCOUNTS"
        : act === "RECOMMENDED"
        ? "RECOMMENDER"
        : act === "RECOMMENDER_REJECTED"
        ? "RECOMMENDER"
        : null;

    // Determine how many recommendations are needed before first-stage approval
    // Dynamic recommendation chain (claims):
    // - Department-origin: HoD then HoD's RO (if exists), then DG approves.
    // - Personal/HQ: sequential immediate reporting officers up to DG.
    // - If the chain is empty or user directly reports to DG, skip to DG stage.
    const neededRecommendations = await (async () => {
      if (isDeptOrigin && hodId) return hodRoId ? 2 : 1;
      // For personal/HQ, compute chain length dynamically; minimal 0 (direct to DG) or more
      const applicantER = (
        claim.request?.applicant?.employmentRecords ||
        claim.employee?.employmentRecords ||
        []
      ).find((x) => x.is_current && !x.is_deleted);
      let length = 0;
      let currentRO = applicantER?.reporting_officer_id
        ? String(applicantER.reporting_officer_id)
        : null;
      const visited = new Set();
      while (currentRO && !visited.has(currentRO)) {
        visited.add(currentRO);
        const nextEmp = await prisma.employment.findFirst({
          where: {
            employee_id: Number(currentRO),
            is_current: true,
            is_deleted: false,
          },
          include: { designation: true },
        });
        const isDG = /^director\s*general$/i.test(
          nextEmp?.designation?.title || ""
        );
        if (isDG) break; // do not count DG as recommender
        length++;
        currentRO = nextEmp?.reporting_officer_id
          ? String(nextEmp.reporting_officer_id)
          : null;
      }
      return length; // number of required recommendations before DG
    })();

    const assertAuthorized = (stage, intent) => {
      const lastEntryByMe = () => {
        if (!lastEntry) return false;
        // Match either by employee_id or by email in remarks for department accounts
        if (
          lastEntry.actor_employee_id != null &&
          actorEmpId != null &&
          Number(lastEntry.actor_employee_id) === Number(actorEmpId)
        )
          return true;
        const re = String(lastEntry.remarks || "");
        return (
          !!ctx.userEmail &&
          re.toLowerCase().includes(String(ctx.userEmail).toLowerCase())
        );
      };
      const userIsLastApprover =
        lastEntry &&
        lastEntryByMe() &&
        (isApprovalAction(lastEntry.action) ||
          lastEntry.action === "RECOMMENDED" ||
          lastEntry.action === "RECOMMENDER_REJECTED") &&
        (isApprovalAction(lastEntry.action)
          ? approvalStatusMap[lastEntry.action].includes(claim.status)
          : lastEntry.action === "RECOMMENDED"
          ? claim.status === "SUBMITTED"
          : REJECTION_STATUSES.has(claim.status));
      // Special hard-guard: Only Establishment (or Super Admin) may CLEAR Establishment decisions
      if (intent === "CLEAR") {
        const lastStage = lastEntry ? mapActionToStage(lastEntry.action) : null;
        if (
          lastStage === "ESTABLISHMENT" &&
          !(ctx.isEstablishment || ctx.isSuperAdmin)
        ) {
          throw new Error(
            "Only Establishment can undo Establishment verification"
          );
        }
        // Permit CLEAR by the same actor who made the last decision even if they are not the current expected actor
        if (userIsLastApprover) return true;
      }
      if (!canActStage(stage)) {
        if (userIsLastApprover) {
          if (intent === "APPROVE" || intent === "RECOMMEND")
            throw { __idempotentReturn: true };
          if (intent === "REJECT")
            throw new Error(
              "Already decided. Use CLEAR first to undo your decision, then reject."
            );
        }
        throw new Error(`Not authorized for stage ${stage}`);
      }
    };

    const determineNextStage = () => {
      if (currentStatus === "SUBMITTED") {
        return recommendationCount >= neededRecommendations
          ? FIRST_STAGE_ACTOR
          : "RECOMMENDER";
      }
      if (currentStatus === "APPROVED") return "ESTABLISHMENT"; // establishment verifies → VERIFIED
      if (currentStatus === "VERIFIED") return "ACCOUNTS"; // accounts start process → UNDER_PROCESS
      return null;
    };

    try {
      if (actionUpper === "RECOMMEND") {
        if (currentStatus !== "SUBMITTED")
          throw new Error("Only SUBMITTED claims can be recommended");
        if (recommendationCount >= neededRecommendations) return claim; // already enough
        // If direct to DG and no recommendations needed, skip
        if (neededRecommendations === 0 && isDirectReportToDG()) return claim;
        assertAuthorized("RECOMMENDER", "RECOMMEND");
        await prisma.travelClaimStatusEntry.create({
          data: {
            claim_id: claim.id,
            action: "RECOMMENDED",
            actor_employee_id: actorEmpId,
            remarks: ctx.userEmail || remarks || null,
          },
        });
        return reload();
      } else if (actionUpper === "APPROVE") {
        if (REJECTION_STATUSES.has(currentStatus))
          throw new Error(
            "Cannot approve rejected claim. Clear rejection first."
          );
        if (["PROCESSED", "SETTLED"].includes(currentStatus)) return claim; // already final
        const stage = determineNextStage();
        if (!stage) throw new Error("No further approvals allowed");
        // If the same user approved the previous stage, they cannot act on the next stage without CLEAR
        if (
          lastEntry &&
          (isApprovalAction(lastEntry.action) ||
            lastEntry.action === "RECOMMENDED" ||
            lastEntry.action === "RECOMMENDER_REJECTED") &&
          ((lastEntry.actor_employee_id != null &&
            actorEmpId != null &&
            Number(lastEntry.actor_employee_id) === Number(actorEmpId)) ||
            (ctx.userEmail &&
              String(lastEntry.remarks || "")
                .toLowerCase()
                .includes(String(ctx.userEmail).toLowerCase())))
        ) {
          const lastStage = mapActionToStage(lastEntry.action);
          // Special-case: If the actor is the DG (true DG, not just permission) and their last action
          // was a RECOMMENDED (as HoD's RO), allow them to proceed to DG stage without requiring CLEAR.
          const actorIsTrueDG = !!ctx.isDG;
          const canBypassForDG =
            actorIsTrueDG &&
            lastEntry.action === "RECOMMENDED" &&
            stage === "DG";
          if (!canBypassForDG && stage !== lastStage) {
            throw new Error(
              "You already decided the previous stage. Use CLEAR to undo your decision; you cannot act on the next stage."
            );
          }
        }
        assertAuthorized(stage, "APPROVE");
        if (stage === "RECOMMENDER") {
          // Insert recommendation entry (supports HoD then HoD’s RO)
          if (
            recommendationCount >= neededRecommendations &&
            claim.status === "SUBMITTED"
          )
            return claim; // idempotent
          await prisma.travelClaimStatusEntry.create({
            data: {
              claim_id: claim.id,
              action: "RECOMMENDED",
              actor_employee_id: actorEmpId,
              remarks: ctx.userEmail || remarks || null,
            },
          });
          return reload();
        }
        let approvalAction;
        let targetStatus;
        let fallbacks = [];
        if (stage === "OPS") {
          // Department- or HQ-originated should not be approved by OPS; require DG
          if (isDeptOrigin || isHQOrigin)
            throw new Error(
              "Head Office or department-originated claims require DG approval"
            );
          approvalAction = "OPS_APPROVED";
          targetStatus = "APPROVED";
        } else if (stage === "DG") {
          // Only Director General (role) can approve at DG stage
          if (!ctx.isDG && !ctx.isSuperAdmin) {
            throw new Error("Only Director General can approve these claims");
          }
          approvalAction = "DG_APPROVED";
          targetStatus = "APPROVED";
        } else if (stage === "ESTABLISHMENT") {
          // Establishment verifies (not approves)
          approvalAction = "ESTABLISHMENT_VERIFIED";
          targetStatus = "VERIFIED";
        } else if (stage === "ACCOUNTS") {
          // Accounts start processing (not approval)
          approvalAction = "PROCESS_STARTED";
          targetStatus = "UNDER_PROCESS";
          fallbacks = ["VERIFIED"]; // fallback to VERIFIED for legacy environments without new enum
        }
        if (
          lastEntry &&
          lastEntry.action === approvalAction &&
          approvalStatusMap[approvalAction].includes(claim.status)
        )
          return claim; // idempotent
        if (targetStatus) {
          await updateStatusSafe(targetStatus, fallbacks);
        }
        await prisma.travelClaimStatusEntry.create({
          data: {
            claim_id: claim.id,
            action: approvalAction,
            actor_employee_id: actorEmpId,
            remarks: ctx.userEmail || remarks || null,
          },
        });
        return reload();
      } else if (actionUpper === "REJECT") {
        if (["PROCESSED", "SETTLED"].includes(currentStatus))
          throw new Error("Cannot reject after final approval");
        if (REJECTION_STATUSES.has(currentStatus)) return claim;
        const stage = determineNextStage();
        if (!stage) throw new Error("No active stage to reject");
        // Block cross-stage re-decision by the same actor without CLEAR
        if (
          lastEntry &&
          (isApprovalAction(lastEntry.action) ||
            lastEntry.action === "RECOMMENDED" ||
            lastEntry.action === "RECOMMENDER_REJECTED") &&
          ((lastEntry.actor_employee_id != null &&
            actorEmpId != null &&
            Number(lastEntry.actor_employee_id) === Number(actorEmpId)) ||
            (ctx.userEmail &&
              String(lastEntry.remarks || "")
                .toLowerCase()
                .includes(String(ctx.userEmail).toLowerCase())))
        ) {
          const lastStage = mapActionToStage(lastEntry.action);
          if (stage !== lastStage)
            throw new Error(
              "You already decided the previous stage. Use CLEAR to undo your decision before rejecting."
            );
        }
        if (stage === "RECOMMENDER") {
          assertAuthorized("RECOMMENDER", "REJECT");
          await updateStatusSafe("REJECTED");
          await prisma.travelClaimStatusEntry.create({
            data: {
              claim_id: claim.id,
              action: "RECOMMENDER_REJECTED",
              actor_employee_id: actorEmpId,
              remarks: ctx.userEmail || remarks || null,
            },
          });
          return reload();
        }
        const rejectionAction = rejectionMap[stage];
        assertAuthorized(stage, "REJECT");
        let rejectedStatus =
          stage === "OPS"
            ? "REJECTED_OPS"
            : stage === "DG"
            ? "REJECTED_DG"
            : stage === "HR"
            ? "REJECTED_HR"
            : "REJECTED_ACCOUNTS";
        await updateStatusSafe(rejectedStatus, ["REJECTED"]);
        await prisma.travelClaimStatusEntry.create({
          data: {
            claim_id: claim.id,
            action: rejectionAction,
            actor_employee_id: actorEmpId,
            remarks: ctx.userEmail || remarks || null,
          },
        });
        return reload();
      } else if (actionUpper === "CLEAR") {
        if (!lastEntry) throw new Error("No decision to clear");
        const isApproval = isApprovalAction(lastEntry.action);
        const isRejection = [
          "OPS_REJECTED",
          "DG_REJECTED",
          "ESTABLISHMENT_REJECTED",
          "ACCOUNTS_REJECTED",
          "RECOMMENDER_REJECTED",
        ].includes(lastEntry.action);
        const isRecommendation = lastEntry.action === "RECOMMENDED";
        const lastStage = mapActionToStage(lastEntry.action);
        const sameLogicalActor =
          (lastEntry.actor_employee_id != null &&
            actorEmpId != null &&
            Number(lastEntry.actor_employee_id) === Number(actorEmpId)) ||
          (ctx.userEmail &&
            String(lastEntry.remarks || "")
              .toLowerCase()
              .includes(String(ctx.userEmail).toLowerCase()));
        if (!sameLogicalActor && !ctx.isSuperAdmin)
          throw new Error("Cannot clear another user's decision");
        assertAuthorized(lastStage, "CLEAR");
        // Disallow CLEAR if next stage has already acted
        const hasNextStageAction = (() => {
          // If last was RECOMMENDED, next stage is OPS/DG; if last was OPS/DG approved, next is HR; if HR approved, next is Accounts
          if (isRecommendation) {
            return (claim.statusEntries || []).some((e) =>
              [
                "OPS_APPROVED",
                "OPS_REJECTED",
                "DG_APPROVED",
                "DG_REJECTED",
              ].includes(e.action)
            );
          }
          if (
            lastEntry.action === "OPS_APPROVED" ||
            lastEntry.action === "DG_APPROVED"
          ) {
            return (claim.statusEntries || []).some((e) =>
              ["ESTABLISHMENT_VERIFIED", "ESTABLISHMENT_REJECTED"].includes(
                e.action
              )
            );
          }
          if (lastEntry.action === "ESTABLISHMENT_VERIFIED") {
            return (claim.statusEntries || []).some((e) =>
              ["PROCESS_STARTED", "ACCOUNTS_REJECTED"].includes(e.action)
            );
          }
          return false;
        })();
        if (hasNextStageAction)
          throw new Error(
            "Cannot undo: next stage has already acted on this claim"
          );
        if (isRecommendation) {
          if (claim.status !== "SUBMITTED")
            throw new Error("Cannot clear, workflow advanced");
          await prisma.travelClaimStatusEntry.delete({
            where: { id: lastEntry.id },
          });
          return reload();
        }
        if (isApproval) {
          const expectedStatuses = approvalStatusMap[lastEntry.action];
          if (!expectedStatuses.includes(claim.status))
            throw new Error("Cannot clear, workflow advanced");
          await prisma.travelClaimStatusEntry.delete({
            where: { id: lastEntry.id },
          });
          let revertStatus = "SUBMITTED";
          if (lastEntry.action === "ESTABLISHMENT_VERIFIED")
            revertStatus = "APPROVED";
          else if (lastEntry.action === "PROCESS_STARTED")
            revertStatus = "VERIFIED";
          await updateStatusSafe(revertStatus, [
            "APPROVED",
            "VERIFIED",
            "UNDER_PROCESS",
            "SUBMITTED",
          ]);
          return reload();
        } else if (isRejection) {
          const rejectionStatuses = [
            "REJECTED",
            "REJECTED_OPS",
            "REJECTED_DG",
            "REJECTED_HR",
            "REJECTED_ACCOUNTS",
          ];
          if (!rejectionStatuses.includes(claim.status))
            throw new Error("Cannot clear rejection after further changes");
          await prisma.travelClaimStatusEntry.delete({
            where: { id: lastEntry.id },
          });
          let revertStatus = "SUBMITTED";
          if (lastEntry.action === "ESTABLISHMENT_REJECTED")
            revertStatus = "APPROVED";
          else if (lastEntry.action === "ACCOUNTS_REJECTED")
            revertStatus = "VERIFIED";
          await updateStatusSafe(revertStatus, [
            "APPROVED",
            "VERIFIED",
            "UNDER_PROCESS",
            "SUBMITTED",
          ]);
          return reload();
        }
        throw new Error("Unsupported decision type to clear");
      } else {
        throw new Error("Invalid action");
      }
    } catch (err) {
      if (err && err.__idempotentReturn) return claim; // silent idempotent success
      throw err;
    }
  },
  listAllForApprovers: async (ctx) => {
    // Super Admin retains full visibility
    if (ctx.isSuperAdmin) {
      const q = ctx.query || {};
      const andFilters = [];
      if (q.submission_from || q.submission_to) {
        andFilters.push({
          statusEntries: {
            some: {
              action: "SUBMITTED",
              createdAt: {
                gte: q.submission_from
                  ? new Date(q.submission_from)
                  : undefined,
                lte: q.submission_to ? new Date(q.submission_to) : undefined,
              },
            },
          },
        });
      }
      if (q.depart_from || q.depart_to) {
        andFilters.push({
          OR: [
            {
              from_date: {
                gte: q.depart_from ? new Date(q.depart_from) : undefined,
                lte: q.depart_to ? new Date(q.depart_to) : undefined,
              },
            },
            {
              request: {
                departure_date: {
                  gte: q.depart_from ? new Date(q.depart_from) : undefined,
                  lte: q.depart_to ? new Date(q.depart_to) : undefined,
                },
              },
            },
          ],
        });
      }
      return prisma.travelClaim.findMany({
        where: {
          is_deleted: false,
          ...(andFilters.length ? { AND: andFilters } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          employee: {
            include: {
              employmentRecords: {
                where: { is_current: true, is_deleted: false },
                include: {
                  designation: true,
                  department: true,
                  location: true,
                },
              },
            },
          },
          request: {
            include: {
              applicant: {
                include: {
                  employmentRecords: {
                    where: { is_current: true, is_deleted: false },
                    include: {
                      location: true,
                      designation: true,
                      department: true,
                    },
                  },
                },
              },
            },
          },
          documents: true,
          segments: true,
          statusEntries: {
            orderBy: { createdAt: "asc" },
            include: {
              actor: {
                include: {
                  employmentRecords: {
                    where: { is_current: true, is_deleted: false },
                    include: {
                      designation: true,
                      department: true,
                      location: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    const me = String(ctx.meEmpId || "");
    const orFilters = [];

    // Accounts: show Establishment-verified (status VERIFIED) and under process
    if (ctx.isAccountsApprover) {
      orFilters.push({ status: { in: ["VERIFIED", "UNDER_PROCESS"] } });
    }

    // Establishment: show only DG-approved (status APPROVED with DG_APPROVED)
    if (ctx.isEstablishment) {
      orFilters.push({
        status: "APPROVED",
        statusEntries: { some: { action: "DG_APPROVED" } },
      });
    }

    // DG: show recommended claims and claims by direct reports (fast-track)
    if (ctx.isDG || ctx.canApproveClaimDG) {
      orFilters.push({
        status: "SUBMITTED",
        OR: [
          // Any SUBMITTED with at least one recommendation
          { statusEntries: { some: { action: "RECOMMENDED" } } },
          // Direct report fast-track (no recommendation required)
          {
            employee: {
              employmentRecords: {
                some: {
                  is_current: true,
                  is_deleted: false,
                  reporting_officer_id: me,
                },
              },
            },
          },
          // Department-origin (explicit or legacy) to ensure visibility after recommendations
          {
            AND: [
              { statusEntries: { some: { action: "RECOMMENDED" } } },
              {
                OR: [
                  { created_by_department_id: { not: null } },
                  {
                    statusEntries: {
                      some: {
                        action: "SUBMITTED",
                        OR: [
                          {
                            remarks: {
                              contains: "[DEPT]",
                              mode: "insensitive",
                            },
                          },
                          {
                            remarks: {
                              contains: "department",
                              mode: "insensitive",
                            },
                          },
                          {
                            remarks: {
                              contains: "submitted by",
                              mode: "insensitive",
                            },
                          },
                        ],
                      },
                    },
                  },
                  {
                    statusEntries: {
                      some: { action: "SUBMITTED", actor_employee_id: null },
                    },
                  },
                ],
              },
            ],
          },
        ],
      });
    }

    // Other users (non-approvers): show only reportees' claims so they can recommend
    const isApprover =
      ctx.isEstablishment ||
      ctx.isDG ||
      ctx.isOps ||
      ctx.isAccountsApprover ||
      ctx.canApproveClaimOps ||
      ctx.canApproveClaimDG;
    if (!isApprover && ctx.meEmpId) {
      orFilters.push({
        status: "SUBMITTED",
        statusEntries: { none: { action: "RECOMMENDED" } },
        OR: [
          {
            request: {
              applicant: {
                employmentRecords: {
                  some: {
                    is_current: true,
                    is_deleted: false,
                    reporting_officer_id: me,
                  },
                },
              },
            },
          },
          {
            employee: {
              employmentRecords: {
                some: {
                  is_current: true,
                  is_deleted: false,
                  reporting_officer_id: me,
                },
              },
            },
          },
        ],
      });
    }

    // Always include claims where the current user has acted (approved/rejected/recommended)
    if (ctx.meEmpId) {
      orFilters.push({
        statusEntries: { some: { actor_employee_id: Number(ctx.meEmpId) } },
      });
    }
    // Department-account acted-by-me: include when any status entry remarks contain my email
    if (ctx.userEmail) {
      orFilters.push({
        statusEntries: {
          some: {
            remarks: { contains: String(ctx.userEmail), mode: "insensitive" },
          },
        },
      });
    }

    if (orFilters.length === 0) return [];

    // AND-level date filters
    const andFilters = [];
    const q = ctx.query || {};
    if (q.submission_from || q.submission_to) {
      andFilters.push({
        statusEntries: {
          some: {
            action: "SUBMITTED",
            createdAt: {
              gte: q.submission_from ? new Date(q.submission_from) : undefined,
              lte: q.submission_to ? new Date(q.submission_to) : undefined,
            },
          },
        },
      });
    }
    if (q.depart_from || q.depart_to) {
      andFilters.push({
        OR: [
          {
            from_date: {
              gte: q.depart_from ? new Date(q.depart_from) : undefined,
              lte: q.depart_to ? new Date(q.depart_to) : undefined,
            },
          },
          {
            request: {
              departure_date: {
                gte: q.depart_from ? new Date(q.depart_from) : undefined,
                lte: q.depart_to ? new Date(q.depart_to) : undefined,
              },
            },
          },
        ],
      });
    }

    return prisma.travelClaim.findMany({
      where: {
        is_deleted: false,
        OR: orFilters,
        ...(andFilters.length ? { AND: andFilters } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        // Include origin department graph to allow frontend to compute HoD/RO correctly
        createdByDepartment: {
          include: {
            head: {
              include: {
                employmentRecords: {
                  where: { is_current: true, is_deleted: false },
                },
              },
            },
          },
        },
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: { designation: true, department: true, location: true },
            },
          },
        },
        request: {
          include: {
            applicant: {
              include: {
                employmentRecords: {
                  where: { is_current: true, is_deleted: false },
                  include: {
                    location: true,
                    designation: true,
                    department: true,
                  },
                },
              },
            },
          },
        },
        documents: true,
        segments: true,
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: {
            actor: {
              include: {
                employmentRecords: {
                  where: { is_current: true, is_deleted: false },
                  include: {
                    designation: true,
                    department: true,
                    location: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },
  listForAccounts: async (ctx, filters) => {
    if (!(ctx.isSuperAdmin || ctx.isAccountsApprover)) return [];
    const where = {
      is_deleted: false,
      // Eligible for tranching either when processing has started (UNDER_PROCESS) or still VERIFIED
      status: { in: ["VERIFIED", "UNDER_PROCESS"] },
      statusEntries: { some: { action: "PROCESS_STARTED" } },
    };
    if (filters) {
      if (filters.employee_cnic)
        where.employee = {
          ...where.employee,
          cnic: {
            contains: String(filters.employee_cnic),
            mode: "insensitive",
          },
        };
      if (filters.employee_name)
        where.employee = {
          ...where.employee,
          full_name: {
            contains: String(filters.employee_name),
            mode: "insensitive",
          },
        };
      if (filters.statuses?.length) where.status = { in: filters.statuses };
      if (filters.from_date || filters.to_date)
        where.claim_date = {
          gte: filters.from_date ? new Date(filters.from_date) : undefined,
          lte: filters.to_date ? new Date(filters.to_date) : undefined,
        };
      if (filters.claim_from || filters.claim_to)
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              {
                from_date: {
                  gte: filters.claim_from
                    ? new Date(filters.claim_from)
                    : undefined,
                },
              },
              {
                to_date: {
                  lte: filters.claim_to
                    ? new Date(filters.claim_to)
                    : undefined,
                },
              },
            ],
          },
        ];
    }
    return prisma.travelClaim.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        employee: {
          include: {
            employmentRecords: {
              where: { is_current: true, is_deleted: false },
              include: {
                department: true,
                designation: true,
                location: true,
                salary: true,
              },
            },
          },
        },
        request: true,
        documents: true,
        segments: true,
        statusEntries: {
          orderBy: { createdAt: "asc" },
          include: { actor: true },
        },
      },
    });
  },
  createTranche: async (ctx, title, notes, claimIds) => {
    if (!(ctx.isSuperAdmin || ctx.isAccountsApprover))
      throw new Error("Forbidden");
    const meUserId = ctx.meUserId || Number(ctx.req?.session?.user?.id);
    if (!Array.isArray(claimIds) || claimIds.length === 0)
      throw new Error("No claims selected");
    // Only allow grouping of claims that Accounts has started processing
    const claims = await prisma.travelClaim.findMany({
      where: {
        id: { in: claimIds.map(Number) },
        status: { in: ["VERIFIED", "UNDER_PROCESS"] },
        is_deleted: false,
        statusEntries: { some: { action: "PROCESS_STARTED" } },
      },
    });
    if (claims.length !== claimIds.length)
      throw new Error("Some claims are not eligible");
    const code = `TR-${Date.now()}`;
    const tranche = await prisma.travelClaimTranche.create({
      data: {
        code,
        title: title || code,
        notes: notes || null,
        created_by_user_id: meUserId,
      },
    });
    await prisma.travelClaimTrancheItem.createMany({
      data: claims.map((c) => ({ tranche_id: tranche.id, claim_id: c.id })),
    });
    // Upon tranching, mark all to processed
    await prisma.travelClaim.updateMany({
      where: { id: { in: claims.map((c) => c.id) } },
      data: { status: "PROCESSED" },
    });
    // Do NOT create PROCESS_STARTED entries here; processing was already recorded
    return prisma.travelClaimTranche.findUnique({
      where: { id: tranche.id },
      include: {
        items: {
          include: {
            claim: {
              include: {
                // Full employee job context for PDF (Designation/Department/Location)
                employee: {
                  include: {
                    employmentRecords: {
                      where: { is_current: true, is_deleted: false },
                      include: {
                        designation: true,
                        department: true,
                        location: true,
                      },
                    },
                  },
                },
                // Documents and segments for embedding and calculations
                documents: true,
                segments: true,
                // Claim status history (actor with user for email)
                statusEntries: {
                  orderBy: { createdAt: "asc" },
                  include: { actor: { include: { user: true } } },
                },
                // Associated request with attendees and status history
                request: {
                  include: {
                    attendees: { include: { employee: true } },
                    statusEntries: {
                      orderBy: { createdAt: "asc" },
                      include: { actor: { include: { user: true } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  },
  listTranches: async (ctx) => {
    if (!(ctx.isSuperAdmin || ctx.isAccountsApprover)) return [];
    return prisma.travelClaimTranche.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            claim: {
              include: {
                employee: {
                  include: {
                    employmentRecords: {
                      where: { is_current: true, is_deleted: false },
                      include: {
                        designation: true,
                        department: true,
                        location: true,
                      },
                    },
                  },
                },
                documents: true,
                segments: true,
                statusEntries: {
                  orderBy: { createdAt: "asc" },
                  include: { actor: { include: { user: true } } },
                },
                request: {
                  include: {
                    attendees: { include: { employee: true } },
                    statusEntries: {
                      orderBy: { createdAt: "asc" },
                      include: { actor: { include: { user: true } } },
                    },
                  },
                },
              },
            },
          },
        },
        createdBy: true,
      },
    });
  },
  exportTrancheCsv: async (trancheId) => {
    const t = await prisma.travelClaimTranche.findUnique({
      where: { id: Number(trancheId) },
      include: {
        items: {
          include: {
            claim: {
              include: {
                employee: {
                  include: {
                    employmentRecords: {
                      where: { is_current: true, is_deleted: false },
                      include: {
                        salary: true,
                        department: true,
                        designation: true,
                      },
                    },
                  },
                },
                request: true,
              },
            },
          },
        },
      },
    });
    if (!t) throw new Error("Not found");
    const header = [
      "tranche_code",
      "claim_id",
      "request_id",
      "employee_id",
      "employee_name",
      "cnic",
      "dept",
      "designation",
      "bank_name",
      "account_no",
      "from_date",
      "to_date",
      "grand_total",
    ];
    const rows = [];
    for (const it of t.items) {
      const c = it.claim;
      const emp = c.employee;
      const empJob = emp?.employmentRecords?.[0];
      const sal = empJob?.salary;
      rows.push([
        t.code,
        c.id,
        c.travel_request_id || "",
        c.employee_id,
        emp?.full_name || "",
        emp?.cnic || "",
        empJob?.department?.name || "",
        empJob?.designation?.title || "",
        sal?.bank_name_primary || "",
        sal?.bank_account_primary || "",
        c.from_date ? new Date(c.from_date).toISOString().slice(0, 10) : "",
        c.to_date ? new Date(c.to_date).toISOString().slice(0, 10) : "",
        c.grand_total || 0,
      ]);
    }
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    return { code: t.code, csv };
  },
  // ...existing code...
};
