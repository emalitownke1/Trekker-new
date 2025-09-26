
const postgres = require('postgres');

async function fixDatabase() {
  // Use the same DATABASE_URL from your environment
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log('🔧 Connecting to database to fix missing description column...');
  
  const client = postgres(connectionString, {
    ssl: process.env.DB_SSL === 'disable' ? false : 'prefer',
    max: 1,
    prepare: false,
    connect_timeout: 30
  });

  try {
    // Check if description column exists
    const columnCheck = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'offer_management' 
      AND column_name = 'description'
    `;

    if (columnCheck.length === 0) {
      console.log('🔧 Adding missing description column...');
      await client`ALTER TABLE offer_management ADD COLUMN description TEXT`;
      console.log('✅ Description column added successfully!');
    } else {
      console.log('✅ Description column already exists');
    }

    // Verify the fix by checking the table structure
    const columns = await client`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'offer_management' 
      ORDER BY column_name
    `;
    
    console.log('📋 Current offer_management table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

  } catch (error) {
    console.error('❌ Failed to fix database:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔗 Database connection closed');
  }
}

fixDatabase();
