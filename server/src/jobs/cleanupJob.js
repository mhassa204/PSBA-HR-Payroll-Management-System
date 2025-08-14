const cron = require('node-cron');
const FileManager = require('../utils/fileManager');
const HardDeleteUtil = require('../utils/hardDeleteUtil');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Run cleanup every Sunday at 2 AM
const scheduleCleanup = () => {
  cron.schedule('0 2 * * 0', async () => {
    console.log('Starting weekly cleanup...');
    
    try {
      // Clean up files older than 30 days
      const deletedFiles = await FileManager.cleanupOldFiles(30);
      
      // Clean up soft-deleted records older than 90 days using hard delete utility
      const cleanupResult = await HardDeleteUtil.cleanupSoftDeletedRecords(90);
      
      if (cleanupResult.success) {
        console.log(`Cleanup completed: ${deletedFiles} files, ${cleanupResult.message}`);
        console.log('Cleanup details:', cleanupResult.results);
      } else {
        console.error('Database cleanup failed:', cleanupResult.message);
      }
    } catch (error) {
      console.error('Cleanup job failed:', error);
    }
  });
};

// Manual cleanup function that can be called from admin routes
const manualCleanup = async (daysOld = 90) => {
  console.log(`Starting manual cleanup for records older than ${daysOld} days...`);
  
  try {
    const cleanupResult = await HardDeleteUtil.cleanupSoftDeletedRecords(daysOld);
    
    if (cleanupResult.success) {
      console.log(`Manual cleanup completed: ${cleanupResult.message}`);
      return cleanupResult;
    } else {
      console.error('Manual cleanup failed:', cleanupResult.message);
      throw new Error(cleanupResult.message);
    }
  } catch (error) {
    console.error('Manual cleanup failed:', error);
    throw error;
  }
};

module.exports = { scheduleCleanup, manualCleanup };