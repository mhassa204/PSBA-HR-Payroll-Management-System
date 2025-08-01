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
import EditUserForm from "../components/EditUserForm";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="relative p-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center space-x-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="border-2 border-gray-200 bg-white/80 backdrop-blur-sm text-gray-900 hover:bg-white hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Profile
                </Button>
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Edit Employee
                </h1>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className="h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="border-2 border-gray-200 bg-white/80 backdrop-blur-sm text-gray-900 hover:bg-white hover:border-red-300 hover:shadow-lg transition-all duration-300"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
                <CardTitle className="text-xl text-gray-900 flex items-center">
                  <Save className="w-5 h-5 mr-2 text-blue-500" />
                  Update Employee Information
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Editing profile for:{" "}
                  <span className="font-semibold">{employee.full_name}</span>
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <EditUserForm user={employee} />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default EditEmployee;
