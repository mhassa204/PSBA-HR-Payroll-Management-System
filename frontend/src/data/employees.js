// Dummy data for employees - PostgreSQL structure
// This simulates the employees table with auto-generated IDs

let employeeIdCounter = 5; // Starting counter for new employees

export const dummyEmployees = [
  {
    id: 1,
    employee_id: "EMP2024001",
    full_name: "Ahmed Ali Khan",
    father_husband_name: "Muhammad Ali Khan",
    relationship_type: "father",
    mother_name: "Fatima Khan",
    cnic: "35202-1234567-1",
    cnic_issue_date: "2015-01-15",
    cnic_expire_date: "2030-01-15",
    date_of_birth: "1985-03-20",
    gender: "Male",
    marital_status: "Married",
    nationality: "Pakistani",
    religion: "Islam",
    blood_group: "B+",
    domicile_district: "Lahore",
    mobile_number: "+92-300-1234567",
    whatsapp_number: "+92-300-1234567",
    email: "ahmed.ali@example.com",
    present_address: "House 123, Block A, Johar Town, Lahore",
    permanent_address: "Village Chak 45, Tehsil Kasur, District Kasur",
    district: "Lahore",
    city: "Lahore",
    latest_qualification: "Bachelor's in Civil Engineering",
    mission_note: "Experienced in infrastructure development projects",
    has_past_experience: true,
    past_experiences: [
      {
        company_name: "ABC Construction",
        designation: "Junior Engineer",
        start_date: "2008-06-01",
        end_date: "2010-12-31",
        description: "Worked on residential construction projects"
      }
    ],
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z"
  },
  {
    id: 2,
    employee_id: "EMP2024002",
    full_name: "Sara Fatima",
    father_husband_name: "Muhammad Tariq",
    relationship_type: "father",
    mother_name: "Khadija Bibi",
    cnic: "35202-2345678-2",
    cnic_issue_date: "2016-05-10",
    cnic_expire_date: "2031-05-10",
    date_of_birth: "1990-07-15",
    gender: "Female",
    marital_status: "Single",
    nationality: "Pakistani",
    religion: "Islam",
    blood_group: "A+",
    domicile_district: "Faisalabad",
    mobile_number: "+92-301-2345678",
    whatsapp_number: "+92-301-2345678",
    email: "sara.fatima@example.com",
    present_address: "Flat 45, Gulberg III, Lahore",
    permanent_address: "House 67, Samanabad, Faisalabad",
    district: "Lahore",
    city: "Lahore",
    latest_qualification: "Master's in Computer Science",
    mission_note: "Specialized in software development and system analysis",
    has_past_experience: true,
    past_experiences: [
      {
        company_name: "Tech Solutions Ltd",
        designation: "Software Developer",
        start_date: "2012-08-01",
        end_date: "2015-03-31",
        description: "Developed web applications using modern frameworks"
      },
      {
        company_name: "Digital Innovations",
        designation: "Senior Developer",
        start_date: "2015-04-01",
        end_date: "2018-12-31",
        description: "Led development team for enterprise applications"
      }
    ],
    created_at: "2024-02-20T14:15:00Z",
    updated_at: "2024-02-20T14:15:00Z"
  },
  {
    id: 3,
    employee_id: "EMP2024003",
    full_name: "Muhammad Hassan",
    father_husband_name: "Abdul Rahman",
    mother_name: "Aisha Begum",
    cnic: "35202-3456789-3",
    cnic_issue_date: "2014-03-25",
    cnic_expire_date: "2029-03-25",
    date_of_birth: "1982-11-08",
    gender: "Male",
    marital_status: "Married",
    nationality: "Pakistani",
    religion: "Islam",
    blood_group: "O+",
    domicile_district: "Rawalpindi",
    mobile_number: "+92-302-3456789",
    whatsapp_number: "+92-302-3456789",
    email: "hassan.muhammad@example.com",
    present_address: "House 89, F-7/2, Islamabad",
    permanent_address: "Mohalla Ganjmandi, Rawalpindi",
    district: "Islamabad",
    city: "Islamabad",
    latest_qualification: "Bachelor's in Business Administration",
    mission_note: "Experienced in project management and team leadership",
    has_past_experience: false,
    past_experiences: [],
    created_at: "2024-03-10T09:45:00Z",
    updated_at: "2024-03-10T09:45:00Z"
  },
  {
    id: 4,
    employee_id: "EMP2024004",
    full_name: "Ayesha Malik",
    father_husband_name: "Malik Shahid",
    relationship_type: "husband",
    mother_name: "Rubina Malik",
    cnic: "35202-4567890-4",
    cnic_issue_date: "2017-09-12",
    cnic_expire_date: "2032-09-12",
    date_of_birth: "1988-04-22",
    gender: "Female",
    marital_status: "Married",
    nationality: "Pakistani",
    religion: "Islam",
    blood_group: "AB+",
    domicile_district: "Karachi",
    mobile_number: "+92-303-4567890",
    whatsapp_number: "+92-303-4567890",
    email: "ayesha.malik@example.com",
    present_address: "Apartment 12B, DHA Phase 5, Karachi",
    permanent_address: "House 234, Gulshan-e-Iqbal, Karachi",
    district: "Karachi",
    city: "Karachi",
    latest_qualification: "Master's in Public Administration",
    mission_note: "Focused on public policy and administrative reforms",
    has_past_experience: true,
    past_experiences: [
      {
        company_name: "Government of Sindh",
        designation: "Assistant Director",
        start_date: "2010-01-15",
        end_date: "2014-06-30",
        description: "Managed public welfare programs and policy implementation"
      }
    ],
    created_at: "2024-04-05T11:20:00Z",
    updated_at: "2024-04-05T11:20:00Z"
  }
];

// Helper functions for employee operations
export const generateEmployeeId = () => {
  const year = new Date().getFullYear();
  const counter = String(employeeIdCounter++).padStart(3, '0');
  return `EMP${year}${counter}`;
};

export const createEmployee = (employeeData) => {
  const newEmployee = {
    id: employeeIdCounter++,
    employee_id: generateEmployeeId(),
    ...employeeData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  dummyEmployees.push(newEmployee);
  return newEmployee;
};

export const getEmployeeById = (id) => {
  return dummyEmployees.find(emp => emp.id === parseInt(id));
};

export const updateEmployee = (id, updateData) => {
  const index = dummyEmployees.findIndex(emp => emp.id === parseInt(id));
  if (index !== -1) {
    dummyEmployees[index] = {
      ...dummyEmployees[index],
      ...updateData,
      updated_at: new Date().toISOString()
    };
    return dummyEmployees[index];
  }
  return null;
};

export const deleteEmployee = (id) => {
  const index = dummyEmployees.findIndex(emp => emp.id === parseInt(id));
  if (index !== -1) {
    return dummyEmployees.splice(index, 1)[0];
  }
  return null;
};

export const searchEmployees = (searchTerm) => {
  if (!searchTerm) return dummyEmployees;
  
  const term = searchTerm.toLowerCase();
  return dummyEmployees.filter(emp => 
    emp.full_name.toLowerCase().includes(term) ||
    emp.cnic.includes(term) ||
    emp.employee_id.toLowerCase().includes(term) ||
    emp.email?.toLowerCase().includes(term)
  );
};

export const getEmployeesPaginated = (page = 1, limit = 10, searchTerm = '') => {
  let filteredEmployees = searchTerm ? searchEmployees(searchTerm) : dummyEmployees;
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    data: filteredEmployees.slice(startIndex, endIndex),
    total: filteredEmployees.length,
    page: page,
    limit: limit,
    totalPages: Math.ceil(filteredEmployees.length / limit)
  };
};
