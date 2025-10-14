const { PrismaClient } = require("@prisma/client");
const { encrypt } = require("../utils/cryptoUtil");
const prisma = new PrismaClient();

class UserService {
  async getAllUsers() {
    try {
      const users = await prisma.user.findMany({
        where: {
          is_deleted: false,
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          employee: {
            select: {
              id: true,
              full_name: true,
              employee_id: true,
            },
          },
          // New: include linked department if any
          department: {
            select: { id: true, name: true, code: true },
          },
          // New: include linked location if any
          location: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      return { users };
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  async getUserById(id) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          id: parseInt(id),
          is_deleted: false,
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              type: true,
              enabled: true,
              fields: true,
            },
          },
          employee: {
            select: {
              id: true,
              full_name: true,
              employee_id: true,
              email: true,
            },
          },
          // New: include department
          department: { select: { id: true, name: true, code: true } },
          // New: include location
          location: { select: { id: true, name: true, type: true } },
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return { user };
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  async createUser(userData) {
    try {
      console.log("Creating user with data:", {
        ...userData,
        password: "[HIDDEN]",
      });

      // Check if email already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          email: userData.email,
          is_deleted: false,
        },
      });

      if (existingUser) {
        throw new Error("Email already exists");
      }

      // Check if employee is already assigned to another user
      if (userData.employee_id) {
        const existingEmployeeUser = await prisma.user.findFirst({
          where: {
            employee_id: parseInt(userData.employee_id),
            is_deleted: false,
          },
        });

        if (existingEmployeeUser) {
          throw new Error("Employee is already assigned to another user");
        }
      }

      // Validate department if provided
      let departmentId = null;
      if (
        userData.department_id != null &&
        String(userData.department_id).trim() !== ""
      ) {
        const depIdParsed = parseInt(userData.department_id);
        if (!Number.isInteger(depIdParsed) || depIdParsed <= 0) {
          throw new Error("Invalid department");
        }
        const dep = await prisma.department.findFirst({
          where: { id: depIdParsed, is_deleted: false },
        });
        if (!dep) throw new Error("Department not found");
        departmentId = depIdParsed;
      }

      // Validate location if provided
      let locationId = null;
      if (
        userData.location_id != null &&
        String(userData.location_id).trim() !== ""
      ) {
        const locIdParsed = parseInt(userData.location_id);
        if (!Number.isInteger(locIdParsed) || locIdParsed <= 0) {
          throw new Error("Invalid location");
        }
        const loc = await prisma.location.findFirst({
          where: { id: locIdParsed, is_deleted: false },
        });
        if (!loc) throw new Error("Location not found");
        locationId = locIdParsed;
      }

      // Encrypt password
      const encryptedPassword = encrypt(userData.password);

      const userDataToCreate = {
        email: userData.email,
        password: encryptedPassword,
        role_id: parseInt(userData.role_id),
        employee_id: null, // Always set to null initially
        department_id: departmentId,
        location_id: locationId,
      };

      // Only set employee_id if it's provided and not null/empty
      if (
        userData.employee_id &&
        userData.employee_id.toString().trim() !== ""
      ) {
        userDataToCreate.employee_id = parseInt(userData.employee_id);
      }

      console.log("Final user data to create:", {
        ...userDataToCreate,
        password: "[HIDDEN]",
      });

      const user = await prisma.user.create({
        data: userDataToCreate,
        include: {
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          employee: {
            select: {
              id: true,
              full_name: true,
              employee_id: true,
            },
          },
          department: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, type: true } },
        },
      });

      console.log("User created successfully:", user.id);
      return { user };
    } catch (error) {
      console.error("Error in createUser:", error);
      if (error.code === "P2002") {
        if (error.meta?.target?.includes("employee_id")) {
          throw new Error("Employee is already assigned to another user");
        } else if (error.meta?.target?.includes("email")) {
          throw new Error("Email already exists");
        }
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  async updateUser(id, userData) {
    try {
      const existingUser = await prisma.user.findFirst({
        where: {
          id: parseInt(id),
          is_deleted: false,
        },
      });

      if (!existingUser) {
        throw new Error("User not found");
      }

      // Check if email already exists for other users
      if (userData.email && userData.email !== existingUser.email) {
        const emailExists = await prisma.user.findFirst({
          where: {
            email: userData.email,
            is_deleted: false,
            id: { not: parseInt(id) },
          },
        });

        if (emailExists) {
          throw new Error("Email already exists");
        }
      }

      // Check if employee is already assigned to another user
      if (
        userData.employee_id &&
        userData.employee_id !== existingUser.employee_id
      ) {
        const existingEmployeeUser = await prisma.user.findFirst({
          where: {
            employee_id: parseInt(userData.employee_id),
            is_deleted: false,
            id: { not: parseInt(id) },
          },
        });

        if (existingEmployeeUser) {
          throw new Error("Employee is already assigned to another user");
        }
      }

      // Validate department if provided (empty clears it)
      let departmentId = null;
      if (
        userData.department_id != null &&
        String(userData.department_id).trim() !== ""
      ) {
        const depIdParsed = parseInt(userData.department_id);
        if (!Number.isInteger(depIdParsed) || depIdParsed <= 0) {
          throw new Error("Invalid department");
        }
        const dep = await prisma.department.findFirst({
          where: { id: depIdParsed, is_deleted: false },
        });
        if (!dep) throw new Error("Department not found");
        departmentId = depIdParsed;
      }

      // Validate location if provided (empty clears it)
      let locationId = null;
      if (
        userData.location_id != null &&
        String(userData.location_id).trim() !== ""
      ) {
        const locIdParsed = parseInt(userData.location_id);
        if (!Number.isInteger(locIdParsed) || locIdParsed <= 0) {
          throw new Error("Invalid location");
        }
        const loc = await prisma.location.findFirst({
          where: { id: locIdParsed, is_deleted: false },
        });
        if (!loc) throw new Error("Location not found");
        locationId = locIdParsed;
      }

      const updateData = {
        email: userData.email,
        role_id: parseInt(userData.role_id),
        employee_id: null, // Always set to null initially
        department_id: departmentId,
        location_id: locationId,
      };

      // Only set employee_id if it's provided and not null/empty
      if (
        userData.employee_id &&
        userData.employee_id.toString().trim() !== ""
      ) {
        updateData.employee_id = parseInt(userData.employee_id);
      }

      // Only update password if provided
      if (userData.password) {
        updateData.password = encrypt(userData.password);
      }

      const user = await prisma.user.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          employee: {
            select: {
              id: true,
              full_name: true,
              employee_id: true,
            },
          },
          department: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, type: true } },
        },
      });

      return { user };
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async deleteUser(id) {
    try {
      const existingUser = await prisma.user.findFirst({
        where: {
          id: parseInt(id),
          is_deleted: false,
        },
      });

      if (!existingUser) {
        throw new Error("User not found");
      }

      await prisma.user.update({
        where: { id: parseInt(id) },
        data: { is_deleted: true },
      });

      return { message: "User deleted successfully" };
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async getAvailableEmployees() {
    try {
      console.log("Fetching available employees...");

      // Use a direct query to get employees without user assignments
      const availableEmployees = await prisma.employee.findMany({
        where: {
          is_deleted: false,
          user: null, // This checks if the employee has no user relation
        },
        select: {
          id: true,
          full_name: true,
          employee_id: true,
          email: true,
          cnic: true,
        },
        orderBy: {
          full_name: "asc",
        },
      });

      console.log(`Available employees found: ${availableEmployees.length}`);

      // If the direct query doesn't work, fall back to the filtering approach
      if (availableEmployees.length === 0) {
        console.log(
          "Direct query returned 0 employees, trying filtering approach..."
        );

        const allEmployees = await prisma.employee.findMany({
          where: { is_deleted: false },
          select: {
            id: true,
            full_name: true,
            employee_id: true,
            email: true,
            cnic: true,
          },
        });

        const assignedUsers = await prisma.user.findMany({
          where: { is_deleted: false, employee_id: { not: null } },
          select: { employee_id: true },
        });

        const assignedIds = assignedUsers.map((u) => u.employee_id);
        const filteredEmployees = allEmployees.filter(
          (emp) => !assignedIds.includes(emp.id)
        );

        console.log(
          `Filtered approach returned: ${filteredEmployees.length} employees`
        );
        return { employees: filteredEmployees };
      }

      return { employees: availableEmployees };
    } catch (error) {
      console.error("Error in getAvailableEmployees:", error);
      throw new Error(`Failed to fetch available employees: ${error.message}`);
    }
  }
}

module.exports = new UserService();
