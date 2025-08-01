// Audit Service for tracking all system activities and changes
// This service handles logging, storing, and retrieving audit records

class AuditService {
  constructor() {
    this.auditLogs = this.loadAuditLogs();
    this.currentUser = null; // Will be set when user logs in
  }

  // Load existing audit logs from localStorage
  loadAuditLogs() {
    try {
      const logs = localStorage.getItem('psba_audit_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Error loading audit logs:', error);
      return [];
    }
  }

  // Save audit logs to localStorage
  saveAuditLogs() {
    try {
      localStorage.setItem('psba_audit_logs', JSON.stringify(this.auditLogs));
    } catch (error) {
      console.error('Error saving audit logs:', error);
    }
  }

  // Set current user for audit logging
  setCurrentUser(user) {
    this.currentUser = user;
  }

  // Generate unique audit log ID
  generateAuditId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Main audit logging function
  log(action, resource, details = {}) {
    const auditRecord = {
      id: this.generateAuditId(),
      timestamp: new Date().toISOString(),
      action: action, // CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT, etc.
      resource: resource, // EMPLOYEE, EMPLOYMENT_RECORD, USER, etc.
      resource_id: details.resource_id || null,
      user_id: this.currentUser?.id || 'system',
      user_name: this.currentUser?.full_name || 'System User',
      user_email: this.currentUser?.email || 'system@psba.gov.pk',
      ip_address: this.getClientIP(),
      user_agent: navigator.userAgent,
      session_id: this.getSessionId(),
      
      // Change tracking
      old_values: details.old_values || null,
      new_values: details.new_values || null,
      changed_fields: details.changed_fields || [],
      
      // Additional context
      description: details.description || this.generateDescription(action, resource, details),
      category: details.category || this.categorizeAction(action, resource),
      severity: details.severity || this.determineSeverity(action, resource),
      
      // Request details
      url: window.location.href,
      method: details.method || 'GET',
      
      // Success/Error tracking
      status: details.status || 'SUCCESS',
      error_message: details.error_message || null,
      
      // Metadata
      metadata: details.metadata || {},
    };

    // Add to audit logs
    this.auditLogs.unshift(auditRecord); // Add to beginning for chronological order
    
    // Keep only last 10000 records to prevent storage overflow
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(0, 10000);
    }

    // Save to storage
    this.saveAuditLogs();

    // Console log for development
    console.log('🔍 AUDIT LOG:', auditRecord);

    return auditRecord;
  }

  // Generate human-readable description
  generateDescription(action, resource, details) {
    const resourceName = resource.toLowerCase().replace('_', ' ');
    const userName = this.currentUser?.full_name || 'System';
    
    switch (action) {
      case 'CREATE':
        return `${userName} created a new ${resourceName}`;
      case 'UPDATE':
        return `${userName} updated ${resourceName} ${details.resource_id || ''}`;
      case 'DELETE':
        return `${userName} deleted ${resourceName} ${details.resource_id || ''}`;
      case 'VIEW':
        return `${userName} viewed ${resourceName} ${details.resource_id || ''}`;
      case 'LOGIN':
        return `${userName} logged into the system`;
      case 'LOGOUT':
        return `${userName} logged out of the system`;
      case 'EXPORT':
        return `${userName} exported ${resourceName} data`;
      case 'IMPORT':
        return `${userName} imported ${resourceName} data`;
      default:
        return `${userName} performed ${action} on ${resourceName}`;
    }
  }

  // Categorize actions for filtering
  categorizeAction(action, resource) {
    if (['LOGIN', 'LOGOUT'].includes(action)) return 'AUTHENTICATION';
    if (['CREATE', 'UPDATE', 'DELETE'].includes(action)) return 'DATA_MODIFICATION';
    if (['VIEW', 'SEARCH', 'FILTER'].includes(action)) return 'DATA_ACCESS';
    if (['EXPORT', 'IMPORT'].includes(action)) return 'DATA_TRANSFER';
    return 'SYSTEM';
  }

  // Determine severity level
  determineSeverity(action, resource) {
    if (['DELETE'].includes(action)) return 'HIGH';
    if (['CREATE', 'UPDATE', 'LOGIN'].includes(action)) return 'MEDIUM';
    if (['VIEW', 'SEARCH'].includes(action)) return 'LOW';
    return 'LOW';
  }

  // Get client IP (simplified for demo)
  getClientIP() {
    // In a real application, this would be handled by the backend
    return 'localhost';
  }

  // Get session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('psba_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('psba_session_id', sessionId);
    }
    return sessionId;
  }

  // Specific logging methods for common actions
  logEmployeeCreated(employee, details = {}) {
    return this.log('CREATE', 'EMPLOYEE', {
      resource_id: employee.id,
      new_values: employee,
      description: `Created new employee: ${employee.full_name}`,
      ...details
    });
  }

  logEmployeeUpdated(employeeId, oldValues, newValues, details = {}) {
    const changedFields = this.getChangedFields(oldValues, newValues);
    return this.log('UPDATE', 'EMPLOYEE', {
      resource_id: employeeId,
      old_values: oldValues,
      new_values: newValues,
      changed_fields: changedFields,
      description: `Updated employee ${employeeId}. Changed fields: ${changedFields.join(', ')}`,
      ...details
    });
  }

  logEmployeeDeleted(employee, details = {}) {
    return this.log('DELETE', 'EMPLOYEE', {
      resource_id: employee.id,
      old_values: employee,
      description: `Deleted employee: ${employee.full_name}`,
      severity: 'HIGH',
      ...details
    });
  }

  logEmploymentRecordCreated(record, details = {}) {
    return this.log('CREATE', 'EMPLOYMENT_RECORD', {
      resource_id: record.id,
      new_values: record,
      description: `Created employment record for employee ${record.user_id}`,
      ...details
    });
  }

  logEmploymentRecordUpdated(recordId, oldValues, newValues, details = {}) {
    const changedFields = this.getChangedFields(oldValues, newValues);
    return this.log('UPDATE', 'EMPLOYMENT_RECORD', {
      resource_id: recordId,
      old_values: oldValues,
      new_values: newValues,
      changed_fields: changedFields,
      description: `Updated employment record ${recordId}. Changed fields: ${changedFields.join(', ')}`,
      ...details
    });
  }

  logEmploymentRecordDeleted(record, details = {}) {
    return this.log('DELETE', 'EMPLOYMENT_RECORD', {
      resource_id: record.id,
      old_values: record,
      description: `Deleted employment record for employee ${record.user_id}`,
      severity: 'HIGH',
      ...details
    });
  }

  logUserLogin(user, details = {}) {
    return this.log('LOGIN', 'USER', {
      resource_id: user.id,
      description: `User ${user.full_name} logged in`,
      category: 'AUTHENTICATION',
      ...details
    });
  }

  logUserLogout(user, details = {}) {
    return this.log('LOGOUT', 'USER', {
      resource_id: user.id,
      description: `User ${user.full_name} logged out`,
      category: 'AUTHENTICATION',
      ...details
    });
  }

  logDataExport(resource, count, details = {}) {
    return this.log('EXPORT', resource, {
      description: `Exported ${count} ${resource.toLowerCase()} records`,
      metadata: { export_count: count },
      ...details
    });
  }

  logPageView(page, details = {}) {
    return this.log('VIEW', 'PAGE', {
      description: `Viewed page: ${page}`,
      category: 'DATA_ACCESS',
      severity: 'LOW',
      metadata: { page_name: page },
      ...details
    });
  }

  // Utility function to get changed fields
  getChangedFields(oldValues, newValues) {
    const changedFields = [];
    
    if (!oldValues || !newValues) return changedFields;
    
    Object.keys(newValues).forEach(key => {
      if (oldValues[key] !== newValues[key]) {
        changedFields.push(key);
      }
    });
    
    return changedFields;
  }

  // Get audit logs with filtering and pagination
  getAuditLogs(filters = {}, pagination = {}) {
    let filteredLogs = [...this.auditLogs];

    // Apply filters
    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action);
    }
    
    if (filters.resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === filters.resource);
    }
    
    if (filters.user_id) {
      filteredLogs = filteredLogs.filter(log => log.user_id === filters.user_id);
    }
    
    if (filters.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === filters.severity);
    }
    
    if (filters.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filters.category);
    }
    
    if (filters.date_from) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(filters.date_from));
    }
    
    if (filters.date_to) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(filters.date_to));
    }

    // Apply pagination
    const page = pagination.page || 1;
    const limit = pagination.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      logs: filteredLogs.slice(startIndex, endIndex),
      total: filteredLogs.length,
      page,
      limit,
      totalPages: Math.ceil(filteredLogs.length / limit)
    };
  }

  // Get audit statistics
  getAuditStatistics(dateRange = {}) {
    let logs = [...this.auditLogs];
    
    // Filter by date range if provided
    if (dateRange.from) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(dateRange.from));
    }
    if (dateRange.to) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(dateRange.to));
    }

    const stats = {
      total_logs: logs.length,
      actions: {},
      resources: {},
      users: {},
      categories: {},
      severity: {},
      status: {},
      recent_activity: logs.slice(0, 10)
    };

    logs.forEach(log => {
      // Count by action
      stats.actions[log.action] = (stats.actions[log.action] || 0) + 1;
      
      // Count by resource
      stats.resources[log.resource] = (stats.resources[log.resource] || 0) + 1;
      
      // Count by user
      stats.users[log.user_name] = (stats.users[log.user_name] || 0) + 1;
      
      // Count by category
      stats.categories[log.category] = (stats.categories[log.category] || 0) + 1;
      
      // Count by severity
      stats.severity[log.severity] = (stats.severity[log.severity] || 0) + 1;
      
      // Count by status
      stats.status[log.status] = (stats.status[log.status] || 0) + 1;
    });

    return stats;
  }

  // Clear old audit logs (for maintenance)
  clearOldLogs(daysToKeep = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const originalCount = this.auditLogs.length;
    this.auditLogs = this.auditLogs.filter(log => new Date(log.timestamp) >= cutoffDate);
    const removedCount = originalCount - this.auditLogs.length;
    
    this.saveAuditLogs();
    
    console.log(`🧹 Audit cleanup: Removed ${removedCount} old logs, kept ${this.auditLogs.length} logs`);
    
    return { removed: removedCount, remaining: this.auditLogs.length };
  }
}

// Create singleton instance
const auditService = new AuditService();

export default auditService;
