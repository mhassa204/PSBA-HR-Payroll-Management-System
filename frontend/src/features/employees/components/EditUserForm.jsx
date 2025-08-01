import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useEmployeeStore } from "../store/employeeStore";
import { useErrorHandler } from "../../../hooks/useErrorHandler";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import ErrorMessage from "../../../components/ui/ErrorMessage";
import SearchableSelect from "../../../components/ui/SearchableSelect";
import {
  RELATIONSHIP_TYPES,
  RELIGION_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  EDUCATION_QUALIFICATIONS,
  PAKISTAN_DISTRICTS,
  getCitiesForDistrict,
  DISABILITY_TYPES,
  BLOOD_GROUP_OPTIONS
} from "../../../constants/employeeOptions";
import {
  validateCNIC,
  validateCNICDates,
  validateCNICExpiryDate,
  getTodayDateString,
  validateFileUpload,
  validateMultipleFiles
} from "../../../utils/employeeValidation";

const EditUserForm = ({ user }) => {
  const navigate = useNavigate();
  const { updateEmployee } = useEmployeeStore();
  const { error, isLoading, clearError, withErrorHandling } = useErrorHandler();

  // State for dynamic sections and file uploads
  const [educations, setEducations] = useState(user?.educations || []);
  const [experiences, setExperiences] = useState(user?.past_experiences || []);
  const [availableCities, setAvailableCities] = useState([]);
  const [profilePicturePreview, setProfilePicturePreview] = useState(user?.profile_picture || null);
  const [uploadedFiles, setUploadedFiles] = useState({
    profile_picture: user?.profile_picture || null,
    cnic_front: user?.cnic_front || null,
    cnic_back: user?.cnic_back || null,
    domicile_certificate: user?.domicile_certificate || null,
    disability_document: user?.disability_document || null,
    education_documents: user?.education_documents || {},
    experience_documents: user?.experience_documents || {},
    other_documents: user?.other_documents || []
  });

  const form = useForm({
    defaultValues: {
      full_name: user?.full_name || "",
      father_husband_name: user?.father_husband_name || "",
      relationship_type: user?.relationship_type || "father",
      mother_name: user?.mother_name || "",
      cnic: user?.cnic || "",
      cnic_issue_date: user?.cnic_issue_date || "",
      cnic_expire_date: user?.cnic_expire_date || "",
      date_of_birth: user?.date_of_birth || "",
      gender: user?.gender || "",
      marital_status: user?.marital_status || "",
      nationality: user?.nationality || "Pakistani",
      religion: user?.religion || "",
      blood_group: user?.blood_group || "",
      domicile_district: user?.domicile_district || "",
      mobile_number: user?.mobile_number || "",
      whatsapp_number: user?.whatsapp_number || "",
      email: user?.email || "",
      present_address: user?.present_address || "",
      permanent_address: user?.permanent_address || "",
      same_address: user?.same_address || false,
      district: user?.district || "",
      city: user?.city || "",
      // Enhanced disability information
      has_disability: user?.has_disability || false,
      disability_type: user?.disability_type || "",
      disability_description: user?.disability_description || "",
      mission_note: user?.mission_note || "",
      has_past_experience: user?.has_past_experience || false,
      past_experiences: user?.past_experiences || [],
      // Dynamic education system
      educations: user?.educations || [],
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;

  // Watch for disability checkbox to show/hide related fields
  const hasDisability = watch("has_disability");
  const sameAddress = watch("same_address");
  const watchedDistrict = watch("district");
  const watchedPresentAddress = watch("present_address");

  // Watch for district changes to update cities
  useEffect(() => {
    if (watchedDistrict) {
      const cities = getCitiesForDistrict(watchedDistrict);
      setAvailableCities(cities);
      // Reset city when district changes
      setValue("city", "");
    } else {
      setAvailableCities([]);
    }
  }, [watchedDistrict, setValue]);

  // Watch for same address checkbox
  useEffect(() => {
    if (sameAddress && watchedPresentAddress) {
      setValue("permanent_address", watchedPresentAddress);
    }
  }, [sameAddress, watchedPresentAddress, setValue]);

  // Helper functions for dynamic sections
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

  // Handle updating education
  const updateEducation = (id, field, value) => {
    setEducations(educations.map(edu =>
      edu.id === id ? { ...edu, [field]: value } : edu
    ));
  };

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

  const addExperience = () => {
    const newExperience = {
      id: Date.now().toString(),
      company_name: "",
      position: "",
      start_date: "",
      end_date: "",
      description: ""
    };
    setExperiences([...experiences, newExperience]);
  };

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

  // Handle profile picture upload
  const handleProfilePictureUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validation = validateFileUpload(file, 'profile_picture');
      if (validation.isValid) {
        setValue("profile_picture_file", file);
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
        setValue(`${fileType}_files`, files);
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
          setValue(`${fileType}_file`, file);
        } else {
          alert(validation.message);
          event.target.value = '';
        }
      }
    }
  };

  const handleUpdate = async (data) => {
    try {
      // Prepare the complete data with dynamic sections and file uploads
      const completeData = {
        ...data,
        educations: educations,
        past_experiences: experiences,
        // Include uploaded files
        profile_picture: uploadedFiles.profile_picture,
        cnic_front: uploadedFiles.cnic_front,
        cnic_back: uploadedFiles.cnic_back,
        domicile_certificate: uploadedFiles.domicile_certificate,
        disability_document: uploadedFiles.disability_document,
        education_documents: uploadedFiles.education_documents,
        experience_documents: uploadedFiles.experience_documents,
        other_documents: uploadedFiles.other_documents,
      };

      await withErrorHandling(
        () => updateEmployee(user.id, completeData),
        {
          showAlert: true,
          customMessage: "User information updated successfully!",
        }
      );

      // Navigate back to profile view
      navigate(`/employees/view/${user.id}`);
    } catch (error) {
      // Error already handled by withErrorHandling
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Updating user information..." />;
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
              onClick={() => navigate(`/employees/view/${user.id}`)}
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
                Edit Employee Information
              </h1>
              <p
                className="text-lg"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Update employee details and information
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
              Update the basic personal information for the employee
            </p>
          </div>

          <div className="p-6 text-gray-800">
            <form onSubmit={handleSubmit(handleUpdate)} className="space-y-6">
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
                          setUploadedFiles(prev => ({ ...prev, profile_picture: null }));
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
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <i className="fas fa-upload mr-2"></i>
                      Choose Photo
                    </label>
                    <p className="text-sm text-gray-500 mt-2">
                      JPG, PNG or GIF. Max size 2MB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label required">Full Name</label>
                <input
                  type="text"
                  {...register("full_name", { required: "Full name is required" })}
                  className="form-input w-full"
                  placeholder="Enter full name"
                />
                {errors.full_name && (
                  <p className="error-message">{errors.full_name.message}</p>
                )}
              </div>

              {/* Unified Father/Husband Name Field */}
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  {/* Relationship Type Selector */}
                  <div>
                    <label className="form-label">Relationship Type</label>
                    <SearchableSelect
                      options={RELATIONSHIP_TYPES}
                      value={watch("relationship_type")}
                      onChange={(value) => setValue("relationship_type", value)}
                      placeholder="Select Relationship Type"
                      register={register}
                      name="relationship_type"
                      required={false}
                      error={errors.relationship_type?.message}
                    />
                  </div>

                  {/* Unified Name Field */}
                  <div className="md:col-span-3">
                    <label className="form-label required">Father/Husband Name</label>
                    <input
                      type="text"
                      {...register("father_husband_name", {
                        required: "Father/Husband name is required"
                      })}
                      className="form-input w-full"
                      placeholder={`Enter ${form.watch("relationship_type") === "father" ? "father" : "husband"} name`}
                    />
                    {errors.father_husband_name && (
                      <p className="error-message">{errors.father_husband_name.message}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">Mother Name</label>
                <input
                  type="text"
                  {...register("mother_name")}
                  className="form-input w-full"
                  placeholder="Enter mother name"
                />
              </div>

              <div>
                <label className="form-label required">CNIC</label>
                <input
                  type="text"
                  {...register("cnic", { 
                    required: "CNIC is required",
                    pattern: {
                      value: /^\d{5}-\d{7}-\d{1}$/,
                      message: "CNIC format should be 12345-1234567-1"
                    }
                  })}
                  className="form-input w-full"
                  placeholder="12345-1234567-1"
                />
                {errors.cnic && (
                  <p className="error-message">{errors.cnic.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">CNIC Issue Date</label>
                <input
                  type="date"
                  {...register("cnic_issue_date")}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="form-label required">CNIC Expiry Date</label>
                <input
                  type="date"
                  min={getTodayDateString()}
                  {...register("cnic_expire_date", {
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
                  className="form-input w-full"
                />
                {errors.cnic_expire_date && (
                  <p className="error-message">{errors.cnic_expire_date.message}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Select today's date or a future date
                </p>
              </div>

              <div>
                <label className="form-label">Date of Birth</label>
                <input
                  type="date"
                  {...register("date_of_birth")}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="form-label">Gender</label>
                <SearchableSelect
                  options={[
                    { value: "Male", label: "Male" },
                    { value: "Female", label: "Female" },
                    { value: "Other", label: "Other" }
                  ]}
                  value={watch("gender")}
                  onChange={(value) => setValue("gender", value)}
                  placeholder="Select Gender"
                  register={register}
                  name="gender"
                  required={false}
                  error={errors.gender?.message}
                />
              </div>

              <div>
                <label className="form-label">Marital Status</label>
                <SearchableSelect
                  options={MARITAL_STATUS_OPTIONS}
                  value={watch("marital_status")}
                  onChange={(value) => setValue("marital_status", value)}
                  placeholder="Select Marital Status"
                  register={register}
                  name="marital_status"
                  required={false}
                  error={errors.marital_status?.message}
                />
              </div>

              <div>
                <label className="form-label">Nationality</label>
                <input
                  type="text"
                  {...register("nationality")}
                  className="form-input w-full"
                  placeholder="Pakistani"
                />
              </div>

              <div>
                <label className="form-label">Religion</label>
                <SearchableSelect
                  options={RELIGION_OPTIONS}
                  value={watch("religion")}
                  onChange={(value) => setValue("religion", value)}
                  placeholder="Select Religion"
                  register={register}
                  name="religion"
                  required={false}
                  error={errors.religion?.message}
                />
              </div>

              <div>
                <label className="form-label">Blood Group</label>
                <SearchableSelect
                  options={BLOOD_GROUP_OPTIONS}
                  value={watch("blood_group")}
                  onChange={(value) => setValue("blood_group", value)}
                  placeholder="Select Blood Group"
                  register={register}
                  name="blood_group"
                  required={false}
                  error={errors.blood_group?.message}
                />
              </div>

              <div>
                <label className="form-label">Nationality</label>
                <input
                  type="text"
                  {...register("nationality")}
                  className="form-input w-full"
                  placeholder="Enter nationality"
                  defaultValue="Pakistani"
                />
              </div>
            </div>

            {/* Disability Information */}
            <div className="border-t pt-6">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">
                <i className="fas fa-universal-access mr-2"></i>
                Disability Information
              </h4>

              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    {...register("has_disability")}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-700">
                    I have a disability
                  </label>
                </div>

                {hasDisability && (
                  <div className="ml-6 space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <label className="form-label required">Disability Type</label>
                      <SearchableSelect
                        options={DISABILITY_TYPES}
                        value={watch("disability_type")}
                        onChange={(value) => setValue("disability_type", value)}
                        placeholder="Select disability type"
                        register={register}
                        name="disability_type"
                        required={hasDisability}
                        error={errors.disability_type?.message}
                      />
                      {errors.disability_type && (
                        <p className="error-message">{errors.disability_type.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="form-label">Disability Description</label>
                      <textarea
                        {...register("disability_description")}
                        className="form-input w-full"
                        rows={3}
                        placeholder="Please provide details about your disability (optional)"
                      />
                    </div>

                    {/* Disability Document Upload */}
                    <div>
                      <label className="form-label">Disability Certificate/Document</label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(e, 'disability_document')}
                        className="form-input w-full"
                      />
                      {uploadedFiles.disability_document && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <p className="text-sm text-green-600">
                            ✓ Document uploaded: {uploadedFiles.disability_document.name || 'Existing document'}
                          </p>
                          {uploadedFiles.disability_document.name && (
                            <p className="text-xs text-gray-500">
                              Size: {(uploadedFiles.disability_document.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Upload disability certificate or medical document (PDF, JPG, PNG, max 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

        {/* Contact Information */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              <i className="fas fa-phone mr-2"></i>
              Contact Information
            </h3>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Mobile Number</label>
                <input
                  type="text"
                  {...register("mobile_number", {
                    pattern: {
                      value: /^(\+92|0)?[0-9]{10}$/,
                      message: "Invalid mobile number format"
                    }
                  })}
                  className="form-input w-full"
                  placeholder="+92-300-1234567"
                />
                {errors.mobile_number && (
                  <p className="error-message">{errors.mobile_number.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">WhatsApp Number</label>
                <input
                  type="text"
                  {...register("whatsapp_number")}
                  className="form-input w-full"
                  placeholder="+92-300-1234567"
                />
              </div>

              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  {...register("email", {
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Invalid email format"
                    }
                  })}
                  className="form-input w-full"
                  placeholder="user@example.com"
                />
                {errors.email && (
                  <p className="error-message">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">District</label>
                <SearchableSelect
                  options={PAKISTAN_DISTRICTS}
                  value={watch("district")}
                  onChange={(value) => setValue("district", value)}
                  placeholder="Select District"
                  register={register}
                  name="district"
                  required={false}
                  error={errors.district?.message}
                />
              </div>

              <div>
                <label className="form-label">City</label>
                <SearchableSelect
                  options={availableCities}
                  value={watch("city")}
                  onChange={(value) => setValue("city", value)}
                  placeholder="Select City"
                  register={register}
                  name="city"
                  required={false}
                  error={errors.city?.message}
                  disabled={!watchedDistrict}
                />
                {!watchedDistrict && (
                  <p className="text-sm text-gray-500 mt-1">
                    Please select a district first
                  </p>
                )}
              </div>

              <div>
                <label className="form-label">Domicile District</label>
                <input
                  type="text"
                  {...register("domicile_district")}
                  className="form-input w-full"
                  placeholder="Enter domicile district"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="form-label">Present Address</label>
                <textarea
                  {...register("present_address")}
                  className="form-input w-full"
                  rows={3}
                  placeholder="Enter present address"
                  onChange={(e) => {
                    // If same address is checked, copy to permanent address
                    if (sameAddress) {
                      setValue("permanent_address", e.target.value);
                    }
                  }}
                />
              </div>

              {/* Same Address Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...register("same_address")}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  onChange={(e) => {
                    if (e.target.checked) {
                      const presentAddress = watch("present_address");
                      setValue("permanent_address", presentAddress);
                    }
                  }}
                />
                <label className="ml-2 text-sm font-medium text-gray-700">
                  Permanent address is same as present address
                </label>
              </div>

              <div>
                <label className="form-label">Permanent Address</label>
                <textarea
                  {...register("permanent_address")}
                  className="form-input w-full"
                  rows={3}
                  placeholder="Enter permanent address"
                  disabled={sameAddress}
                />
                {sameAddress && (
                  <p className="text-sm text-gray-500 mt-1">
                    This field is automatically filled from present address
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Education & Experience */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              <i className="fas fa-graduation-cap mr-2"></i>
              Education & Experience
            </h3>
          </div>
          
          <div className="p-6 space-y-6">
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
                              placeholder="Enter marks or GPA"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="form-label">Mission Note</label>
              <textarea
                {...register("mission_note")}
                className="form-input w-full"
                rows={3}
                placeholder="Enter mission note or career objective"
              />
            </div>
          </div>
        </div>

        {/* Work Experience Section */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              <i className="fas fa-briefcase mr-2"></i>
              Work Experience
            </h3>
          </div>

          <div className="p-6 space-y-6">
            {/* Past Work Experience */}
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

          </div>
        </div>

        {/* Document Uploads */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              <i className="fas fa-file-upload mr-2"></i>
              Document Uploads
            </h3>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CNIC Front */}
              <div>
                <label className="form-label">CNIC Front</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,.pdf"
                  onChange={(e) => handleFileUpload(e, 'cnic_front')}
                  className="form-input w-full"
                />
                {uploadedFiles.cnic_front && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-600">
                      ✓ Document uploaded: {uploadedFiles.cnic_front.name || 'Existing document'}
                    </p>
                    {uploadedFiles.cnic_front.name && (
                      <p className="text-xs text-gray-500">
                        Size: {(uploadedFiles.cnic_front.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Upload front side of CNIC (JPG, PNG, PDF, max 5MB)
                </p>
              </div>

              {/* CNIC Back */}
              <div>
                <label className="form-label">CNIC Back</label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,.pdf"
                  onChange={(e) => handleFileUpload(e, 'cnic_back')}
                  className="form-input w-full"
                />
                {uploadedFiles.cnic_back && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-600">
                      ✓ Document uploaded: {uploadedFiles.cnic_back.name || 'Existing document'}
                    </p>
                    {uploadedFiles.cnic_back.name && (
                      <p className="text-xs text-gray-500">
                        Size: {(uploadedFiles.cnic_back.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Upload back side of CNIC (JPG, PNG, PDF, max 5MB)
                </p>
              </div>

              {/* Domicile Certificate */}
              <div>
                <label className="form-label">Domicile Certificate</label>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/jpg,image/png"
                  onChange={(e) => handleFileUpload(e, 'domicile_certificate')}
                  className="form-input w-full"
                />
                {uploadedFiles.domicile_certificate && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-600">
                      ✓ Document uploaded: {uploadedFiles.domicile_certificate.name || 'Existing document'}
                    </p>
                    {uploadedFiles.domicile_certificate.name && (
                      <p className="text-xs text-gray-500">
                        Size: {(uploadedFiles.domicile_certificate.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Upload domicile certificate (PDF, JPG, PNG, max 5MB)
                </p>
              </div>

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
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setUploadedFiles(prev => ({
                                ...prev,
                                experience_documents: {
                                  ...prev.experience_documents,
                                  [experience.id]: file
                                }
                              }));
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {uploadedFiles.experience_documents?.[experience.id] && (
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
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setUploadedFiles(prev => ({
                                ...prev,
                                education_documents: {
                                  ...prev.education_documents,
                                  [education.id]: file
                                }
                              }));
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        {uploadedFiles.education_documents?.[education.id] && (
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
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-between pt-6 border-t" style={{ borderColor: 'var(--color-border-light)' }}>
          <button
            type="button"
            onClick={() => navigate(`/employees/view/${user.id}`)}
            className="btn btn-secondary"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            <i className="fas fa-save mr-2"></i>
            Update User Information
          </button>
        </div>
              </form>
            </div>
          </div>
        </div>
      </div>
  );
};

export default EditUserForm;
