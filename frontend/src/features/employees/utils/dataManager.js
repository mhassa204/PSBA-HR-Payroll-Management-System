/**
 * Data Manager Utility
 * 
 * Centralized data management for employment records with support for:
 * - Local storage persistence
 * - API integration readiness
 * - Data synchronization
 * - Offline/online mode switching
 * 
 * @author PSBA HR Portal Team
 * @version 1.0.0
 */

class DataManager {
  constructor() {
    this.storagePrefix = 'psba_hr_';
    this.isOnline = navigator.onLine;
    this.syncQueue = [];
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Save employment record with full data structure
   * @param {Object} employmentData - Complete employment record
   * @returns {Promise<Object>} Saved record with ID
   */
  async saveEmploymentRecord(employmentData) {
    try {
      const record = {
        id: employmentData.id || this.generateId(),
        ...employmentData,
        created_at: employmentData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        synced: false, // Mark as not synced with server
      };

      // Save to localStorage
      this.saveToStorage('employment_records', record);
      
      // Add to sync queue if online
      if (this.isOnline) {
        this.addToSyncQueue('employment', 'create', record);
      }


      return record;
    } catch (error) {
      console.error('❌ Error saving employment record:', error);
      throw error;
    }
  }

  /**
   * Get all employment records for a user
   * @param {string} userId - User ID
   * @returns {Array} Employment records
   */
  getEmploymentRecords(userId) {
    try {
      const records = this.loadFromStorage('employment_records');
      return records.filter(record => record.user_id === userId);
    } catch (error) {
      console.error('❌ Error loading employment records:', error);
      return [];
    }
  }

  /**
   * Update employment record
   * @param {string} recordId - Record ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated record
   */
  async updateEmploymentRecord(recordId, updateData) {
    try {
      const records = this.loadFromStorage('employment_records');
      const recordIndex = records.findIndex(r => r.id === recordId);
      
      if (recordIndex === -1) {
        throw new Error('Employment record not found');
      }

      const updatedRecord = {
        ...records[recordIndex],
        ...updateData,
        updated_at: new Date().toISOString(),
        synced: false,
      };

      records[recordIndex] = updatedRecord;
      this.saveArrayToStorage('employment_records', records);

      // Add to sync queue if online
      if (this.isOnline) {
        this.addToSyncQueue('employment', 'update', updatedRecord);
      }


      return updatedRecord;
    } catch (error) {
      console.error('❌ Error updating employment record:', error);
      throw error;
    }
  }

  /**
   * Delete employment record
   * @param {string} recordId - Record ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteEmploymentRecord(recordId) {
    try {
      const records = this.loadFromStorage('employment_records');
      const filteredRecords = records.filter(r => r.id !== recordId);
      
      this.saveArrayToStorage('employment_records', filteredRecords);

      // Add to sync queue if online
      if (this.isOnline) {
        this.addToSyncQueue('employment', 'delete', { id: recordId });
      }


      return true;
    } catch (error) {
      console.error('❌ Error deleting employment record:', error);
      throw error;
    }
  }

  /**
   * Save data to localStorage with error handling
   * @param {string} key - Storage key
   * @param {Object} data - Data to save
   */
  saveToStorage(key, data) {
    try {
      const fullKey = this.storagePrefix + key;
      const existingData = this.loadFromStorage(key);
      
      // Check if record already exists
      const existingIndex = existingData.findIndex(item => item.id === data.id);
      
      if (existingIndex >= 0) {
        // Update existing record
        existingData[existingIndex] = data;
      } else {
        // Add new record
        existingData.push(data);
      }
      
      localStorage.setItem(fullKey, JSON.stringify(existingData));

    } catch (error) {
      console.error(`❌ Error saving to storage:`, error);
      throw new Error('Failed to save data to local storage');
    }
  }

  /**
   * Load data from localStorage
   * @param {string} key - Storage key
   * @returns {Array} Data array
   */
  loadFromStorage(key) {
    try {
      const fullKey = this.storagePrefix + key;
      const data = localStorage.getItem(fullKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`❌ Error loading from storage:`, error);
      return [];
    }
  }

  /**
   * Save array to localStorage
   * @param {string} key - Storage key
   * @param {Array} dataArray - Data array to save
   */
  saveArrayToStorage(key, dataArray) {
    try {
      const fullKey = this.storagePrefix + key;
      localStorage.setItem(fullKey, JSON.stringify(dataArray));

    } catch (error) {
      console.error(`❌ Error saving array to storage:`, error);
      throw new Error('Failed to save data array to local storage');
    }
  }

  /**
   * Generate unique ID
   * @returns {string} Unique ID
   */
  generateId() {
    return `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add operation to sync queue
   * @param {string} type - Data type (employment, salary, etc.)
   * @param {string} operation - Operation type (create, update, delete)
   * @param {Object} data - Data to sync
   */
  addToSyncQueue(type, operation, data) {
    this.syncQueue.push({
      id: this.generateId(),
      type,
      operation,
      data,
      timestamp: new Date().toISOString(),
    });
    
    
  }

  /**
   * Process sync queue when online
   */
  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    
    
    // TODO: Implement actual API sync when backend is ready
    // For now, just mark items as processed
    this.syncQueue = [];
    
  }

  /**
   * Clear all local data
   * @param {string} type - Data type to clear (optional)
   */
  clearLocalData(type = null) {
    try {
      if (type) {
        const fullKey = this.storagePrefix + type;
        localStorage.removeItem(fullKey);
  
      } else {
        // Clear all employment-related data
        const keys = ['employment_records', 'salary_records', 'location_records', 'contract_records'];
        keys.forEach(key => {
          const fullKey = this.storagePrefix + key;
          localStorage.removeItem(fullKey);
        });
  
      }
    } catch (error) {
      console.error('❌ Error clearing local data:', error);
    }
  }

  /**
   * Get sync status
   * @returns {Object} Sync status information
   */
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
      lastSync: localStorage.getItem(this.storagePrefix + 'last_sync'),
    };
  }

  /**
   * Export data for backup
   * @returns {Object} All local data
   */
  exportData() {
    const keys = ['employment_records', 'salary_records', 'location_records', 'contract_records'];
    const exportData = {};
    
    keys.forEach(key => {
      exportData[key] = this.loadFromStorage(key);
    });
    
    return {
      ...exportData,
      exportDate: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  /**
   * Import data from backup
   * @param {Object} importData - Data to import
   */
  importData(importData) {
    try {
      const keys = ['employment_records', 'salary_records', 'location_records', 'contract_records'];
      
      keys.forEach(key => {
        if (importData[key]) {
          this.saveArrayToStorage(key, importData[key]);
        }
      });
      

    } catch (error) {
      console.error('❌ Error importing data:', error);
      throw new Error('Failed to import data');
    }
  }
}

// Export singleton instance
export const dataManager = new DataManager();

// Export class for testing
export { DataManager };

// Export default
export default dataManager;
