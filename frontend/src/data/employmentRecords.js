// Dummy data for employment records - PostgreSQL structure
// This simulates the employment_records table with foreign key to employees

let employmentRecordIdCounter = 15; // Starting counter for new records

export const dummyEmploymentRecords = [
  // Ahmed Ali Khan (employee_id: 1) - Multiple records across organizations
  {
    id: 1,
    employee_id: 1,
    organization: "MBWO",
    designation: "Junior Engineer",
    start_date: "2011-01-15",
    end_date: "2012-12-31",
    salary: 45000,
    employment_type: "Contract",
    department: "Engineering",
    office_location: "Lahore Office",
    scale_grade: "BPS-17",
    employment_status: "active",
    is_current: false,
    remarks: "Initial appointment in MBWO",
    created_at: "2024-01-15T10:30:00Z"
  },
  {
    id: 2,
    employee_id: 1,
    organization: "MBWO",
    designation: "Assistant Engineer",
    start_date: "2013-01-01",
    end_date: "2014-06-30",
    salary: 55000,
    employment_type: "Regular",
    department: "Engineering",
    office_location: "Lahore Office",
    scale_grade: "BPS-18",
    employment_status: "active",
    is_current: false,
    remarks: "Promotion and salary increase",
    created_at: "2024-01-15T10:30:00Z"
  },
  {
    id: 3,
    employee_id: 1,
    organization: "MBWO",
    designation: "Engineer",
    start_date: "2014-07-01",
    end_date: "2015-12-31",
    salary: 65000,
    employment_type: "Regular",
    department: "Engineering",
    office_location: "Lahore Office",
    scale_grade: "BPS-19",
    employment_status: "active",
    is_current: false,
    remarks: "Final promotion in MBWO",
    created_at: "2024-01-15T10:30:00Z"
  },
  {
    id: 4,
    employee_id: 1,
    organization: "PMBMC",
    designation: "Senior Engineer",
    start_date: "2016-01-01",
    end_date: "2018-12-31",
    salary: 75000,
    employment_type: "Regular",
    department: "Engineering",
    office_location: "PMBMC Head Office",
    scale_grade: "BPS-20",
    employment_status: "active",
    is_current: false,
    remarks: "Transferred to PMBMC",
    created_at: "2024-01-15T10:30:00Z"
  },
  {
    id: 5,
    employee_id: 1,
    organization: "PMBMC",
    designation: "Assistant Manager",
    start_date: "2019-01-01",
    end_date: "2022-06-30",
    salary: 90000,
    employment_type: "Regular",
    department: "Engineering",
    office_location: "PMBMC Head Office",
    remarks: "Promoted to management role",
    created_at: "2024-01-15T10:30:00Z"
  },
  {
    id: 6,
    employee_id: 1,
    organization: "PMBMC",
    designation: "Manager",
    start_date: "2022-07-01",
    end_date: "2024-12-31",
    salary: 110000,
    scale_grade:"BS-14",
    employment_type: "Regular",
    department: "Engineering",
    office_location: "PMBMC Head Office",
    remarks: "Final position in PMBMC",
    created_at: "2024-01-15T10:30:00Z"
  },
  {
    id: 7,
    employee_id: 1,
    organization: "PSBA",
    designation: "Deputy Director Engineering",
    start_date: "2025-01-01",
    end_date: null, // Currently working
    salary: 130000,
    employment_type: "Regular",
    department: "Engineering",
    office_location: "PSBA Headquarters",
    scale_grade: "BPS-21",
    employment_status: "active",
    is_current: true,
    remarks: "Current position in PSBA",
    created_at: "2024-01-15T10:30:00Z"
  },

  // Sara Fatima (employee_id: 2) - IT background
  {
    id: 8,
    employee_id: 2,
    organization: "PMBMC",
    designation: "Software Developer",
    start_date: "2019-03-01",
    end_date: "2021-12-31",
    salary: 70000,
    employment_type: "Contract",
    department: "IT",
    office_location: "PMBMC IT Center",
    scale_grade: "Grade-A",
    employment_status: "active",
    is_current: false,
    scale_grade:"BS-14",
    remarks: "Joined directly in PMBMC",
    created_at: "2024-02-20T14:15:00Z"
  },
  {
    id: 9,
    employee_id: 2,
    organization: "PMBMC",
    designation: "Senior Software Developer",
    start_date: "2022-01-01",
    end_date: "2024-12-31",
    salary: 85000,
    employment_type: "Regular",
    department: "IT",
    scale_grade:"BS-14",
    office_location: "PMBMC IT Center",
    remarks: "Promotion with permanent status",
    created_at: "2024-02-20T14:15:00Z"
  },
  {
    id: 10,
    employee_id: 2,
    organization: "PSBA",
    designation: "IT Manager",
    start_date: "2025-01-01",
    end_date: null, // Currently working
    salary: 105000,
    employment_type: "Regular",
    department: "IT",
    office_location: "PSBA IT Division",
    scale_grade: "BPS-19",
    employment_status: "active",
    is_current: true,
    scale_grade:"BS-14",
    remarks: "Promoted to management in PSBA",
    created_at: "2024-02-20T14:15:00Z"
  },

  // Muhammad Hassan (employee_id: 3) - Administrative role
  {
    id: 11,
    employee_id: 3,
    organization: "PSBA",
    designation: "Administrative Officer",
    start_date: "2025-01-15",
    end_date: null, // Currently working
    salary: 60000,
    employment_type: "Contract",
    scale_grade:"BS-14",
    department: "Administration",
    office_location: "PSBA Admin Block",
    remarks: "New hire directly in PSBA",
    created_at: "2024-03-10T09:45:00Z"
  },

  // Ayesha Malik (employee_id: 4) - HR background
  {
    id: 12,
    employee_id: 4,
    organization: "PMBMC",
    designation: "HR Officer",
    start_date: "2020-06-01",
    end_date: "2023-05-31",
    salary: 65000,
    employment_type: "Regular",
    department: "HR",
    scale_grade:"BS-14",
    office_location: "PMBMC HR Department",
    remarks: "Experienced hire in PMBMC",
    created_at: "2024-04-05T11:20:00Z"
  },
  {
    id: 13,
    employee_id: 4,
    organization: "PMBMC",
    designation: "Senior HR Officer",
    start_date: "2023-06-01",
    end_date: "2024-12-31",
    salary: 80000,
    scale_grade:"BS-14",
    employment_type: "Regular",
    department: "HR",
    office_location: "PMBMC HR Department",
    remarks: "Promoted to senior position",
    created_at: "2024-04-05T11:20:00Z"
  },
  {
    id: 14,
    employee_id: 4,
    organization: "PSBA",
    designation: "HR Manager",
    start_date: "2025-01-01",
    end_date: null, // Currently working
    salary: 95000,
    employment_type: "Regular",
    department: "HR",
    scale_grade:"BS-14",
    office_location: "PSBA HR Division",
    remarks: "Transferred to PSBA as manager",
    created_at: "2024-04-05T11:20:00Z"
  }
];

// Helper functions for employment record operations
export const createEmploymentRecord = (recordData) => {
  const newRecord = {
    id: employmentRecordIdCounter++,
    ...recordData,
    created_at: new Date().toISOString()
  };
  
  dummyEmploymentRecords.push(newRecord);
  return newRecord;
};

export const getEmploymentRecordsByEmployeeId = (employeeId) => {
  return dummyEmploymentRecords
    .filter(record => record.employee_id === parseInt(employeeId))
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
};

export const updateEmploymentRecord = (id, updateData) => {
  const index = dummyEmploymentRecords.findIndex(record => record.id === parseInt(id));
  if (index !== -1) {
    dummyEmploymentRecords[index] = {
      ...dummyEmploymentRecords[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    return dummyEmploymentRecords[index];
  }
  return null;
};

export const deleteEmploymentRecord = (id) => {
  const index = dummyEmploymentRecords.findIndex(record => record.id === parseInt(id));
  if (index !== -1) {
    return dummyEmploymentRecords.splice(index, 1)[0];
  }
  return null;
};

export const getEmploymentRecordsByOrganization = (organization) => {
  return dummyEmploymentRecords.filter(record => record.organization === organization);
};

export const getCurrentEmploymentRecords = () => {
  return dummyEmploymentRecords.filter(record => record.end_date === null);
};

export const getEmploymentHistory = (employeeId) => {
  const records = getEmploymentRecordsByEmployeeId(employeeId);
  
  // Group by organization for better display
  const groupedRecords = records.reduce((acc, record) => {
    if (!acc[record.organization]) {
      acc[record.organization] = [];
    }
    acc[record.organization].push(record);
    return acc;
  }, {});

  return {
    all_records: records,
    by_organization: groupedRecords,
    total_records: records.length,
    current_position: records.find(record => record.end_date === null) || null
  };
};

// Statistics functions
export const getEmploymentStatistics = () => {
  const totalRecords = dummyEmploymentRecords.length;
  const currentEmployees = getCurrentEmploymentRecords().length;
  
  const byOrganization = dummyEmploymentRecords.reduce((acc, record) => {
    acc[record.organization] = (acc[record.organization] || 0) + 1;
    return acc;
  }, {});

  const byDepartment = dummyEmploymentRecords.reduce((acc, record) => {
    if (record.department) {
      acc[record.department] = (acc[record.department] || 0) + 1;
    }
    return acc;
  }, {});

  return {
    total_records: totalRecords,
    current_employees: currentEmployees,
    by_organization: byOrganization,
    by_department: byDepartment
  };
};
