const cron = require('node-cron');
const FileManager = require('../utils/fileManager');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Run cleanup every Sunday at 2 AM
const scheduleCleanup = () => {
  cron.schedule('0 2 * * 0', async () => {
    console.log('Starting weekly file cleanup...');
    
    try {
      // Clean up files older than 30 days
      const deletedFiles = await FileManager.cleanupOldFiles(30);
      
      // Also clean up database records for very old removed documents (90 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      
      const deletedRecords = await prisma.employeeDocument.deleteMany({
        where: {
          status: 'removed',
          removed_at: {
            lt: cutoffDate
          }
        }
      });

      console.log(`Cleanup completed: ${deletedFiles} files, ${deletedRecords.count} database records`);
    } catch (error) {
      console.error('Cleanup job failed:', error);
    }
  });
};

module.exports = { scheduleCleanup };