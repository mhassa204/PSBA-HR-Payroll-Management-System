import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save, X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import CreateEmployeeForm from "../components/CreateEmployeeForm";
import { useEmployeeStore } from "../store/employeeStore";
import useAppNavigation from "../../../hooks/useAppNavigation";

const EditEmployee = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employees: employeeNav } = useAppNavigation();
  const { fetchEmployee, updateEmployee, loading, error, clearError } =
    useEmployeeStore();
  const [employee, setEmployee] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEmployee = async () => {
      if (!id) {
        navigate("/employees");
        return;
      }

      try {
        clearError();
        // Convert string ID to integer for data lookup
        const numericId = parseInt(id);
        const data = await fetchEmployee(numericId);
        setEmployee(data || data.employee);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching employee:", err);
        setIsLoading(false);
      }
    };

    loadEmployee();
  }, [id, fetchEmployee, clearError, navigate]);

  const handleBack = () => {
    // Navigate back to the list with preserved pagination state
    employeeNav.backToList();
  };

  const handleCancel = () => {
    // Navigate back to the list with preserved pagination state
    employeeNav.backToList();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employee data...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Employee Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            {error || "The employee could not be loaded for editing."}
          </p>
          <Button
            onClick={handleBack}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
        </motion.div>
      </div>
    );
  }

  // The merged CreateEmployeeForm renders the full page (header, back, sections)
  // for both add and edit, so we render it directly with the employee to edit.
  return <CreateEmployeeForm employee={employee} />;
};

export default EditEmployee;
