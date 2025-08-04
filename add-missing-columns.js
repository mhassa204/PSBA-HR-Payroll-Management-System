const { PrismaClient } = require('@prisma/client');

async function addMissingColumns() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Adding missing columns to Employee table...\n');

    // Add missing_note column
    console.log('1. Adding missing_note column...');
    await prisma.$executeRaw`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "missing_note" TEXT`;
    console.log('   ✅ missing_note column added');

    // Add profile_picture column
    console.log('2. Adding profile_picture column...');
    await prisma.$executeRaw`ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "profile_picture" TEXT`;
    console.log('   ✅ profile_picture column added');

    // Verify columns exist
    console.log('3. Verifying columns...');
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Employee' 
      AND column_name IN ('missing_note', 'profile_picture')
    `;
    
    console.log('   📋 Column verification:');
    result.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    console.log('\n🎉 Missing columns added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding columns:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

addMissingColumns();
