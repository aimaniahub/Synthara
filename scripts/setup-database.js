#!/usr/bin/env node

/**
 * Database Setup Script for Synthara AI
 * This script helps verify and set up the Supabase database
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Synthara AI Database Setup Helper\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found!');
  console.log('📝 Please create .env.local with your Supabase credentials:');
  console.log(`
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
GOOGLE_GEMINI_API_KEY=your_gemini_key_here
SERPAPI_KEY=your_serpapi_key_here
  `);
  process.exit(1);
}

// Read and validate environment variables
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

console.log('✅ Environment file found');

// Check required environment variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'GOOGLE_GEMINI_API_KEY',
  'SERPAPI_KEY'
];

const missingVars = requiredVars.filter(varName => 
  !envVars[varName] || 
  envVars[varName].includes('your_') || 
  envVars[varName].includes('YOUR_')
);

if (missingVars.length > 0) {
  console.log('❌ Missing or incomplete environment variables:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  console.log('\n📝 Please update your .env.local file with actual values');
  process.exit(1);
}

console.log('✅ All required environment variables are set');

// Check if schema files exist
const schemaFiles = [
  'supabase-schema.sql',
  'supabase-complete-schema.sql'
];

const existingSchemas = schemaFiles.filter(file => 
  fs.existsSync(path.join(process.cwd(), file))
);

if (existingSchemas.length === 0) {
  console.log('❌ No schema files found!');
  console.log('📝 Please ensure supabase-schema.sql exists in your project root');
  process.exit(1);
}

console.log('✅ Schema files found:', existingSchemas.join(', '));

// Display next steps
console.log('\n🎯 Next Steps:');
console.log('1. Go to your Supabase dashboard');
console.log('2. Navigate to SQL Editor');
console.log('3. Copy and paste the contents of supabase-complete-schema.sql');
console.log('4. Click "Run" to execute the schema');
console.log('5. Start your development server: npm run dev');
console.log('6. Test the application at http://localhost:3000');

console.log('\n📚 For detailed instructions, see SUPABASE_SETUP_GUIDE.md');

// Check if the app is running
console.log('\n🔍 Checking if the app is running...');
const { exec } = require('child_process');

exec('netstat -an | findstr :3000', (error, stdout) => {
  if (stdout.includes('3000')) {
    console.log('✅ Development server appears to be running on port 3000');
    console.log('🌐 You can test your setup at http://localhost:3000');
  } else {
    console.log('ℹ️  Development server not running. Start it with: npm run dev');
  }
});

console.log('\n✨ Setup helper completed!');
