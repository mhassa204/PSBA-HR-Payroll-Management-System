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
  // EDUCATION_QUALIFICATIONS, // replaced by API
  PAKISTAN_DISTRICTS,
  // getCitiesForDistrict, // replaced by API
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
import ProfilePicture from "../../../components/ui/ProfilePicture";
import { getProfilePictureUrl, getImageUrl } from "../../../utils/imageUtils";
import CNICInput from "../../../components/ui/CNICInput";
import { formatDatabaseDateForInput } from "../../../utils/formatters";
import DocumentManager from "../../../components/ui/DocumentManager";
import { useDocumentManager } from "../hooks/useDocumentManager";
import { employeeService } from "../services/employeeService";
// New services for master data
import { districtService } from "../../settings/services/districtService";
import { cityService } from "../../settings/services/cityService";
import { educationLevelService } from "../../settings/services/educationLevelService";

const EditUserForm = ({ user }) => {
  console.log("EditUserForm received user data:", user);
  console.log("User profile_picture field:", user?.profile_picture);
  const navigate = useNavigate();
  const { updateEmployee } = useEmployeeStore();
  const { error, isLoading, clearError, withErrorHandling } = useErrorHandler();

  // State for dynamic sections and file uploads
  const [educations, setEducations] = useState(() =>
    (user?.educationQualifications || []).map(eq => ({
      id: eq.id,
      education_level_id: eq.education_level_id || eq.level?.id || "",
      education_level: eq.level?.name || eq.education_level || "",
      institution_name: eq.institution_name || "",
      year_of_completion: eq.year_of_completion || "",
      marks_gpa: eq.marks_gpa || "",
      start_date: formatDatabaseDateForInput(eq.start_date) || "",
    }))
  );
  const [experiences, setExperiences] = useState(user?.pastExperiences || []);

  // API-driven master data
  const [districtOptions, setDistrictOptions] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [educationLevelOptions, setEducationLevelOptions] = useState([]);
  const [districtMap, setDistrictMap] = useState({});
  const [cityMap, setCityMap] = useState({});
  const [levelMap, setLevelMap] = useState({});

  const [profilePicturePreview, setProfilePicturePreview] = useState(() => {
    if (user?.profile_picture_url) {
      return `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'}${user.profile_picture_url}`;
    } else if (user?.profile_picture) {
      return getImageUrl(user.profile_picture);
    }
    return null;
  });
  const [removeProfilePicture, setRemoveProfilePicture] = useState(!user?.profile_picture);

  // Initialize document manager with existing documents
  const documentManager = useDocumentManager(user?.documents || []);

  const [uploadedFiles, setUploadedFiles] = useState({
    profile_picture: user?.profile_picture || null,
    cnic_front: user?.cnic_front || null,
    cnic_back: user?.cnic_back || null,
    domicile_certificate: user?.domicile_certificate || null,
    disability_document: user?.disability_document || null,
    medical_fitness_file: user?.medical_fitness_file || null,
    police_character_certificate_file: user?.police_character_certificate_file || null,
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
      cnic_issue_date: formatDatabaseDateForInput(user?.cnic_issue_date) || "",
      cnic_expire_date: formatDatabaseDateForInput(user?.cnic_expire_date) || "",
      date_of_birth: formatDatabaseDateForInput(user?.date_of_birth) || "",
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
      // Switch to normalized IDs
      district_id: user?.district_id || "",
      city_id: user?.city_id || "",
      has_disability: user?.has_disability || false,
      disability_type: user?.disability_type || "",
      disability_description: user?.disability_description || "",
      missing_note: user?.missing_note || "",
      has_past_experience: user?.has_past_experience || false,
      past_experiences: user?.pastExperiences || [],
      educations: (user?.educationQualifications || []).map(eq => ({
        id: eq.id,
        education_level_id: eq.education_level_id || eq.level?.id || "",
        education_level: eq.level?.name || eq.education_level || "",
        institution_name: eq.institution_name || "",
        year_of_completion: eq.year_of_completion || "",
        marks_gpa: eq.marks_gpa || "",
        start_date: formatDatabaseDateForInput(eq.start_date) || "",
      })),
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;

  // Load master data
  useEffect(() => {
    (async () => {
      try {
        const [districts, levels] = await Promise.all([
          districtService.getAllDistricts(),
          educationLevelService.getAllLevels(),
        ]);
        const dList = (districts?.districts || districts || []).map(d => ({ value: d.id, label: d.name }));
        setDistrictOptions(dList);
        setDistrictMap(Object.fromEntries(dList.map(o => [String(o.value), o.label])));
        const lList = (levels || []).map(l => ({ value: l.id, label: l.name }));
        setEducationLevelOptions(lList);
        setLevelMap(Object.fromEntries(lList.map(o => [String(o.value), o.label])));
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Initialize and react to district_id to fetch cities
  const watchedDistrictId = watch("district_id");
  useEffect(() => {
    (async () => {
      const dId = watchedDistrictId || user?.district_id;
      if (dId) {
        try {
          const cities = await cityService.getAllCities({ district_id: dId });
          const cList = (cities?.cities || cities || []).map(c => ({ value: c.id, label: c.name }));
          setAvailableCities(cList);
          setCityMap(Object.fromEntries(cList.map(o => [String(o.value), o.label])));
          // If user's city_id is set initially, keep it; else ensure valid
          const currentCityId = form.getValues("city_id");
          if (currentCityId && !cList.some(c => String(c.value) === String(currentCityId))) {
            setValue("city_id", "");
          }
        } catch (_) {
          setAvailableCities([]);
          setValue("city_id", "");
        }
      } else {
        setAvailableCities([]);
        setValue("city_id", "");
      }
    })();
  }, [watchedDistrictId, user?.district_id, form, setValue]);

  // Watch for disability checkbox to show/hide related fields
  const hasDisability = watch("has_disability");
  const sameAddress = watch("same_address");
  const watchedPresentAddress = watch("present_address");

  // Same address auto-fill
  useEffect(() => {
    if (sameAddress && watchedPresentAddress) {
      setValue("permanent_address", watchedPresentAddress);
    }
  }, [sameAddress, watchedPresentAddress, setValue]);

  // Helper functions for dynamic sections
  const addEducation = () => {
    const newEducation = {
      id: Date.now(),
      education_level_id: "",
      education_level: "",
      institution_name: "",
      year_of_completion: "",
      marks_gpa: "",
      start_date: "",
    };
    setEducations([...educations, newEducation]);
  };

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

  const updateExperience = (id, field, value) => {
    setExperiences(experiences.map(exp =>
      exp.id === id ? { ...exp, [field]: value } : exp
    ));
  };

  const handleProfilePictureUpload = (event) => {
    console.log("Profile picture upload triggered");
    const file = event.target.files[0];
    console.log("Selected file:", file);
    if (file) {
      const validation = validateFileUpload(file, 'profile_picture');
      console.log("File validation result:", validation);
      if (validation.isValid) {
        console.log("Setting profile_picture_file in form:", file);
        setValue("profile_picture_file", file);
        setUploadedFiles(prev => ({ ...prev, profile_picture: file }));
        setRemoveProfilePicture(false);
        const reader = new FileReader();
        reader.onload = (e) => {
          console.log("FileReader loaded, setting preview");
          setProfilePicturePreview(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        alert(validation.message);
        event.target.value = '';
      }
    } else {
      setProfilePicturePreview(null);
      setValue("profile_picture_file", null);
      setUploadedFiles(prev => ({ ...prev, profile_picture: null }));
      setRemoveProfilePicture(true);
      event.target.value = '';
    }
  };

  const handleRemoveProfilePicture = () => {
    console.log("Removing profile picture");
    setProfilePicturePreview(null);
    setValue("profile_picture_file", null);
    setUploadedFiles(prev => ({ ...prev, profile_picture: null }));
    setRemoveProfilePicture(true);
    const fileInput = document.getElementById("profile-picture-upload");
    if (fileInput) fileInput.value = '';
  };

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
      // Collect document changes from DocumentManager
      const filesData = documentManager.getFormData();
      const documentsToRemove = documentManager.getDocumentsToRemove();

      const completeData = {
        ...data,
        educations: educations,
        past_experiences: experiences,
        // include files from document manager and removal list
        ...filesData,
        documents_to_remove: documentsToRemove,
      };

      // Preserve existing profile picture logic
      completeData.profile_picture = removeProfilePicture ? null : (data.profile_picture_file || user?.profile_picture);

      await withErrorHandling(
        () => updateEmployee(user.id, completeData),
        {
          showAlert: true,
          customMessage: "User information updated successfully!",
        }
      );

      // Optionally refresh user data
      try {
        await employeeService.getEmployeeById(user.id);
      } catch (_) {}

      navigate(`/employees/view/${user.id}`);
    } catch (error) {
      console.error("Error in handleUpdate:", error);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Updating user information..." />;
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-background-secondary)" }}>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-3xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                Edit Employee Information
              </h1>
              <p className="text-lg" style={{ color: "var(--color-text-secondary)" }}>
                Update employee details and information
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <ErrorMessage error={error} onRetry={clearError} showHomeLink={false} />
          </div>
        )}

        <form onSubmit={handleSubmit(handleUpdate)}>
          <div className="card">
            <div className="card-header">
              <h3 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
                <i className="fas fa-user mr-2"></i>
                Basic Employee Information
              </h3>
              <p style={{ color: "var(--color-text-secondary)" }}>
                Update the basic personal information for the employee
              </p>
            </div>

            <div className="p-6 text-gray-800">
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
                        onError={(e) => {
                          console.error("Profile picture failed to load:", profilePicturePreview);
                          setProfilePicturePreview(null);
                          setRemoveProfilePicture(true);
                        }}
                        onLoad={() => {
                          console.log("Profile picture loaded successfully:", profilePicturePreview);
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveProfilePicture}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : user?.profile_picture && !removeProfilePicture ? (
                    <div className="relative">
                      <ProfilePicture
                        employee={user}
                        size="xl"
                        className="w-24 h-24 border-2 border-gray-300"
                        showFallback={true}
                        onError={() => {
                          console.error("Existing profile picture failed to load");
                          setProfilePicturePreview(null);
                          setRemoveProfilePicture(true);
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveProfilePicture}
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
                    <div className="space-y-2">
                      <label
                        htmlFor="profile-picture-upload"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <i className="fas fa-upload mr-2"></i>
                        Choose Photo
                      </label>
                      {(profilePicturePreview || (user?.profile_picture && !removeProfilePicture)) && (
                        <button
                          type="button"
                          onClick={handleRemoveProfilePicture}
                          className="ml-2 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                        >
                          <i className="fas fa-times mr-1"></i>
                          Clear Selection
                        </button>
                      )}
                    </div>
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

                <div className="md:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                  <CNICInput
                    value={watch("cnic")}
                    onChange={(e) => setValue("cnic", e.target.value)}
                    label="CNIC"
                    required={true}
                    placeholder="1234567890123"
                    error={errors.cnic?.message}
                    name="cnic"
                    showValidation={true}
                  />
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
                        const expiryValidation = validateCNICExpiryDate(value);
                        if (!expiryValidation.isValid) {
                          return expiryValidation.message;
                        }
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
                    </div>
                  )}
                </div>
              </div>

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
                        options={districtOptions}
                        value={watch("district_id")}
                        onChange={(value) => setValue("district_id", value)}
                        placeholder="Select District"
                        register={register}
                        name="district_id"
                        required={false}
                        error={errors.district_id?.message}
                      />
                    </div>
                    <div>
                      <label className="form-label">City</label>
                      <SearchableSelect
                        options={availableCities}
                        value={watch("city_id")}
                        onChange={(value) => setValue("city_id", value)}
                        placeholder="Select City"
                        register={register}
                        name="city_id"
                        required={false}
                        error={errors.city_id?.message}
                        disabled={!watch("district_id")}
                      />
                      {!watch("district_id") && (
                        <p className="text-gray-500 text-sm mt-1">Please select a district first</p>
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
                          if (sameAddress) {
                            setValue("permanent_address", e.target.value);
                          }
                        }}
                      />
                    </div>
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

              <div className="card">
                <div className="card-header">
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    <i className="fas fa-graduation-cap mr-2"></i>
                    Education & Experience
                  </h3>
                </div>
                <div className="p-6 space-y-6">
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
                                  <SearchableSelect
                                    options={educationLevelOptions}
                                    value={education.education_level_id}
                                    valueLabel={education.education_level}
                                    onChange={(value, label) => {
                                      updateEducation(education.id, 'education_level_id', value);
                                      updateEducation(education.id, 'education_level', label || levelMap[String(value)] || '');
                                    }}
                                    placeholder={educationLevelOptions.length ? "Select Education Level" : "No levels available"}
                                    register={() => ({})}
                                    name={`education_level_${education.id}`}
                                    required={true}
                                    error={null}
                                    allowClear={true}
                                    dropdownPriority="high"
                                  />
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
                                    className="form-input w-full"
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
                                    className="form-input w-full"
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
                                    className="form-input w-full"
                                    placeholder="e.g., 3.5 GPA or 85%"
                                  />
                                </div>

                                {/* Start Date */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Start Date
                                  </label>
                                  <input
                                    type="date"
                                    value={education.start_date || ''}
                                    onChange={(e) => updateEducation(education.id, 'start_date', e.target.value)}
                                    className="form-input w-full"
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
                    <label className="form-label">Missing Note</label>
                    <textarea
                      {...register("missing_note")}
                      className="form-input w-full"
                      rows={3}
                      placeholder="Enter mission note or career objective"
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    <i className="fas fa-briefcase mr-2"></i>
                    Work Experience
                  </h3>
                </div>
                <div className="p-6 space-y-6">
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

              <div className="card">
                <div className="card-header">
                  <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    <i className="fas fa-file-upload mr-2"></i>
                    Document Uploads
                  </h3>
                </div>
                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DocumentManager
                      documents={documentManager.documents}
                      documentType="cnic_front"
                      title="CNIC Front"
                      accept="image/jpeg,image/png"
                      maxSize={50 * 1024 * 1024}
                      onDocumentAdd={documentManager.addDocument}
                      onDocumentRemove={documentManager.removeDocument}
                    />
                    <DocumentManager
                      documents={documentManager.documents}
                      documentType="cnic_back"
                      title="CNIC Back"
                      accept="image/jpeg,image/png"
                      maxSize={50 * 1024 * 1024}
                      onDocumentAdd={documentManager.addDocument}
                      onDocumentRemove={documentManager.removeDocument}
                    />
                  </div>
                  <DocumentManager
                    documents={documentManager.documents}
                    documentType="domicile"
                    title="Domicile Certificate"
                    accept="application/pdf"
                    maxSize={50 * 1024 * 1024}
                    onDocumentAdd={documentManager.addDocument}
                    onDocumentRemove={documentManager.removeDocument}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DocumentManager
                      documents={documentManager.documents}
                      documentType="medical_fitness"
                      title="Medical Fitness Report (Optional)"
                      accept="application/pdf"
                      maxSize={50 * 1024 * 1024}
                      onDocumentAdd={documentManager.addDocument}
                      onDocumentRemove={documentManager.removeDocument}
                    />
                    <DocumentManager
                      documents={documentManager.documents}
                      documentType="police_character"
                      title="Police Character Certificate (Optional)"
                      accept="application/pdf"
                      maxSize={50 * 1024 * 1024}
                      onDocumentAdd={documentManager.addDocument}
                      onDocumentRemove={documentManager.removeDocument}
                    />
                  </div>
                  {experiences.length > 0 && (
                    <div className="space-y-6">
                      <h4 className="text-lg font-medium text-gray-900">
                        <i className="fas fa-briefcase mr-2"></i>
                        Experience Supporting Documents
                      </h4>
                      {experiences.map((experience, index) => (
                        <DocumentManager
                          key={experience.id}
                          documents={documentManager.documents}
                          documentType="experience"
                          title="Experience Document"
                          associatedId={experience.id}
                          associatedLabel={`${experience.company_name || 'Experience'} ${index + 1}`}
                          accept="application/pdf"
                          maxSize={50 * 1024 * 1024}
                          multiple={false}
                          onDocumentAdd={documentManager.addDocument}
                          onDocumentRemove={documentManager.removeDocument}
                        />
                      ))}
                    </div>
                  )}
                  {educations.length > 0 && (
                    <div className="space-y-6">
                      <h4 className="text-lg font-medium text-gray-900">
                        <i className="fas fa-graduation-cap mr-2"></i>
                        Education Supporting Documents
                      </h4>
                      {educations.map((education, index) => (
                        <DocumentManager
                          key={education.id}
                          documents={documentManager.documents}
                          documentType="education"
                          title="Education Document"
                          associatedId={education.id}
                          associatedLabel={`${education.education_level || 'Education'} ${index + 1} - ${education.institution_name || 'Institution'}`}
                          accept="application/pdf"
                          maxSize={50 * 1024 * 1024}
                          multiple={false}
                          onDocumentAdd={documentManager.addDocument}
                          onDocumentRemove={documentManager.removeDocument}
                        />
                      ))}
                    </div>
                  )}
                  {form.watch("has_disability") && (
                    <DocumentManager
                      documents={documentManager.documents}
                      documentType="disability"
                      title="Disability Supporting Document"
                      accept="application/pdf"
                      maxSize={50 * 1024 * 1024}
                      onDocumentAdd={documentManager.addDocument}
                      onDocumentRemove={documentManager.removeDocument}
                    />
                  )}
                  <DocumentManager
                    documents={documentManager.documents}
                    documentType="other"
                    title="Other Documents"
                    accept="application/pdf"
                    maxSize={50 * 1024 * 1024}
                    multiple={true}
                    onDocumentAdd={documentManager.addDocument}
                    onDocumentRemove={documentManager.removeDocument}
                  />
                </div>
              </div>

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
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};



export default EditUserForm;





