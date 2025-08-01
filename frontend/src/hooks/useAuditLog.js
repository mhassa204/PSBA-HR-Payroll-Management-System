// React hook for audit logging
// Provides easy-to-use audit logging functions for React components

import { useCallback } from 'react';
import auditService from '../services/auditService';

export const useAuditLog = () => {
  // Generic audit logging function
  const logAudit = useCallback((action, resource, details = {}) => {
    return auditService.log(action, resource, details);
  }, []);

  // Employee-specific audit functions
  const logEmployeeCreated = useCallback((employee, details = {}) => {
    return auditService.logEmployeeCreated(employee, details);
  }, []);

  const logEmployeeUpdated = useCallback((employeeId, oldValues, newValues, details = {}) => {
    return auditService.logEmployeeUpdated(employeeId, oldValues, newValues, details);
  }, []);

  const logEmployeeDeleted = useCallback((employee, details = {}) => {
    return auditService.logEmployeeDeleted(employee, details);
  }, []);

  const logEmployeeViewed = useCallback((employee, details = {}) => {
    return auditService.log('VIEW', 'EMPLOYEE', {
      resource_id: employee.id,
      description: `Viewed employee profile: ${employee.full_name}`,
      category: 'DATA_ACCESS',
      severity: 'LOW',
      ...details
    });
  }, []);

  // Employment record audit functions
  const logEmploymentRecordCreated = useCallback((record, details = {}) => {
    return auditService.logEmploymentRecordCreated(record, details);
  }, []);

  const logEmploymentRecordUpdated = useCallback((recordId, oldValues, newValues, details = {}) => {
    return auditService.logEmploymentRecordUpdated(recordId, oldValues, newValues, details);
  }, []);

  const logEmploymentRecordDeleted = useCallback((record, details = {}) => {
    return auditService.logEmploymentRecordDeleted(record, details);
  }, []);

  const logEmploymentRecordViewed = useCallback((record, details = {}) => {
    return auditService.log('VIEW', 'EMPLOYMENT_RECORD', {
      resource_id: record.id,
      description: `Viewed employment record for employee ${record.user_id}`,
      category: 'DATA_ACCESS',
      severity: 'LOW',
      ...details
    });
  }, []);

  // Authentication audit functions
  const logUserLogin = useCallback((user, details = {}) => {
    return auditService.logUserLogin(user, details);
  }, []);

  const logUserLogout = useCallback((user, details = {}) => {
    return auditService.logUserLogout(user, details);
  }, []);

  // Page view audit functions
  const logPageView = useCallback((page, details = {}) => {
    return auditService.logPageView(page, details);
  }, []);

  // Data export audit functions
  const logDataExport = useCallback((resource, count, format = 'CSV', details = {}) => {
    return auditService.logDataExport(resource, count, {
      metadata: { export_format: format },
      ...details
    });
  }, []);

  // Search audit functions
  const logSearch = useCallback((resource, query, results_count, details = {}) => {
    return auditService.log('SEARCH', resource, {
      description: `Searched ${resource.toLowerCase()} with query: "${query}"`,
      category: 'DATA_ACCESS',
      severity: 'LOW',
      metadata: { 
        search_query: query, 
        results_count: results_count 
      },
      ...details
    });
  }, []);

  // Filter audit functions
  const logFilter = useCallback((resource, filters, results_count, details = {}) => {
    return auditService.log('FILTER', resource, {
      description: `Applied filters to ${resource.toLowerCase()}`,
      category: 'DATA_ACCESS',
      severity: 'LOW',
      metadata: { 
        filters: filters, 
        results_count: results_count 
      },
      ...details
    });
  }, []);

  // Error audit functions
  const logError = useCallback((action, resource, error, details = {}) => {
    return auditService.log(action, resource, {
      status: 'ERROR',
      error_message: error.message || error.toString(),
      severity: 'HIGH',
      category: 'SYSTEM',
      description: `Error during ${action} on ${resource}: ${error.message}`,
      ...details
    });
  }, []);

  // Form submission audit functions
  const logFormSubmission = useCallback((formName, data, success = true, details = {}) => {
    return auditService.log('SUBMIT', 'FORM', {
      description: `Submitted form: ${formName}`,
      category: success ? 'DATA_MODIFICATION' : 'SYSTEM',
      severity: success ? 'MEDIUM' : 'HIGH',
      status: success ? 'SUCCESS' : 'ERROR',
      metadata: { 
        form_name: formName,
        form_data_keys: Object.keys(data || {})
      },
      ...details
    });
  }, []);

  // File upload audit functions
  const logFileUpload = useCallback((fileName, fileSize, fileType, success = true, details = {}) => {
    return auditService.log('UPLOAD', 'FILE', {
      description: `${success ? 'Uploaded' : 'Failed to upload'} file: ${fileName}`,
      category: 'DATA_TRANSFER',
      severity: 'MEDIUM',
      status: success ? 'SUCCESS' : 'ERROR',
      metadata: { 
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType
      },
      ...details
    });
  }, []);

  // Permission/Access audit functions
  const logAccessDenied = useCallback((resource, reason, details = {}) => {
    return auditService.log('ACCESS_DENIED', resource, {
      description: `Access denied to ${resource}: ${reason}`,
      category: 'AUTHENTICATION',
      severity: 'HIGH',
      status: 'ERROR',
      metadata: { denial_reason: reason },
      ...details
    });
  }, []);

  // Configuration change audit functions
  const logConfigurationChange = useCallback((setting, oldValue, newValue, details = {}) => {
    return auditService.log('UPDATE', 'CONFIGURATION', {
      description: `Changed configuration setting: ${setting}`,
      category: 'SYSTEM',
      severity: 'HIGH',
      old_values: { [setting]: oldValue },
      new_values: { [setting]: newValue },
      changed_fields: [setting],
      ...details
    });
  }, []);

  // Bulk operation audit functions
  const logBulkOperation = useCallback((operation, resource, count, success_count, details = {}) => {
    return auditService.log(operation.toUpperCase(), resource, {
      description: `Bulk ${operation} on ${resource}: ${success_count}/${count} successful`,
      category: 'DATA_MODIFICATION',
      severity: 'HIGH',
      status: success_count === count ? 'SUCCESS' : 'PARTIAL_SUCCESS',
      metadata: { 
        total_count: count,
        success_count: success_count,
        failure_count: count - success_count
      },
      ...details
    });
  }, []);

  // Get audit logs with filtering
  const getAuditLogs = useCallback((filters = {}, pagination = {}) => {
    return auditService.getAuditLogs(filters, pagination);
  }, []);

  // Get audit statistics
  const getAuditStatistics = useCallback((dateRange = {}) => {
    return auditService.getAuditStatistics(dateRange);
  }, []);

  // Set current user for audit logging
  const setCurrentUser = useCallback((user) => {
    auditService.setCurrentUser(user);
  }, []);

  return {
    // Generic functions
    logAudit,
    setCurrentUser,
    
    // Employee functions
    logEmployeeCreated,
    logEmployeeUpdated,
    logEmployeeDeleted,
    logEmployeeViewed,
    
    // Employment record functions
    logEmploymentRecordCreated,
    logEmploymentRecordUpdated,
    logEmploymentRecordDeleted,
    logEmploymentRecordViewed,
    
    // Authentication functions
    logUserLogin,
    logUserLogout,
    
    // Navigation functions
    logPageView,
    
    // Data operations
    logDataExport,
    logSearch,
    logFilter,
    
    // System functions
    logError,
    logFormSubmission,
    logFileUpload,
    logAccessDenied,
    logConfigurationChange,
    logBulkOperation,
    
    // Query functions
    getAuditLogs,
    getAuditStatistics,
  };
};

export default useAuditLog;
