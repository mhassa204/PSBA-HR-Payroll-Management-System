// Use shared prisma singleton instead of creating a new client
const prisma = require("../utils/prisma");

const employmentHistoryService = {
  /**
   * Categorize field changes into history types
   */
  categorizeChange: (fieldName) => {
    const categoryMap = {
      // Transfer (location changes)
      location_id: "TRANSFER",

      // Redesignation (department, designation, role changes)
      department_id: "REDESIGNATION",
      designation_id: "REDESIGNATION",
      role_tag_id: "REDESIGNATION",
      scale_grade_id: "REDESIGNATION",

      // Salary changes
      basic_salary: "SALARY",
      gross_salary: "SALARY",
      medical_allowance: "SALARY",
      house_rent: "SALARY",
      conveyance_allowance: "SALARY",
      other_allowances: "SALARY",
      daily_wage_rate: "SALARY",
      bank_account_primary: "SALARY",
      bank_name_primary: "SALARY",
      payment_mode: "SALARY",
      salary_effective_from: "SALARY",
      salary_effective_till: "SALARY",
      payroll_status: "SALARY",

      // Status changes
      employment_status: "STATUS",
      is_current: "STATUS",
      filer_status: "STATUS",
      filer_active_status: "STATUS",
      is_on_probation: "STATUS",
      employment_type: "STATUS",

      // Contract changes
      contract_type: "CONTRACT",
      contract_number: "CONTRACT",
      start_date: "CONTRACT",
      end_date: "CONTRACT",
      renewal_count: "CONTRACT",
      confirmation_status: "CONTRACT",
      confirmation_date: "CONTRACT",
      is_renewed: "CONTRACT",

      // Other changes
      reporting_officer_id: "OTHER",
      office_location: "OTHER",
      remarks: "OTHER",
      effective_from: "OTHER",
      effective_till: "OTHER",
      probation_end_date: "OTHER",
    };

    return categoryMap[fieldName] || "OTHER";
  },

  /**
   * Get human-readable label for a field value
   */
  async getFieldLabel(tx, fieldName, value) {
    if (!value && value !== 0 && value !== false) return null;

    // Handle Date objects
    if (value instanceof Date) {
      return value.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    // Handle boolean values
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    const valueStr = String(value);
    const valueInt = parseInt(valueStr);

    switch (fieldName) {
      case "department_id":
        if (isNaN(valueInt)) return valueStr;
        const dept = await tx.department.findUnique({
          where: { id: valueInt },
        });
        return dept ? dept.name : valueStr;

      case "designation_id":
        if (isNaN(valueInt)) return valueStr;
        const desig = await tx.designation.findUnique({
          where: { id: valueInt },
        });
        return desig ? desig.title : valueStr;

      case "role_tag_id":
        if (isNaN(valueInt)) return valueStr;
        const roleTag = await tx.roleTag.findUnique({
          where: { id: valueInt },
        });
        return roleTag ? roleTag.name : valueStr;

      case "scale_grade_id":
        if (isNaN(valueInt)) return valueStr;
        const scaleGrade = await tx.scaleGrade.findUnique({
          where: { id: valueInt },
        });
        return scaleGrade ? scaleGrade.name : valueStr;

      case "location_id":
        if (isNaN(valueInt)) return valueStr;
        const location = await tx.location.findUnique({
          where: { id: valueInt },
          include: { city: { include: { district: true } } },
        });
        return location
          ? `${location.name}${
              location.city
                ? `, ${location.city.name}${
                    location.city.district
                      ? `, ${location.city.district.name}`
                      : ""
                  }`
                : ""
            }`
          : valueStr;

      default:
        return valueStr;
    }
  },

  /**
   * Generate a human-readable change description
   */
  async generateChangeDescription(tx, fieldName, oldValueLabel, newValueLabel) {
    switch (fieldName) {
      case "location_id":
        return oldValueLabel
          ? `Transferred from ${oldValueLabel} to ${newValueLabel}`
          : `Transferred to ${newValueLabel}`;

      case "department_id":
        return oldValueLabel
          ? `Department changed from ${oldValueLabel} to ${newValueLabel}`
          : `Department set to ${newValueLabel}`;

      case "designation_id":
        return oldValueLabel
          ? `Designation changed from ${oldValueLabel} to ${newValueLabel}`
          : `Designation set to ${newValueLabel}`;

      case "role_tag_id":
        return oldValueLabel
          ? `Role Tag changed from ${oldValueLabel} to ${newValueLabel}`
          : `Role Tag set to ${newValueLabel}`;

      case "scale_grade_id":
        return oldValueLabel
          ? `Scale Grade changed from ${oldValueLabel} to ${newValueLabel}`
          : `Scale Grade set to ${newValueLabel}`;

      case "employment_status":
        return oldValueLabel
          ? `Status changed from ${oldValueLabel} to ${newValueLabel}`
          : `Status set to ${newValueLabel}`;

      case "is_current":
        if (oldValueLabel === "Yes" && newValueLabel === "No") {
          return "Removed current employment status";
        } else if (oldValueLabel === "No" && newValueLabel === "Yes") {
          return "Marked as current employment";
        }
        return oldValueLabel
          ? `Current status changed from ${oldValueLabel} to ${newValueLabel}`
          : `Current status set to ${newValueLabel}`;

      case "basic_salary":
      case "gross_salary":
      case "medical_allowance":
      case "house_rent":
      case "conveyance_allowance":
      case "other_allowances":
        const fieldNameReadable = fieldName
          .replace("_", " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        return oldValueLabel
          ? `${fieldNameReadable} changed from ${oldValueLabel} to ${newValueLabel}`
          : `${fieldNameReadable} set to ${newValueLabel}`;

      case "is_on_probation":
        if (oldValueLabel === "Yes" && newValueLabel === "No") {
          return "Removed from probation";
        } else if (oldValueLabel === "No" && newValueLabel === "Yes") {
          return "Placed on probation";
        }
        return oldValueLabel
          ? `Probation status changed from ${oldValueLabel} to ${newValueLabel}`
          : `Probation status set to ${newValueLabel}`;

      default:
        return oldValueLabel
          ? `Changed from ${oldValueLabel} to ${newValueLabel}`
          : `Set to ${newValueLabel}`;
    }
  },

  /**
   * Track changes to employment record
   */
  async trackEmploymentChanges(
    tx,
    employmentId,
    oldData,
    newData,
    changedBy = null
  ) {
    const changes = [];

    // Helper function to normalize values for comparison
    const normalizeForComparison = (value) => {
      if (value === null || value === undefined) return null;
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === "boolean") {
        return value ? true : false;
      }
      return value;
    };

    // Compare basic employment fields
    const employmentFields = [
      "department_id",
      "designation_id",
      "role_tag_id",
      "scale_grade_id",
      "location_id",
      "employment_type",
      "employment_status",
      "is_current",
      "filer_status",
      "filer_active_status",
      "is_on_probation",
      "probation_end_date",
      "reporting_officer_id",
      "office_location",
      "remarks",
      "effective_from",
      "effective_till",
    ];

    for (const field of employmentFields) {
      const oldVal = oldData[field];
      const newVal = newData[field];

      const normalizedOldVal = normalizeForComparison(oldVal);
      const normalizedNewVal = normalizeForComparison(newVal);

      // Skip if values are the same or both undefined/null
      if (
        normalizedOldVal === normalizedNewVal ||
        (oldVal === undefined && newVal === undefined)
      ) {
        continue;
      }

      // Only track if value actually changed
      if (normalizedOldVal !== normalizedNewVal) {
        changes.push({ field, oldVal, newVal });
      }
    }

    // Compare salary fields if salary data is present
    if (newData.salary) {
      const oldSalary = oldData.salary || {};
      const newSalary = newData.salary;

      const salaryFields = [
        "basic_salary",
        "gross_salary",
        "medical_allowance",
        "house_rent",
        "conveyance_allowance",
        "other_allowances",
        "daily_wage_rate",
        "bank_account_primary",
        "bank_name_primary",
        "payment_mode",
        "salary_effective_from",
        "salary_effective_till",
        "payroll_status",
      ];

      for (const field of salaryFields) {
        const oldVal = oldSalary[field];
        const newVal = newSalary[field];

        if (
          oldVal !== newVal &&
          (oldVal !== undefined || newVal !== undefined)
        ) {
          changes.push({ field, oldVal, newVal });
        }
      }
    }

    // Compare contract fields if contract data is present
    if (newData.contract) {
      const oldContract = oldData.contract || {};
      const newContract = newData.contract;

      const contractFields = [
        "contract_type",
        "contract_number",
        "start_date",
        "end_date",
        "renewal_count",
        "confirmation_status",
        "confirmation_date",
        "is_renewed",
      ];

      for (const field of contractFields) {
        const oldVal = oldContract[field];
        const newVal = newContract[field];

        if (
          oldVal !== newVal &&
          (oldVal !== undefined || newVal !== undefined)
        ) {
          changes.push({ field, oldVal, newVal });
        }
      }
    }

    // Helper function to format value for storage
    const formatValueForStorage = (value) => {
      if (value === null || value === undefined) return null;
      if (value instanceof Date) {
        return value.toISOString().split("T")[0]; // YYYY-MM-DD format
      }
      if (typeof value === "boolean") {
        return value ? "true" : "false";
      }
      return String(value);
    };

    // Create history records for each change
    for (const change of changes) {
      const historyType = this.categorizeChange(change.field);
      const oldValueLabel = await this.getFieldLabel(
        tx,
        change.field,
        change.oldVal
      );
      const newValueLabel = await this.getFieldLabel(
        tx,
        change.field,
        change.newVal
      );
      const changeDescription = await this.generateChangeDescription(
        tx,
        change.field,
        oldValueLabel,
        newValueLabel
      );

      await tx.employmentHistory.create({
        data: {
          employment_id: employmentId,
          history_type: historyType,
          field_name: change.field,
          old_value: formatValueForStorage(change.oldVal),
          new_value: formatValueForStorage(change.newVal),
          old_value_label: oldValueLabel,
          new_value_label: newValueLabel,
          change_description: changeDescription,
          changed_by: changedBy ? parseInt(changedBy) : null,
          changed_at: new Date(),
        },
      });
    }

    return changes;
  },

  /**
   * Get employment history by employment ID
   */
  async getEmploymentHistory(employmentId, filters = {}) {
    const { historyType, limit, offset } = filters;

    const where = { employment_id: parseInt(employmentId) };
    if (historyType) {
      where.history_type = historyType;
    }

    const [history, total] = await Promise.all([
      prisma.employmentHistory.findMany({
        where,
        orderBy: { changed_at: "desc" },
        ...(limit && { take: parseInt(limit) }),
        ...(offset && { skip: parseInt(offset) }),
      }),
      prisma.employmentHistory.count({ where }),
    ]);

    return { history, total };
  },

  /**
   * Get history grouped by type
   */
  async getGroupedHistory(employmentId) {
    const history = await prisma.employmentHistory.findMany({
      where: { employment_id: parseInt(employmentId) },
      orderBy: { changed_at: "desc" },
    });

    // Group by history_type
    const grouped = {
      TRANSFER: [],
      REDESIGNATION: [],
      SALARY: [],
      STATUS: [],
      CONTRACT: [],
      OTHER: [],
    };

    history.forEach((item) => {
      if (grouped[item.history_type]) {
        grouped[item.history_type].push(item);
      } else {
        grouped.OTHER.push(item);
      }
    });

    return grouped;
  },

  /**
   * Get history statistics
   */
  async getHistoryStats(employmentId) {
    const stats = await prisma.employmentHistory.groupBy({
      by: ["history_type"],
      where: { employment_id: parseInt(employmentId) },
      _count: { history_type: true },
    });

    return stats.reduce((acc, stat) => {
      acc[stat.history_type] = stat._count.history_type;
      return acc;
    }, {});
  },

  /**
   * Delete a single history record
   */
  async deleteHistory(historyId) {
    await prisma.employmentHistory.delete({
      where: { id: parseInt(historyId) },
    });
    return true;
  },

  /**
   * Delete multiple history records
   */
  async deleteMultipleHistory(historyIds) {
    await prisma.employmentHistory.deleteMany({
      where: {
        id: { in: historyIds.map((id) => parseInt(id)) },
      },
    });
    return true;
  },

  /**
   * Delete all history for an employment
   */
  async deleteAllHistory(employmentId) {
    await prisma.employmentHistory.deleteMany({
      where: { employment_id: parseInt(employmentId) },
    });
    return true;
  },

  /**
   * Manually create a history record (user-entered)
   */
  async createManualHistory(employmentId, data) {
    const employment_id = parseInt(employmentId);
    if (Number.isNaN(employment_id)) throw new Error("Invalid employmentId");

    const {
      field_name = null,
      history_type = null,
      old_value = null,
      new_value = null,
      old_value_label = null,
      new_value_label = null,
      change_description = null,
      remarks = null,
      changed_by = null,
      changed_at = null,
    } = data;

    // Derive history type if not provided but field_name exists
    let finalHistoryType = history_type;
    if (!finalHistoryType) {
      finalHistoryType = field_name
        ? employmentHistoryService.categorizeChange(field_name)
        : "OTHER";
    }

    // If labels not provided attempt to derive simple labels from raw values
    const deriveLabel = (val) => {
      if (val === null || val === undefined) return null;
      if (val === true || val === false) return val ? "Yes" : "No";
      if (val instanceof Date) return val.toISOString().split("T")[0];
      return String(val);
    };

    const finalOldLabel = old_value_label || deriveLabel(old_value);
    const finalNewLabel = new_value_label || deriveLabel(new_value);

    let finalDescription = change_description;
    if (!finalDescription && field_name) {
      // Reuse existing description generator if field_name supplied
      finalDescription =
        await employmentHistoryService.generateChangeDescription(
          prisma,
          field_name,
          finalOldLabel,
          finalNewLabel
        );
    }
    if (!finalDescription && !field_name) {
      finalDescription = "Manual entry";
    }

    // Allow manual timestamp
    let manualChangedAt = new Date();
    if (changed_at) {
      const parsed = new Date(changed_at);
      if (!isNaN(parsed.getTime())) manualChangedAt = parsed;
    }

    const record = await prisma.employmentHistory.create({
      data: {
        employment_id,
        history_type: finalHistoryType,
        field_name: field_name || "manual",
        old_value: old_value === undefined ? null : String(old_value),
        new_value: new_value === undefined ? null : String(new_value),
        old_value_label: finalOldLabel,
        new_value_label: finalNewLabel,
        change_description: finalDescription,
        changed_by: changed_by ? parseInt(changed_by) : null,
        remarks: remarks || null,
        changed_at: manualChangedAt,
      },
    });
    return record;
  },

  /**
   * Update a manually created history record
   */
  async updateManualHistory(historyId, data) {
    const id = parseInt(historyId);
    if (Number.isNaN(id)) throw new Error("Invalid historyId");

    const existing = await prisma.employmentHistory.findUnique({
      where: { id },
    });
    if (!existing) throw new Error("History record not found");

    const {
      field_name = existing.field_name,
      history_type = existing.history_type,
      old_value = existing.old_value,
      new_value = existing.new_value,
      old_value_label = existing.old_value_label,
      new_value_label = existing.new_value_label,
      change_description = existing.change_description,
      remarks = existing.remarks,
      changed_by = existing.changed_by,
      changed_at = existing.changed_at,
    } = data;

    // Re-categorize if field_name changed and explicit history_type not supplied
    let finalHistoryType = history_type;
    if (
      (!history_type || history_type === existing.history_type) &&
      field_name !== existing.field_name
    ) {
      finalHistoryType = employmentHistoryService.categorizeChange(field_name);
    }

    // Derive description again if field/value changed and no custom description provided
    let finalDescription = change_description;
    if (!finalDescription) {
      finalDescription =
        await employmentHistoryService.generateChangeDescription(
          prisma,
          field_name,
          old_value_label || old_value,
          new_value_label || new_value
        );
    }

    // Manual timestamp update if provided
    let finalChangedAt = existing.changed_at;
    if (changed_at) {
      const parsed = new Date(changed_at);
      if (!isNaN(parsed.getTime())) finalChangedAt = parsed;
    }

    const updated = await prisma.employmentHistory.update({
      where: { id },
      data: {
        field_name,
        history_type: finalHistoryType,
        old_value: old_value,
        new_value: new_value,
        old_value_label: old_value_label,
        new_value_label: new_value_label,
        change_description: finalDescription,
        remarks,
        changed_by: changed_by ? parseInt(changed_by) : null,
        changed_at: finalChangedAt,
      },
    });
    return updated;
  },
};

module.exports = employmentHistoryService;
