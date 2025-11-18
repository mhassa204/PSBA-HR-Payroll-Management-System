const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const payrollTranchService = {
  // Generate unique tranch code
  generateTranchCode: () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `TR-${timestamp}-${random}`;
  },

  // Create a payroll tranch
  createTranch: async (payrollIds, name, userId) => {
    try {
      const payrollIdsInt = Array.isArray(payrollIds)
        ? payrollIds.map((id) => parseInt(id))
        : [parseInt(payrollIds)];

      // Get all payrolls and calculate total
      const payrolls = await prisma.payroll.findMany({
        where: {
          id: { in: payrollIdsInt },
          is_deleted: false,
          status: "UNDER_PROCESS",
        },
      });

      if (payrolls.length === 0) {
        throw new Error("No valid payrolls to add to tranch");
      }

      if (payrolls.length !== payrollIdsInt.length) {
        throw new Error("Some payrolls are invalid or not under process");
      }

      const totalAmount = payrolls.reduce(
        (sum, p) => sum + (parseFloat(p.net_payable) || 0),
        0
      );

      const code = payrollTranchService.generateTranchCode();

      // Create tranch
      const tranch = await prisma.payrollTranch.create({
        data: {
          name: name || null,
          code,
          total_amount: totalAmount,
          payroll_count: payrolls.length,
          created_by_user_id: userId ? parseInt(userId) : null,
        },
      });

      // Update payrolls to link to tranch and mark as PROCESSED
      await prisma.payroll.updateMany({
        where: {
          id: { in: payrollIdsInt },
        },
        data: {
          tranche_id: tranch.id,
          status: "PROCESSED",
          processed_at: new Date(),
          processed_by_user_id: userId ? parseInt(userId) : null,
        },
      });

      // Fetch created tranch with related data
      const createdTranch = await prisma.payrollTranch.findUnique({
        where: { id: tranch.id },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
            },
          },
          payrolls: {
            include: {
              employee: {
                select: {
                  id: true,
                  full_name: true,
                },
              },
            },
          },
        },
      });

      return {
        success: true,
        tranch: createdTranch,
      };
    } catch (error) {
      console.error("Error in createTranch:", error);
      throw error;
    }
  },

  // Get all tranches
  getAllTranches: async (page = 1, limit = 50) => {
    try {
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        is_deleted: false,
      };

      const [tranches, total] = await Promise.all([
        prisma.payrollTranch.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            createdBy: {
              select: {
                id: true,
                email: true,
              },
            },
            _count: {
              select: {
                payrolls: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.payrollTranch.count({ where }),
      ]);

      return {
        success: true,
        tranches,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      console.error("Error in getAllTranches:", error);
      throw error;
    }
  },

  // Get a single tranch by ID
  getTranchById: async (tranchId) => {
    try {
      const tranch = await prisma.payrollTranch.findFirst({
        where: {
          id: parseInt(tranchId),
          is_deleted: false,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              email: true,
            },
          },
          payrolls: {
            include: {
              employee: {
                select: {
                  id: true,
                  full_name: true,
                  cnic: true,
                  mobile_number: true,
                },
              },
            },
            orderBy: [{ year: "desc" }, { month: "desc" }],
          },
        },
      });

      if (!tranch) {
        throw new Error("Tranch not found");
      }

      return {
        success: true,
        tranch,
      };
    } catch (error) {
      console.error("Error in getTranchById:", error);
      throw error;
    }
  },
};

module.exports = payrollTranchService;
