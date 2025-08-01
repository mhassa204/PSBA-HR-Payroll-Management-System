// Employee form dropdown options and constants

// Religion options for Pakistani context
export const RELIGION_OPTIONS = [
  { value: "Muslim", label: "Muslim" },
  { value: "Non-Muslim", label: "Non-Muslim" },
  { value: "Maseehi", label: "Maseehi (Christian)" },
];

// Disability types
export const DISABILITY_TYPES = [
  { value: "hearing_impairment", label: "Hearing Impairment" },
  { value: "visual_impairment", label: "Visual Impairment" },
  { value: "physical_disability", label: "Physical Disability" },
  { value: "learning_disability", label: "Learning Disability" },
  { value: "speech_impairment", label: "Speech Impairment" },
  { value: "other", label: "Other" },
];

// Education qualifications
export const EDUCATION_QUALIFICATIONS = [
  { value: "matric", label: "Matric" },
  { value: "intermediate", label: "Intermediate" },
  { value: "bachelors", label: "Bachelor's" },
  { value: "masters", label: "Master's" },
  { value: "phd", label: "PhD" },
  { value: "diploma", label: "Diploma" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other" },
];

// Marital status options (now optional)
export const MARITAL_STATUS_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

// Blood group options
export const BLOOD_GROUP_OPTIONS = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

// Relationship types for father/husband name
export const RELATIONSHIP_TYPES = [
  { value: "father", label: "Father" },
  { value: "husband", label: "Husband" },
];

// Pakistani districts and cities
export const PAKISTAN_DISTRICTS = [
  {
    value: "lahore",
    label: "Lahore",
    cities: [
      { value: "lahore_city", label: "Lahore City" },
      { value: "kasur", label: "Kasur" },
      { value: "sheikhupura", label: "Sheikhupura" },
      { value: "nankana_sahib", label: "Nankana Sahib" },
    ]
  },
  {
    value: "karachi",
    label: "Karachi",
    cities: [
      { value: "karachi_central", label: "Karachi Central" },
      { value: "karachi_east", label: "Karachi East" },
      { value: "karachi_west", label: "Karachi West" },
      { value: "karachi_south", label: "Karachi South" },
      { value: "malir", label: "Malir" },
      { value: "korangi", label: "Korangi" },
    ]
  },
  {
    value: "islamabad",
    label: "Islamabad",
    cities: [
      { value: "islamabad_city", label: "Islamabad City" },
      { value: "rawalpindi", label: "Rawalpindi" },
      { value: "attock", label: "Attock" },
    ]
  },
  {
    value: "faisalabad",
    label: "Faisalabad",
    cities: [
      { value: "faisalabad_city", label: "Faisalabad City" },
      { value: "jhang", label: "Jhang" },
      { value: "toba_tek_singh", label: "Toba Tek Singh" },
    ]
  },
  {
    value: "multan",
    label: "Multan",
    cities: [
      { value: "multan_city", label: "Multan City" },
      { value: "khanewal", label: "Khanewal" },
      { value: "lodhran", label: "Lodhran" },
      { value: "vehari", label: "Vehari" },
    ]
  },
  {
    value: "peshawar",
    label: "Peshawar",
    cities: [
      { value: "peshawar_city", label: "Peshawar City" },
      { value: "charsadda", label: "Charsadda" },
      { value: "nowshera", label: "Nowshera" },
    ]
  },
  {
    value: "quetta",
    label: "Quetta",
    cities: [
      { value: "quetta_city", label: "Quetta City" },
      { value: "pishin", label: "Pishin" },
      { value: "killa_abdullah", label: "Killa Abdullah" },
    ]
  },
  {
    value: "gujranwala",
    label: "Gujranwala",
    cities: [
      { value: "gujranwala_city", label: "Gujranwala City" },
      { value: "gujrat", label: "Gujrat" },
      { value: "sialkot", label: "Sialkot" },
      { value: "narowal", label: "Narowal" },
    ]
  },
  {
    value: "hyderabad",
    label: "Hyderabad",
    cities: [
      { value: "hyderabad_city", label: "Hyderabad City" },
      { value: "badin", label: "Badin" },
      { value: "thatta", label: "Thatta" },
    ]
  },
  {
    value: "bahawalpur",
    label: "Bahawalpur",
    cities: [
      { value: "bahawalpur_city", label: "Bahawalpur City" },
      { value: "bahawalnagar", label: "Bahawalnagar" },
      { value: "rahim_yar_khan", label: "Rahim Yar Khan" },
    ]
  },
];

// Helper function to get cities for a district
export const getCitiesForDistrict = (districtValue) => {
  const district = PAKISTAN_DISTRICTS.find(d => d.value === districtValue);
  return district ? district.cities : [];
};

// File upload configurations
export const FILE_UPLOAD_CONFIG = {
  profile_picture: {
    accept: "image/jpeg,image/png,image/gif",
    maxSize: 5 * 1024 * 1024, // 5MB
    types: ["image/jpeg", "image/png", "image/gif"],
  },
  cnic_documents: {
    accept: "image/jpeg,image/png,application/pdf",
    maxSize: 10 * 1024 * 1024, // 10MB
    types: ["image/jpeg", "image/png", "application/pdf"],
  },
  certificates: {
    accept: "image/jpeg,image/png,application/pdf",
    maxSize: 10 * 1024 * 1024, // 10MB
    types: ["image/jpeg", "image/png", "application/pdf"],
  },
  other_documents: {
    accept: "image/jpeg,image/png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    maxSize: 15 * 1024 * 1024, // 15MB
    types: ["image/jpeg", "image/png", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  },
};

// CNIC validation regex
export const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/;

// Validation messages
export const VALIDATION_MESSAGES = {
  cnic_format: "CNIC must be in format: 12345-1234567-1",
  cnic_expiry_future: "CNIC expiry date must be in the future",
  cnic_issue_before_expiry: "CNIC issue date must be before expiry date",
  file_size_exceeded: "File size exceeds maximum allowed limit",
  file_type_invalid: "Invalid file type. Please select a supported format",
  required_field: "This field is required",
};
