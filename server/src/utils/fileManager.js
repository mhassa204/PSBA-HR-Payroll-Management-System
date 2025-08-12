const fs = require('fs');
const path = require('path');

class FileManager {
  static getNextOldSuffix(filePath) {
    const dir = path.dirname(filePath);
    const ext = path.extname(filePath);
    const nameWithoutExt = path.basename(filePath, ext);
    
    let counter = 1;
    let newPath;
    
    do {
      newPath = path.join(dir, `${nameWithoutExt}_OLD_${counter}${ext}`);
      counter++;
    } while (fs.existsSync(newPath));
    
    return newPath;
  }

  static async softDeleteFile(filePath) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      
      if (!fs.existsSync(fullPath)) {
        console.warn(`File not found for soft delete: ${fullPath}`);
        return null;
      }

      const newPath = this.getNextOldSuffix(fullPath);
      fs.renameSync(fullPath, newPath);
      
      // Return the new relative path
      const relativePath = path.relative(process.cwd(), newPath);
      console.log(`File soft deleted: ${filePath} -> ${relativePath}`);
      
      return relativePath;
    } catch (error) {
      console.error(`Error soft deleting file ${filePath}:`, error);
      throw error;
    }
  }

  static async restoreFile(oldFilePath, originalPath) {
    try {
      const fullOldPath = path.join(process.cwd(), oldFilePath);
      const fullOriginalPath = path.join(process.cwd(), originalPath);
      
      if (!fs.existsSync(fullOldPath)) {
        throw new Error(`Old file not found: ${fullOldPath}`);
      }

      if (fs.existsSync(fullOriginalPath)) {
        throw new Error(`Original file already exists: ${fullOriginalPath}`);
      }

      fs.renameSync(fullOldPath, fullOriginalPath);
      console.log(`File restored: ${oldFilePath} -> ${originalPath}`);
      
      return true;
    } catch (error) {
      console.error(`Error restoring file:`, error);
      throw error;
    }
  }

  static async cleanupOldFiles(daysOld = 30) {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const files = fs.readdirSync(uploadsDir);
      let deletedCount = 0;

      for (const file of files) {
        if (file.includes('_OLD_')) {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime < cutoffDate) {
            fs.unlinkSync(filePath);
            deletedCount++;
            console.log(`Cleaned up old file: ${file}`);
          }
        }
      }

      console.log(`Cleanup completed. Deleted ${deletedCount} old files.`);
      return deletedCount;
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }
}

module.exports = FileManager;