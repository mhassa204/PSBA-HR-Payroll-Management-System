import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useEmployeeStore } from "../store/employeeStore";
import { useErrorHandler } from "../../../hooks/useErrorHandler";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import EnhancedModal from "../../../components/ui/EnhancedModal";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import { useAuditLog } from "../../../hooks/useAuditLog";
import { forceRestoreScroll } from "../../../utils/scrollUtils";
import {
  RELIGION_OPTIONS,
  DISABILITY_TYPES,
  EDUCATION_QUALIFICATIONS,
  MARITAL_STATUS_OPTIONS,
  RELATIONSHIP_TYPES,
  PAKISTAN_DISTRICTS,
  getCitiesForDistrict
} from "../../../constants/employeeOptions";
import {
  validateCNIC,
  validateCNICDates,
  validateCNICExpiryDate,
  validateFileUpload,
  validateMultipleFiles,
  validateEmail,
  validatePhoneNumber,
  getTodayDateString
} from "../../../utils/employeeValidation";

const CreateEmployeeForm = () => {
  const navigate = useNavigate();
  const { createEmployee } = useEmployeeStore();
  const { error, isLoading, clearError, withErrorHandling } = useErrorHandler();
  const { logPageView, logFormSubmission, logError } = useAuditLog();
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [educations, setEducations] = useState([]);

  // Enhanced form state
  const [availableCities, setAvailableCities] = useState([]);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState({
    cnic_front: null,
    cnic_back: null,
    domicile_certificate: null,
    disability_document: null,
    experience_documents: {},
    education_documents: {},
    other_documents: []
  });

  const form = useForm({
    defaultValues: {
      full_name: "",
      // Unified father/husband name field
      father_husband_name: "",
      relationship_type: "father",
      mother_name: "",
      cnic: "",
      cnic_issue_date: "",
      cnic_expire_date: "",
      date_of_birth: "",
      gender: "",
      marital_status: "", // Now optional
      nationality: "Pakistani",
      religion: "",
      blood_group: "",
      domicile_district: "",
      mobile_number: "",
      whatsapp_number: "",
      email: "",
      present_address: "",
      permanent_address: "",
      same_address: false, // New field for address optimization
      district: "",
      city: "",
      // Enhanced disability information
      has_disability: false,
      disability_type: "",
      disability_description: "",
      // File uploads
      profile_picture_file: null,
      cnic_front_file: null,
      cnic_back_file: null,
      domicile_certificate_file: null,
      disability_document_file: null,
      experience_documents_files: {},
      education_documents_files: {},
      other_documents_files: [],
      mission_note: "",
      has_past_experience: false,
      past_experiences: [],
      educations: [],
    },
  });

  // Log page view on component mount
  useEffect(() => {
    logPageView('Create Employee Form', {
      metadata: {
        form_type: 'employee_creation',
        access_method: 'direct_navigation'
      }
    });
  }, [logPageView]);

  // Watch for district changes to update cities
  const watchedDistrict = form.watch("district");
  useEffect(() => {
    if (watchedDistrict) {
      const cities = getCitiesForDistrict(watchedDistrict);
      setAvailableCities(cities);
      // Reset city when district changes
      form.setValue("city", "");
    } else {
      setAvailableCities([]);
    }
  }, [watchedDistrict, form]);

  // Watch for same address checkbox
  const watchedSameAddress = form.watch("same_address");
  const watchedPresentAddress = form.watch("present_address");
  useEffect(() => {
    if (watchedSameAddress && watchedPresentAddress) {
      form.setValue("permanent_address", watchedPresentAddress);
    }
  }, [watchedSameAddress, watchedPresentAddress, form]);

  // Handle profile picture upload
  const handleProfilePictureUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validation = validateFileUpload(file, 'profile_picture');
      if (validation.isValid) {
        form.setValue("profile_picture_file", file);
        const reader = new FileReader();
        reader.onload = (e) => setProfilePicturePreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        alert(validation.message);
        event.target.value = '';
      }
    }
  };

  // Handle file uploads
  const handleFileUpload = (event, fileType, isMultiple = false) => {
    const files = isMultiple ? Array.from(event.target.files) : [event.target.files[0]];

    if (isMultiple) {
      const validation = validateMultipleFiles(files, fileType);
      if (validation.isValid) {
        setUploadedFiles(prev => ({
          ...prev,
          [fileType]: files
        }));
        form.setValue(`${fileType}_files`, files);
      } else {
        alert(validation.message);
        event.target.value = '';
      }
    } else {
      const file = files[0];
      if (file) {
        const validation = validateFileUpload(file, fileType);
        if (validation.isValid) {
          setUploadedFiles(prev => ({
            ...prev,
            [fileType]: file
          }));
          form.setValue(`${fileType}_file`, file);
        } else {
          alert(validation.message);
          event.target.value = '';
        }
      }
    }
  };

  // Handle experience document upload
  const handleExperienceDocumentUpload = (event, experienceId) => {
    const file = event.target.files[0];
    if (file) {
      const validation = validateFileUpload(file, 'experience_document');
      if (validation.isValid) {
        setUploadedFiles(prev => ({
          ...prev,
          experience_documents: {
            ...prev.experience_documents,
            [experienceId]: file
          }
        }));
      } else {
        alert(validation.message);
        event.target.value = '';
      }
    }
  };

  // Handle education document upload
  const handleEducationDocumentUpload = (event, educationId) => {
    const file = event.target.files[0];
    if (file) {
      const validation = validateFileUpload(file, 'education_document');
      if (validation.isValid) {
        setUploadedFiles(prev => ({
          ...prev,
          education_documents: {
            ...prev.education_documents,
            [educationId]: file
          }
        }));
      } else {
        alert(validation.message);
        event.target.value = '';
      }
    }
  };

  // Cleanup effect to ensure modal is closed and scroll is restored on unmount
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Restore scroll before page unload
      forceRestoreScroll();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Force close modal and restore scroll when component unmounts
      setShowPreviewModal(false);
      forceRestoreScroll();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Handle adding new experience
  const addExperience = () => {
    const newExperience = {
      id: Date.now(),
      company_name: "",
      start_date: "",
      end_date: "",
      description: ""
    };
    setExperiences([...experiences, newExperience]);
  };

  // Handle removing experience with confirmation
  const removeExperience = (id) => {
    const experience = experiences.find(exp => exp.id === id);
    const experienceLabel = experience?.company_name || 'this work experience';

    if (window.confirm(`Are you sure you want to remove the experience at ${experienceLabel}? This action cannot be undone.`)) {
      setExperiences(experiences.filter(exp => exp.id !== id));

      // Also remove any associated document uploads for this experience entry
      setUploadedFiles(prev => {
        const updatedFiles = { ...prev };
        if (updatedFiles.experience_documents && updatedFiles.experience_documents[id]) {
          const newExperienceDocuments = { ...updatedFiles.experience_documents };
          delete newExperienceDocuments[id];
          updatedFiles.experience_documents = newExperienceDocuments;
        }
        return updatedFiles;
      });
    }
  };

  // Handle updating experience
  const updateExperience = (id, field, value) => {
    setExperiences(experiences.map(exp =>
      exp.id === id ? { ...exp, [field]: value } : exp
    ));
  };

  // Handle adding new education
  const addEducation = () => {
    const newEducation = {
      id: Date.now(),
      education_level: "",
      institution_name: "",
      year_of_completion: "",
      marks_gpa: ""
    };
    setEducations([...educations, newEducation]);
  };

  // Handle removing education with confirmation
  const removeEducation = (id) => {
    const education = educations.find(edu => edu.id === id);
    const educationLabel = education?.education_level || 'this education entry';

    if (window.confirm(`Are you sure you want to remove ${educationLabel}? This action cannot be undone.`)) {
      setEducations(educations.filter(edu => edu.id !== id));

      // Also remove any associated document uploads for this education entry
      setUploadedFiles(prev => {
        const updatedFiles = { ...prev };
        if (updatedFiles.education_documents && updatedFiles.education_documents[id]) {
          const newEducationDocuments = { ...updatedFiles.education_documents };
          delete newEducationDocuments[id];
          updatedFiles.education_documents = newEducationDocuments;
        }
        return updatedFiles;
      });
    }
  };

  // Handle updating education
  const updateEducation = (id, field, value) => {
    setEducations(educations.map(edu =>
      edu.id === id ? { ...edu, [field]: value } : edu
    ));
  };

  const onSubmit = (data) => {
    clearError();
    console.log("Form submitted with data:", data);

    // Include experiences, educations, and associated documents in the data
    const formDataWithExperiences = {
      ...data,
      past_experiences: experiences,
      educations: educations,
      experience_documents: uploadedFiles.experience_documents,
      education_documents: uploadedFiles.education_documents
    };

    // Log form submission
    logFormSubmission('CreateEmployeeForm', formDataWithExperiences, true, {
      metadata: {
        has_experiences: experiences.length > 0,
        experience_count: experiences.length,
        has_educations: educations.length > 0,
        education_count: educations.length,
        form_fields_filled: Object.keys(data).filter(key => data[key] && data[key] !== '').length
      }
    });

    // Show preview modal with all data
    setPreviewData(formDataWithExperiences);
    setShowPreviewModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!previewData) return;

    try {
      await withErrorHandling(
        () => createEmployee(previewData),
        {
          showAlert: true,
          customMessage: "Employee created successfully!",
        }
      );

      // Close modal and navigate to employees list
      setShowPreviewModal(false);
      navigate("/employees");
    } catch (error) {
      // Log error for audit trail
      logError('CREATE', 'EMPLOYEE', error, {
        metadata: {
          form_data_keys: Object.keys(previewData || {}),
          has_experiences: previewData?.past_experiences?.length > 0
        }
      });
    }
  };

  // Helper function to display field values with N/A fallback
  const displayValue = (value, type = 'text') => {
    if (value === null || value === undefined || value === '' || (typeof value === 'number' && isNaN(value))) {
      return 'N/A';
    }

    if (type === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (type === 'array' && Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'N/A';
    }

    if (type === 'experiences' && Array.isArray(value)) {
      return value.length > 0 ? `${value.length} experience(s)` : 'No experience added';
    }

    return String(value);
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Creating employee..." />;
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--color-background-secondary)" }}
    >
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate("/employees")}
              className="p-2 rounded-lg transition-colors"
              style={{
                color: "var(--color-text-secondary)",
                backgroundColor: "var(--color-background-primary)",
              }}
            >
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h1
                className="text-3xl font-bold"
                style={{ color: "var(--color-text-primary)" }}
              >
                Create New Employee
              </h1>
              <p
                className="text-lg"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Add basic employee information first, then add employment
                records
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6">
            <ErrorMessage
              error={error}
              onRetry={clearError}
              showHomeLink={false}
            />
          </div>
        )}

        {/* Basic Info Form */}
        <div className="card">
          <div className="card-header">
            <h3
              className="text-xl font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              <i className="fas fa-user mr-2"></i>
              Basic Employee Information
            </h3>
            <p style={{ color: "var(--color-text-secondary)" }}>
              Enter the basic personal information for the new employee
            </p>
          </div>

          <div className="p-6 text-gray-800">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Profile Picture Upload */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  <i className="fas fa-camera mr-2"></i>
                  Profile Picture
                </h4>
                <div className="flex items-center space-x-4">
                  {profilePicturePreview ? (
                    <div className="relative">
                      <img
                        src={profilePicturePreview}
                        alt="Profile Preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setProfilePicturePreview(null);
                          form.setValue("profile_picture_file", null);
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-300">
                      <i className="fas fa-user text-gray-400 text-2xl"></i>
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                      id="profile-picture-upload"
                    />
                    <label
                      htmlFor="profile-picture-upload"
                      className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <i className="fas fa-upload mr-2"></i>
                      Upload Picture
                    </label>
                    <p className="text-sm text-gray-500 mt-2">
                      JPG, PNG, or GIF. Max size: 5MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...form.register("full_name", { required: "Full name is required" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter full name"
                  />
                  {form.formState.errors.full_name && (
                    <p className="text-red-600 text-sm mt-1">{form.formState.errors.full_name.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNIC <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...form.register("cnic", {
                      required: "CNIC is required",
                      validate: (value) => {
                        const validation = validateCNIC(value);
                        return validation.isValid || validation.message;
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter CNIC (e.g., 12345-1234567-1)"
                    maxLength="15"
                  />
                  {form.formState.errors.cnic && (
                    <p className="text-red-600 text-sm mt-1">{form.formState.errors.cnic.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...form.register("mobile_number", { required: "Mobile number is required" })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter mobile number"
                  />
                  {form.formState.errors.mobile_number && (
                    <p className="text-red-600 text-sm mt-1">{form.formState.errors.mobile_number.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    {...form.register("email")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email address"
                  />
                </div>

                {/* Unified Father/Husband Name Field */}
                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    {/* Relationship Type Selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Relationship Type
                      </label>
                      <select
                        {...form.register("relationship_type")}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {RELATIONSHIP_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Unified Name Field */}
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Father/Husband Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...form.register("father_husband_name", {
                          required: "Father/Husband name is required"
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Enter ${form.watch("relationship_type") === "father" ? "father" : "husband"} name`}
                      />
                      {form.formState.errors.father_husband_name && (
                        <p className="text-red-600 text-sm mt-1">{form.formState.errors.father_husband_name.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mother Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mother Name
                  </label>
                  <input
                    type="text"
                    {...form.register("mother_name")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter mother name"
                  />
                </div>

                {/* CNIC Issue Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNIC Issue Date
                  </label>
                  <input
                    type="date"
                    {...form.register("cnic_issue_date", {
                      validate: (value) => {
                        const expiryDate = form.getValues("cnic_expire_date");
                        const validation = validateCNICDates(value, expiryDate);
                        return validation.isValid || validation.message;
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {form.formState.errors.cnic_issue_date && (
                    <p className="text-red-600 text-sm mt-1">{form.formState.errors.cnic_issue_date.message}</p>
                  )}
                </div>

                {/* CNIC Expiry Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNIC Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    min={getTodayDateString()}
                    {...form.register("cnic_expire_date", {
                      required: "CNIC expiry date is required",
                      validate: (value) => {
                        // First validate that it's not in the past
                        const expiryValidation = validateCNICExpiryDate(value);
                        if (!expiryValidation.isValid) {
                          return expiryValidation.message;
                        }

                        // Then validate against issue date
                        const issueDate = form.getValues("cnic_issue_date");
                        const datesValidation = validateCNICDates(issueDate, value);
                        return datesValidation.isValid || datesValidation.message;
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {form.formState.errors.cnic_expire_date && (
                    <p className="text-red-600 text-sm mt-1">{form.formState.errors.cnic_expire_date.message}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Select today's date or a future date
                  </p>
                </div>

                {/* WhatsApp Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    {...form.register("whatsapp_number")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter WhatsApp number"
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    {...form.register("date_of_birth")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <SearchableSelect
                    options={[
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Other", label: "Other" }
                    ]}
                    value={form.watch("gender")}
                    onChange={(value) => form.setValue("gender", value)}
                    placeholder="Select Gender"
                    register={form.register}
                    name="gender"
                    required={false}
                    error={form.formState.errors.gender?.message}
                  />
                </div>

                {/* Marital Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marital Status <span className="text-gray-400">(Optional)</span>
                  </label>
                  <SearchableSelect
                    options={MARITAL_STATUS_OPTIONS}
                    value={form.watch("marital_status")}
                    onChange={(value) => form.setValue("marital_status", value)}
                    placeholder="Select Marital Status"
                    register={form.register}
                    name="marital_status"
                    required={false}
                    error={form.formState.errors.marital_status?.message}
                  />
                </div>

                {/* Nationality */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality
                  </label>
                  <input
                    type="text"
                    {...form.register("nationality")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter nationality"
                  />
                </div>

                {/* Religion */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Religion
                  </label>
                  <SearchableSelect
                    options={RELIGION_OPTIONS}
                    value={form.watch("religion")}
                    onChange={(value) => form.setValue("religion", value)}
                    placeholder="Select Religion"
                    register={form.register}
                    name="religion"
                    required={false}
                    error={form.formState.errors.religion?.message}
                  />
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Blood Group
                  </label>
                  <select
                    {...form.register("blood_group")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                {/* Disability Information */}
                <div className="md:col-span-2">
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      <i className="fas fa-universal-access mr-2"></i>
                      Disability Information
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Has Disability Checkbox */}
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          {...form.register("has_disability")}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm font-medium text-gray-700">
                          Has Disability
                        </label>
                      </div>

                      {/* Disability Type */}
                      {form.watch("has_disability") && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Disability Type <span className="text-red-500">*</span>
                            </label>
                            <select
                              {...form.register("disability_type", {
                                required: form.watch("has_disability") ? "Disability type is required" : false
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Disability Type</option>
                              {DISABILITY_TYPES.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                            {form.formState.errors.disability_type && (
                              <p className="text-red-600 text-sm mt-1">{form.formState.errors.disability_type.message}</p>
                            )}
                          </div>

                          {/* Disability Description */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Description/Details
                            </label>
                            <textarea
                              {...form.register("disability_description")}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Describe the disability or special accommodations needed"
                              rows="2"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Domicile District */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domicile District
                  </label>
                  <select
                    {...form.register("domicile_district")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Domicile District</option>
                    {PAKISTAN_DISTRICTS.map((district) => (
                      <option key={district.value} value={district.value}>
                        {district.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    District
                  </label>
                  <SearchableSelect
                    options={PAKISTAN_DISTRICTS}
                    value={form.watch("district")}
                    onChange={(value) => form.setValue("district", value)}
                    placeholder="Select District"
                    register={form.register}
                    name="district"
                    required={false}
                    error={form.formState.errors.district?.message}
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <SearchableSelect
                    options={availableCities}
                    value={form.watch("city")}
                    onChange={(value) => form.setValue("city", value)}
                    placeholder="Select City"
                    register={form.register}
                    name="city"
                    required={false}
                    disabled={!form.watch("district")}
                    error={form.formState.errors.city?.message}
                  />
                  {!form.watch("district") && (
                    <p className="text-gray-500 text-sm mt-1">Please select a district first</p>
                  )}
                </div>


              </div>

              {/* Address Fields - Enhanced with Same Address Option */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  <i className="fas fa-map-marker-alt mr-2"></i>
                  Address Information
                </h4>

                <div className="space-y-4">
                  {/* Present Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Present Address
                    </label>
                    <textarea
                      {...form.register("present_address")}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter present address"
                    />
                  </div>

                  {/* Same Address Checkbox */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      {...form.register("same_address")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm font-medium text-gray-700">
                      Present and Permanent Address are Same
                    </label>
                  </div>

                  {/* Permanent Address */}
                  {!form.watch("same_address") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Permanent Address
                      </label>
                      <textarea
                        {...form.register("permanent_address")}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter permanent address"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Missing Note - Full Width */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Missing Note
                  </label>
                  <textarea
                    {...form.register("mission_note")}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter missing note or additional information"
                  />
                </div>
              </div>

              {/* Experience Section */}
              <div className="space-y-6">
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      <i className="fas fa-briefcase mr-2 text-indigo-600"></i>
                      Past Work Experience
                    </h3>
                    <button
                      type="button"
                      onClick={addExperience}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Add Experience
                    </button>
                  </div>

                  {experiences.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <i className="fas fa-briefcase text-4xl text-gray-400 mb-4"></i>
                      <p className="text-gray-600 mb-4">No past experience added yet</p>
                      <button
                        type="button"
                        onClick={addExperience}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Add First Experience
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {experiences.map((experience, index) => (
                        <div key={experience.id} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-md font-semibold text-gray-800">
                              Experience #{index + 1}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeExperience(experience.id)}
                              className="px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors border border-red-200 text-sm"
                              title="Remove Experience"
                            >
                              <i className="fas fa-trash mr-1"></i>
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Company Name */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Company Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={experience.company_name}
                                onChange={(e) => updateExperience(experience.id, 'company_name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter company name"
                              />
                            </div>

                            {/* Start Date */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="date"
                                value={experience.start_date}
                                onChange={(e) => updateExperience(experience.id, 'start_date', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>

                            {/* End Date */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date
                              </label>
                              <input
                                type="date"
                                value={experience.end_date}
                                onChange={(e) => updateExperience(experience.id, 'end_date', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">Leave empty if currently working</p>
                            </div>

                            {/* Position/Role (optional field) */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Position/Role
                              </label>
                              <input
                                type="text"
                                value={experience.position || ''}
                                onChange={(e) => updateExperience(experience.id, 'position', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter position or role"
                              />
                            </div>
                          </div>

                          {/* Description */}
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Job Description
                            </label>
                            <textarea
                              value={experience.description}
                              onChange={(e) => updateExperience(experience.id, 'description', e.target.value)}
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Describe your responsibilities and achievements in this role..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Education Section */}
              <div className="space-y-6">
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      <i className="fas fa-graduation-cap mr-2 text-green-600"></i>
                      Education Qualifications
                    </h3>
                    <button
                      type="button"
                      onClick={addEducation}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Add Education
                    </button>
                  </div>

                  {educations.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <i className="fas fa-graduation-cap text-4xl text-gray-400 mb-4"></i>
                      <p className="text-gray-600 mb-4">No education qualifications added yet</p>
                      <button
                        type="button"
                        onClick={addEducation}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <i className="fas fa-plus mr-2"></i>
                        Add First Education
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {educations.map((education, index) => (
                        <div key={education.id} className="bg-green-50 p-6 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-md font-semibold text-gray-800">
                              Education #{index + 1}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeEducation(education.id)}
                              className="px-3 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors border border-red-200 text-sm"
                              title="Remove Education"
                            >
                              <i className="fas fa-trash mr-1"></i>
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Education Level */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Education Level <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={education.education_level}
                                onChange={(e) => updateEducation(education.id, 'education_level', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                              >
                                <option value="">Select Education Level</option>
                                {EDUCATION_QUALIFICATIONS.map((qual) => (
                                  <option key={qual.value} value={qual.value}>
                                    {qual.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Institution Name */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Institution Name <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                value={education.institution_name}
                                onChange={(e) => updateEducation(education.id, 'institution_name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="Enter institution name"
                              />
                            </div>

                            {/* Year of Completion */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Year of Completion <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="number"
                                min="1950"
                                max={new Date().getFullYear()}
                                value={education.year_of_completion}
                                onChange={(e) => updateEducation(education.id, 'year_of_completion', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="e.g., 2020"
                              />
                            </div>

                            {/* Marks/GPA */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Marks/GPA
                              </label>
                              <input
                                type="text"
                                value={education.marks_gpa}
                                onChange={(e) => updateEducation(education.id, 'marks_gpa', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                placeholder="e.g., 3.5 GPA or 85%"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Document Attachments */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  <i className="fas fa-paperclip mr-2"></i>
                  Document Attachments
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CNIC Front */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CNIC Front Copy
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={(e) => handleFileUpload(e, 'cnic_documents')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {uploadedFiles.cnic_front && (
                      <p className="text-sm text-green-600 mt-1">
                        <i className="fas fa-check mr-1"></i>
                        {uploadedFiles.cnic_front.name}
                      </p>
                    )}
                  </div>

                  {/* CNIC Back */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CNIC Back Copy
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={(e) => handleFileUpload(e, 'cnic_documents')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {uploadedFiles.cnic_back && (
                      <p className="text-sm text-green-600 mt-1">
                        <i className="fas fa-check mr-1"></i>
                        {uploadedFiles.cnic_back.name}
                      </p>
                    )}
                  </div>

                  {/* Domicile Certificate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Domicile Certificate
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf"
                      onChange={(e) => handleFileUpload(e, 'certificates')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {uploadedFiles.domicile_certificate && (
                      <p className="text-sm text-green-600 mt-1">
                        <i className="fas fa-check mr-1"></i>
                        {uploadedFiles.domicile_certificate.name}
                      </p>
                    )}
                  </div>

                  {/* Conditional Disability Document */}
                  {form.watch("has_disability") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Disability Supporting Document
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        onChange={(e) => handleFileUpload(e, 'disability_document')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {uploadedFiles.disability_document && (
                        <p className="text-sm text-green-600 mt-1">
                          <i className="fas fa-check mr-1"></i>
                          {uploadedFiles.disability_document.name}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Upload medical certificate or other supporting document for disability
                      </p>
                    </div>
                  )}



                  {/* Experience Documents */}
                  {experiences.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-4">
                        <i className="fas fa-briefcase mr-2"></i>
                        Experience Supporting Documents (Optional)
                      </label>
                      <div className="space-y-4">
                        {experiences.map((experience, index) => (
                          <div key={experience.id} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-800">
                                Experience #{index + 1}: {experience.company_name || 'Unnamed Company'}
                              </h5>
                            </div>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(e) => handleExperienceDocumentUpload(e, experience.id)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            {uploadedFiles.experience_documents[experience.id] && (
                              <p className="text-sm text-green-600 mt-1">
                                <i className="fas fa-check mr-1"></i>
                                {uploadedFiles.experience_documents[experience.id].name}
                              </p>
                            )}
                            <p className="text-sm text-gray-500 mt-1">
                              Upload experience letter, certificate, or other supporting document
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education Documents */}
                  {educations.length > 0 && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-4">
                        <i className="fas fa-graduation-cap mr-2"></i>
                        Education Supporting Documents (Optional)
                      </label>
                      <div className="space-y-4">
                        {educations.map((education, index) => (
                          <div key={education.id} className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-800">
                                Education #{index + 1}: {education.education_level || 'Unnamed Level'} - {education.institution_name || 'Unnamed Institution'}
                              </h5>
                            </div>
                            <input
                              type="file"
                              accept="image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                              onChange={(e) => handleEducationDocumentUpload(e, education.id)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            {uploadedFiles.education_documents[education.id] && (
                              <p className="text-sm text-green-600 mt-1">
                                <i className="fas fa-check mr-1"></i>
                                {uploadedFiles.education_documents[education.id].name}
                              </p>
                            )}
                            <p className="text-sm text-gray-500 mt-1">
                              Upload transcript, certificate, or other supporting document
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Documents */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Other Documents
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      multiple
                      onChange={(e) => handleFileUpload(e, 'other_documents', true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {uploadedFiles.other_documents?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {uploadedFiles.other_documents.map((file, index) => (
                          <p key={index} className="text-sm text-green-600">
                            <i className="fas fa-check mr-1"></i>
                            {file.name}
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Supported formats: PDF, DOC, DOCX, JPG, PNG. Max 5 files, 15MB each.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <i className="fas fa-eye mr-2"></i>
                  Review & Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Employee Data Preview Modal */}
      <EnhancedModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Review Employee Information Before Creating"
        size="xl"
      >
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {previewData && (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Please review all employee information before creating
                </h3>
                <p className="text-gray-600">
                  Fields showing "N/A" indicate no value was entered. You can go back to edit or proceed to create the employee.
                </p>
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  <i className="fas fa-user mr-2 text-blue-600"></i>
                  Personal Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Full Name:</span>
                    <span className="text-gray-900">{displayValue(previewData.full_name)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">
                      {previewData.relationship_type === "father" ? "Father Name:" : "Husband Name:"}
                    </span>
                    <span className="text-gray-900">{displayValue(previewData.father_husband_name)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Relationship Type:</span>
                    <span className="text-gray-900 capitalize">{displayValue(previewData.relationship_type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Mother Name:</span>
                    <span className="text-gray-900">{displayValue(previewData.mother_name)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Date of Birth:</span>
                    <span className="text-gray-900">{displayValue(previewData.date_of_birth)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Gender:</span>
                    <span className="text-gray-900">{displayValue(previewData.gender)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Marital Status:</span>
                    <span className="text-gray-900">{displayValue(previewData.marital_status)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Nationality:</span>
                    <span className="text-gray-900">{displayValue(previewData.nationality)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Religion:</span>
                    <span className="text-gray-900">{displayValue(previewData.religion)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Blood Group:</span>
                    <span className="text-gray-900">{displayValue(previewData.blood_group)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Domicile District:</span>
                    <span className="text-gray-900">{displayValue(previewData.domicile_district)}</span>
                  </div>
                </div>
              </div>

              {/* Disability Information */}
              {previewData.has_disability && (
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                    <i className="fas fa-universal-access mr-2 text-purple-600"></i>
                    Disability Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Has Disability:</span>
                      <span className="text-gray-900">Yes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-600">Disability Type:</span>
                      <span className="text-gray-900">{displayValue(previewData.disability_type)}</span>
                    </div>
                    {previewData.disability_description && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-600">Description:</span>
                        <p className="text-gray-900 mt-1 bg-gray-50 p-2 rounded">{displayValue(previewData.disability_description)}</p>
                      </div>
                    )}
                    {uploadedFiles.disability_document && (
                      <div className="md:col-span-2">
                        <span className="font-medium text-gray-600">Supporting Document:</span>
                        <p className="text-gray-900 mt-1">
                          <i className="fas fa-file mr-2 text-blue-600"></i>
                          {uploadedFiles.disability_document.name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CNIC Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  <i className="fas fa-id-card mr-2 text-green-600"></i>
                  CNIC Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">CNIC Number:</span>
                    <span className="text-gray-900">{displayValue(previewData.cnic)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">CNIC Issue Date:</span>
                    <span className="text-gray-900">{displayValue(previewData.cnic_issue_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">CNIC Expiry Date:</span>
                    <span className="text-gray-900">{displayValue(previewData.cnic_expire_date)}</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  <i className="fas fa-phone mr-2 text-purple-600"></i>
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Mobile Number:</span>
                    <span className="text-gray-900">{displayValue(previewData.mobile_number)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">WhatsApp Number:</span>
                    <span className="text-gray-900">{displayValue(previewData.whatsapp_number)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Email:</span>
                    <span className="text-gray-900">{displayValue(previewData.email)}</span>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  <i className="fas fa-map-marker-alt mr-2 text-orange-600"></i>
                  Address Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">District:</span>
                    <span className="text-gray-900">{displayValue(previewData.district)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">City:</span>
                    <span className="text-gray-900">{displayValue(previewData.city)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-600">Present Address:</span>
                    <p className="text-gray-900 mt-1 bg-gray-50 p-2 rounded">{displayValue(previewData.present_address)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Permanent Address:</span>
                    <p className="text-gray-900 mt-1 bg-gray-50 p-2 rounded">{displayValue(previewData.permanent_address)}</p>
                  </div>
                </div>
              </div>

              {/* Education & Experience */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  <i className="fas fa-graduation-cap mr-2 text-indigo-600"></i>
                  Education & Experience
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Total Education Entries:</span>
                    <span className="text-gray-900">{previewData.educations?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Total Experiences:</span>
                    <span className="text-gray-900">{displayValue(previewData.past_experiences, 'experiences')}</span>
                  </div>
                </div>

                {/* Education Details */}
                {previewData.educations && previewData.educations.length > 0 && (
                  <div className="space-y-4">
                    <h5 className="font-semibold text-gray-800 border-b border-gray-100 pb-1">
                      <i className="fas fa-graduation-cap mr-2 text-green-600"></i>
                      Education Details
                    </h5>
                    <div className="space-y-4">
                      {previewData.educations.map((edu, index) => (
                        <div key={index} className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Education Level:</span>
                              <span className="text-gray-900 font-semibold">{displayValue(edu.education_level)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Institution:</span>
                              <span className="text-gray-900">{displayValue(edu.institution_name)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Year of Completion:</span>
                              <span className="text-gray-900">{displayValue(edu.year_of_completion)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Marks/GPA:</span>
                              <span className="text-gray-900">{displayValue(edu.marks_gpa) || 'Not specified'}</span>
                            </div>
                          </div>
                          {uploadedFiles.education_documents[edu.id] && (
                            <div className="mt-3 pt-3 border-t border-green-300">
                              <span className="font-medium text-gray-600">Supporting Document:</span>
                              <p className="text-gray-900 mt-1">
                                <i className="fas fa-file mr-2 text-green-600"></i>
                                {uploadedFiles.education_documents[edu.id].name}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Past Experiences Details */}
                {previewData.past_experiences && previewData.past_experiences.length > 0 && (
                  <div className="space-y-4">
                    <h5 className="font-semibold text-gray-800 border-b border-gray-100 pb-1">
                      <i className="fas fa-briefcase mr-2 text-blue-600"></i>
                      Work Experience Details
                    </h5>
                    <div className="space-y-4">
                      {previewData.past_experiences.map((exp, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Company:</span>
                              <span className="text-gray-900 font-semibold">{displayValue(exp.company_name)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Position:</span>
                              <span className="text-gray-900">{displayValue(exp.position)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">Start Date:</span>
                              <span className="text-gray-900">{displayValue(exp.start_date)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-600">End Date:</span>
                              <span className="text-gray-900">{displayValue(exp.end_date) || 'Present'}</span>
                            </div>
                          </div>
                          {exp.description && (
                            <div>
                              <span className="font-medium text-gray-600">Description:</span>
                              <p className="text-gray-900 mt-1 text-sm leading-relaxed">{displayValue(exp.description)}</p>
                            </div>
                          )}
                          {uploadedFiles.experience_documents[exp.id] && (
                            <div className="mt-3 pt-3 border-t border-gray-300">
                              <span className="font-medium text-gray-600">Supporting Document:</span>
                              <p className="text-gray-900 mt-1">
                                <i className="fas fa-file mr-2 text-blue-600"></i>
                                {uploadedFiles.experience_documents[exp.id].name}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewData.mission_note && (
                  <div>
                    <span className="font-medium text-gray-600">Missing Note:</span>
                    <p className="text-gray-900 mt-1 bg-gray-50 p-2 rounded">{displayValue(previewData.mission_note)}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between gap-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  <i className="fas fa-arrow-left mr-2"></i>
                  Go Back to Edit
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Creating Employee...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check mr-2"></i>
                      Confirm & Create Employee
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </EnhancedModal>
    </div>
  );
};

export default CreateEmployeeForm;
