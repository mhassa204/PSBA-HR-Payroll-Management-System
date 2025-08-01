import { useState } from "react"
import EmployeeTable from "../components/EmployeeTable"

// Mock API response data based on your structure
const mockApiResponse = {
  success: true,
  employees: [
    {
      id: 1,
      full_name: "Liaqat Ali",
      father_or_husband_name: "Shaukat Ali",
      mother_name: "Motiya Begum",
      cnic: "35301-6541536-5",
      cnic_issue_date: "1230-01-20T00:00:00.000Z",
      cnic_expiry_date: "2392-02-20T00:00:00.000Z",
      date_of_birth: "2022-02-03T00:00:00.000Z",
      gender: "Male",
      marital_status: "Single",
      nationality: "Pakistan",
      religion: "Islam",
      blood_group: "A-",
      domicile_district: "Okara",
      mobile_number: "03202790970",
      whatsapp_number: "03202790970",
      email: "03-227232-013@student.bahria.edu.pk",
      present_address: "Civic Center Johar Town Lahore",
      permanent_address: "Basirpur",
      district: "Okara",
      city: "Lahore",
      latest_qualification: "ADP CS",
      past_experience: "No",
      department_id: "dept2",
      designation_id: "desg1",
      joining_date_mwo: "2022-01-19T00:00:00.000Z",
      joining_date_pmbmc: "2022-12-03T00:00:00.000Z",
      joining_date_psba: "2021-02-01T00:00:00.000Z",
      termination_or_suspend_date: "2002-02-02T00:00:00.000Z",
      grade_scale: "1",
      termination_reason: "No",
      special_duty_note: "No",
      document_missing_note: "No",
      disability_status: true,
      disability_description: "No",
      medical_fitness_status: true,
      medical_fitness_file: null,
      filer_status: "Filer",
      filer_active_status: "Active",
      status: "Active",
      profile_picture_file: null,
      createdAt: "2025-07-22T13:35:57.619Z",
      updatedAt: "2025-07-22T13:35:57.619Z",
      password: null,
      department: {
        id: "dept2",
        name: "Engineering",
        createdAt: "2025-07-22T07:08:12.753Z",
        updatedAt: "2025-07-22T07:08:12.753Z",
      },
      designation: {
        id: "desg1",
        name: "Software Engineer",
        createdAt: "2025-07-22T07:08:12.762Z",
        updatedAt: "2025-07-22T07:08:12.762Z",
      },
      documents: [],
    },
    {
      id: 5,
      full_name: "John Doe",
      father_or_husband_name: null,
      mother_name: null,
      cnic: "35201-1234567-4",
      cnic_issue_date: null,
      cnic_expiry_date: null,
      date_of_birth: null,
      gender: null,
      marital_status: null,
      nationality: null,
      religion: null,
      blood_group: null,
      domicile_district: null,
      mobile_number: null,
      whatsapp_number: null,
      email: null,
      present_address: null,
      permanent_address: null,
      district: null,
      city: null,
      latest_qualification: null,
      past_experience: null,
      department_id: "dept1",
      designation_id: "desg1",
      joining_date_mwo: null,
      joining_date_pmbmc: null,
      joining_date_psba: null,
      termination_or_suspend_date: null,
      grade_scale: null,
      termination_reason: null,
      special_duty_note: null,
      document_missing_note: null,
      disability_status: false,
      disability_description: null,
      medical_fitness_status: false,
      medical_fitness_file: null,
      filer_status: "Non-Filer",
      filer_active_status: null,
      status: "Active",
      profile_picture_file: null,
      createdAt: "2025-07-23T05:13:18.885Z",
      updatedAt: "2025-07-23T05:13:18.885Z",
      password: null,
      department: {
        id: "dept1",
        name: "Human Resources",
        createdAt: "2025-07-22T07:08:12.668Z",
        updatedAt: "2025-07-22T07:08:12.668Z",
      },
      designation: {
        id: "desg1",
        name: "Software Engineer",
        createdAt: "2025-07-22T07:08:12.762Z",
        updatedAt: "2025-07-22T07:08:12.762Z",
      },
      documents: [],
    },
    {
      id: 31,
      full_name: "Nazar",
      father_or_husband_name: "xyz",
      mother_name: "xyz",
      cnic: "35301-5551536-5",
      cnic_issue_date: "2025-07-21T00:00:00.000Z",
      cnic_expiry_date: "2025-07-21T00:00:00.000Z",
      date_of_birth: "2025-07-06T00:00:00.000Z",
      gender: "Male",
      marital_status: "Single",
      nationality: "Pakistan",
      religion: "Islam",
      blood_group: "A-",
      domicile_district: "Okara",
      mobile_number: "03202790970",
      whatsapp_number: "03202790970",
      email: "03-2272-013@student.bahria.edu.pk",
      present_address: "Civic Center Johar Town Lahore",
      permanent_address: "Basirpur",
      district: "Multan",
      city: "Lahore",
      latest_qualification: "ADP CS",
      past_experience: "alpha",
      department_id: "dept2",
      designation_id: "desg2",
      joining_date_mwo: "2025-07-01T00:00:00.000Z",
      joining_date_pmbmc: "2025-07-14T00:00:00.000Z",
      joining_date_psba: "2025-08-01T00:00:00.000Z",
      termination_or_suspend_date: null,
      grade_scale: "17",
      termination_reason: null,
      special_duty_note: null,
      document_missing_note: null,
      disability_status: false,
      disability_description: null,
      medical_fitness_status: false,
      medical_fitness_file: null,
      filer_status: "Non-Filer",
      filer_active_status: null,
      status: "Active",
      profile_picture_file: null,
      createdAt: "2025-07-23T12:45:25.876Z",
      updatedAt: "2025-07-23T12:45:25.876Z",
      password: "9eadd2b6f2d8e05faec39f6d0b843914:4280c2c981190948d51ac9d9cfe2dd87",
      department: {
        id: "dept2",
        name: "Engineering",
        createdAt: "2025-07-22T07:08:12.753Z",
        updatedAt: "2025-07-22T07:08:12.753Z",
      },
      designation: {
        id: "desg2",
        name: "HR Manager",
        createdAt: "2025-07-22T07:08:12.762Z",
        updatedAt: "2025-07-22T07:08:12.762Z",
      },
      documents: [],
    },
  ],
}

export default function EmployeeManagementPortal() {
  const [employees] = useState(mockApiResponse.employees)

  const handleView = (employee) => {
    console.log("View employee:", employee)
    // Navigate to view page
  }

  const handleEdit = (employee) => {
    console.log("Edit employee:", employee)
    // Navigate to edit page
  }

  const handleDelete = async (employee) => {
    if (window.confirm(`Are you sure you want to delete ${employee.full_name}?`)) {
      console.log("Delete employee:", employee)
      // Call delete API
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Employee Management System</h1>
          <p className="text-slate-600">Manage your organization's workforce efficiently</p>
        </div>

        <EmployeeTable
          employees={employees}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete} />
      </div>
    </div>
  );
}
