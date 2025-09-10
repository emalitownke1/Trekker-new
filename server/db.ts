import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";
import { migrate } from 'drizzle-orm/postgres-js/migrator';

// Database configuration from environment variables
const dbConfig = {
  url: process.env.DATABASE_URL,
  host: process.env.PGHOST || process.env.DB_HOST,
  port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432'),
  database: process.env.PGDATABASE || process.env.DB_NAME,
  username: process.env.PGUSER || process.env.DB_USER,
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD,
};

// Determine database URL from available environment variables
let connectionString: string;

if (dbConfig.url) {
  connectionString = dbConfig.url;
} else if (dbConfig.host && dbConfig.database && dbConfig.username && dbConfig.password) {
  connectionString = `postgresql://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
} else {
  throw new Error(
    "Database connection not configured. Please set either DATABASE_URL or individual database environment variables (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD)"
  );
}

// Configure SSL based on environment
const sslConfig = process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false };

// Use the standard postgres driver with flexible SSL handling
const client = postgres(connectionString, {
  ssl: sslConfig,
  max: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  prepare: false
});

export const db = drizzle(client, { schema });

// Get server name from runtime environment, SERVER_NAME environment variable, or default
export function getServerName(): string {
  return process.env.RUNTIME_SERVER_NAME || process.env.SERVER_NAME || 'default-server';
}

// Get server name with database fallback (async version)
export async function getServerNameWithFallback(): Promise<string> {
  // First try runtime environment variable (highest priority for tenant switching)
  if (process.env.RUNTIME_SERVER_NAME) {
    return process.env.RUNTIME_SERVER_NAME;
  }
  
  // Then try static environment variable
  if (process.env.SERVER_NAME) {
    return process.env.SERVER_NAME;
  }
  
  // Then try database
  try {
    const { storage } = await import('./storage');
    const servers = await storage.getAllServers();
    if (servers.length > 0) {
      // Return the first server's name if any exists
      return servers[0].serverName;
    }
  } catch (error) {
    console.warn('Failed to get server name from database:', error);
  }
  
  // Finally fallback to default
  return 'default-server';
}

// Function to initialize database (create tables if they don't exist)
export async function initializeDatabase() {
  try {
    console.log('🔄 Checking database connectivity...');
    
    // Get server name for this instance
    const serverName = getServerName();
    console.log(`🏷️ Server instance: ${serverName}`);
    
    // Test database connection
    await client`SELECT 1`;
    console.log('✅ Database connection established');

    // Check if tables exist by checking the information schema first
    try {
      const tableExists = await client`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'bot_instances'
        )
      `;
      
      if (tableExists[0].exists) {
        console.log('✅ Bot instances table exists, checking schema...');
        
        // Check if required columns exist
        const columnsExist = await client`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'bot_instances' 
          AND column_name IN ('approval_status', 'is_guest', 'approval_date', 'expiration_months', 'server_name')
        `;
        
        if (columnsExist.length >= 5) {
          console.log('✅ Database schema is up to date');
          
          // Try querying to verify everything works
          try {
            await db.query.botInstances.findFirst();
            console.log('✅ Database tables functional');
            
            // Check for expired bots on startup
            const { storage } = await import('./storage');
            await storage.checkAndExpireBots();
            
            // Initialize server registry for multi-tenancy
            await storage.initializeCurrentServer();
            return;
          } catch (queryError: any) {
            console.log('⚠️ Database query failed, will recreate schema:', queryError.message);
          }
        } else {
          console.log('⚠️ Database schema is outdated, missing columns');
        }
      } else {
        console.log('⚠️ Bot instances table does not exist');
      }
      
      // If we reach here, we need to create or update the schema
      console.log('⚠️ Database tables missing or schema outdated, creating/updating them...');
    } catch (error: any) {
      console.log('⚠️ Database schema check failed, will create/update tables:', error.message);
    }
    
    // Create or update tables
    try {
      // Create tables manually using raw SQL with proper schema
      await client`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            server_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        
        await client`
          CREATE TABLE IF NOT EXISTS bot_instances (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            phone_number TEXT,
            status TEXT NOT NULL DEFAULT 'offline',
            credentials JSONB,
            settings JSONB DEFAULT '{}',
            auto_like BOOLEAN DEFAULT false,
            auto_view_status BOOLEAN DEFAULT false,
            auto_react BOOLEAN DEFAULT false,
            typing_mode TEXT DEFAULT 'none',
            chatgpt_enabled BOOLEAN DEFAULT false,
            last_activity TIMESTAMP,
            messages_count INTEGER DEFAULT 0,
            commands_count INTEGER DEFAULT 0,
            approval_status TEXT DEFAULT 'pending',
            is_guest BOOLEAN DEFAULT false,
            approval_date TEXT,
            expiration_months INTEGER,
            server_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        
        await client`
          CREATE TABLE IF NOT EXISTS commands (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            response TEXT,
            is_active BOOLEAN DEFAULT true,
            use_chatgpt BOOLEAN DEFAULT false,
            bot_instance_id VARCHAR,
            server_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        
        await client`
          CREATE TABLE IF NOT EXISTS activities (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            bot_instance_id VARCHAR NOT NULL,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            metadata JSONB DEFAULT '{}',
            server_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        
        await client`
          CREATE TABLE IF NOT EXISTS groups (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            whatsapp_id TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            description TEXT,
            participant_count INTEGER DEFAULT 0,
            bot_instance_id VARCHAR NOT NULL,
            is_active BOOLEAN DEFAULT true,
            server_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        
        await client`
          CREATE TABLE IF NOT EXISTS god_register (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            phone_number TEXT NOT NULL UNIQUE,
            tenancy_name TEXT NOT NULL,
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        
        await client`
          CREATE TABLE IF NOT EXISTS server_registry (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            server_name TEXT NOT NULL UNIQUE,
            max_bot_count INTEGER NOT NULL,
            current_bot_count INTEGER DEFAULT 0,
            server_status TEXT DEFAULT 'active',
            server_url TEXT,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;

        // Handle existing tables that might be missing columns
        try {
          // Update bot_instances table
          await client`ALTER TABLE bot_instances ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending'`;
          await client`ALTER TABLE bot_instances ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false`;
          await client`ALTER TABLE bot_instances ADD COLUMN IF NOT EXISTS approval_date TEXT`;
          await client`ALTER TABLE bot_instances ADD COLUMN IF NOT EXISTS expiration_months INTEGER`;
          await client`ALTER TABLE bot_instances ADD COLUMN IF NOT EXISTS server_name TEXT`;
          
          // Update existing rows without server_name to use current server
          await client`UPDATE bot_instances SET server_name = ${serverName} WHERE server_name IS NULL`;
          
          // Make server_name NOT NULL after setting values
          await client`ALTER TABLE bot_instances ALTER COLUMN server_name SET NOT NULL`;
          
          // Update other tables with server_name column
          await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS server_name TEXT`;
          await client`UPDATE users SET server_name = ${serverName} WHERE server_name IS NULL`;
          await client`ALTER TABLE users ALTER COLUMN server_name SET NOT NULL`;
          
          await client`ALTER TABLE commands ADD COLUMN IF NOT EXISTS server_name TEXT`;
          await client`UPDATE commands SET server_name = ${serverName} WHERE server_name IS NULL`;
          await client`ALTER TABLE commands ALTER COLUMN server_name SET NOT NULL`;
          
          await client`ALTER TABLE activities ADD COLUMN IF NOT EXISTS server_name TEXT`;
          await client`UPDATE activities SET server_name = ${serverName} WHERE server_name IS NULL`;
          await client`ALTER TABLE activities ALTER COLUMN server_name SET NOT NULL`;
          
          await client`ALTER TABLE groups ADD COLUMN IF NOT EXISTS server_name TEXT`;
          await client`UPDATE groups SET server_name = ${serverName} WHERE server_name IS NULL`;
          await client`ALTER TABLE groups ALTER COLUMN server_name SET NOT NULL`;
          
          console.log('✅ Database schema updated with missing columns');
        } catch (alterError: any) {
          console.log('ℹ️ Some schema updates may have already been applied:', alterError.message);
        }
        
      console.log('✅ Database tables created/updated successfully');
      
      // Initialize server registry for multi-tenancy after tables are created
      const { storage } = await import('./storage');
      await storage.checkAndExpireBots();
      await storage.initializeCurrentServer();
      
    } catch (createError: any) {
      console.error('❌ Failed to create/update database tables:', createError);
      throw createError;
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}