import { useState, useEffect, useMemo } from 'react';
import { 
  getOrganizationConfig, 
  isFieldVisible, 
  isSectionVisible, 
  getHiddenFieldDefaults 
} from '../../../constants/organizationFieldConfig';

/**
 * Custom hook for managing organization-based field visibility
 * @param {string} selectedOrganization - Currently selected organization
 * @param {Object} formData - Current form data
 * @param {Function} setFormData - Function to update form data
 * @returns {Object} Field visibility utilities and state
 */
export const useOrganizationFields = (selectedOrganization, formData, setFormData) => {
  const [organizationConfig, setOrganizationConfig] = useState(null);
  const [hiddenFieldDefaults, setHiddenFieldDefaults] = useState({});

  // Update configuration when organization changes
  useEffect(() => {
    const config = getOrganizationConfig(selectedOrganization);
    setOrganizationConfig(config);
    
    const defaults = getHiddenFieldDefaults(selectedOrganization);
    setHiddenFieldDefaults(defaults);
    
    // Apply default values to hidden fields
    if (setFormData && Object.keys(defaults).length > 0) {
      setFormData(prevData => ({
        ...prevData,
        ...defaults
      }));
    }
  }, [selectedOrganization, setFormData]);

  // Memoized field visibility checker
  const checkFieldVisibility = useMemo(() => {
    return (section, fieldName) => {
      return isFieldVisible(selectedOrganization, section, fieldName);
    };
  }, [selectedOrganization]);

  // Memoized section visibility checker
  const checkSectionVisibility = useMemo(() => {
    return (section) => {
      return isSectionVisible(selectedOrganization, section);
    };
  }, [selectedOrganization]);

  // Get visible fields for a section
  const getVisibleFields = useMemo(() => {
    return (section, allFields) => {
      if (!organizationConfig) return allFields;
      
      return allFields.filter(fieldName => 
        checkFieldVisibility(section, fieldName)
      );
    };
  }, [organizationConfig, checkFieldVisibility]);

  // Get CSS classes for field visibility
  const getFieldClasses = useMemo(() => {
    return (section, fieldName, baseClasses = '') => {
      const isVisible = checkFieldVisibility(section, fieldName);
      const visibilityClass = isVisible ? 'block' : 'hidden';
      return `${baseClasses} ${visibilityClass}`.trim();
    };
  }, [checkFieldVisibility]);

  // Get CSS classes for section visibility
  const getSectionClasses = useMemo(() => {
    return (section, baseClasses = '') => {
      const isVisible = checkSectionVisibility(section);
      const visibilityClass = isVisible ? 'block' : 'hidden';
      return `${baseClasses} ${visibilityClass}`.trim();
    };
  }, [checkSectionVisibility]);

  // Filter form data to exclude hidden fields before submission
  const filterFormDataForSubmission = useMemo(() => {
    return (data) => {
      if (!organizationConfig) return data;
      
      const filteredData = { ...data };
      
      // Remove hidden fields from each section
      Object.keys(organizationConfig.hiddenFields).forEach(section => {
        organizationConfig.hiddenFields[section].forEach(fieldName => {
          if (filteredData[fieldName] !== undefined) {
            // Keep default values for hidden fields, don't remove them entirely
            filteredData[fieldName] = hiddenFieldDefaults[fieldName] || filteredData[fieldName];
          }
        });
      });
      
      return filteredData;
    };
  }, [organizationConfig, hiddenFieldDefaults]);

  // Get validation rules that should be applied based on visible fields
  const getValidationRules = useMemo(() => {
    return (section, fieldName, defaultRules = {}) => {
      const isVisible = checkFieldVisibility(section, fieldName);
      
      if (!isVisible) {
        // Remove required validation for hidden fields
        const { required, ...nonRequiredRules } = defaultRules;
        return nonRequiredRules;
      }
      
      return defaultRules;
    };
  }, [checkFieldVisibility]);

  // Check if organization has specific field restrictions
  const hasFieldRestrictions = useMemo(() => {
    return selectedOrganization && selectedOrganization !== 'PSBA';
  }, [selectedOrganization]);

  // Get organization display name
  const organizationDisplayName = useMemo(() => {
    return organizationConfig?.name || selectedOrganization || 'Default';
  }, [organizationConfig, selectedOrganization]);

  return {
    // Configuration
    organizationConfig,
    hiddenFieldDefaults,
    hasFieldRestrictions,
    organizationDisplayName,
    
    // Visibility checkers
    isFieldVisible: checkFieldVisibility,
    isSectionVisible: checkSectionVisibility,
    getVisibleFields,
    
    // CSS utilities
    getFieldClasses,
    getSectionClasses,
    
    // Data utilities
    filterFormDataForSubmission,
    getValidationRules,
    
    // Field lists for specific organizations
    isEmploymentFieldVisible: (fieldName) => checkFieldVisibility('employment', fieldName),
    isSalaryFieldVisible: (fieldName) => checkFieldVisibility('salary', fieldName),
    isLocationFieldVisible: (fieldName) => checkFieldVisibility('location', fieldName),
    isContractFieldVisible: (fieldName) => checkFieldVisibility('contract', fieldName),
    
    // Section visibility
    isEmploymentSectionVisible: checkSectionVisibility('employment'),
    isSalarySectionVisible: checkSectionVisibility('salary'),
    isLocationSectionVisible: checkSectionVisibility('location'),
    isContractSectionVisible: checkSectionVisibility('contract')
  };
};
