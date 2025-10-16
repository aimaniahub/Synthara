#!/usr/bin/env node

/**
 * Database Connection Test for Synthara AI
 * This script tests the Supabase connection and database setup
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testDatabaseConnection() {
  console.log('🧪 Testing Supabase Database Connection...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase environment variables');
    console.log('Please check your .env.local file');
    return;
  }

  if (supabaseUrl.includes('your-project-id') || supabaseKey.includes('your-anon-key')) {
    console.log('❌ Supabase credentials not configured');
    console.log('Please update your .env.local file with actual values');
    return;
  }

  console.log('✅ Environment variables loaded');

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test basic connection
    console.log('🔌 Testing basic connection...');
    const { data, error } = await supabase.from('user_activities').select('count').limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ Database tables not found');
        console.log('Please run the schema setup in your Supabase SQL Editor');
        console.log('Use the contents of supabase-complete-schema.sql');
        return;
      }
      throw error;
    }

    console.log('✅ Basic connection successful');

    // Test table existence
    console.log('📋 Checking table existence...');
    
    const tables = [
      'user_activities',
      'generated_datasets',
      'user_profiles',
      'file_storage'
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('count').limit(1);
        if (error) {
          console.log(`❌ Table '${table}' not found or not accessible`);
        } else {
          console.log(`✅ Table '${table}' exists and is accessible`);
        }
      } catch (err) {
        console.log(`❌ Error checking table '${table}':`, err.message);
      }
    }

    // Test authentication
    console.log('\n🔐 Testing authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('ℹ️  No authenticated user (this is normal for testing)');
    } else if (user) {
      console.log('✅ User is authenticated:', user.email);
    } else {
      console.log('ℹ️  No user session (sign in to test user-specific features)');
    }

    console.log('\n🎉 Database connection test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. If any tables are missing, run the update script:');
    console.log('   - Copy contents of scripts/update-database.sql');
    console.log('   - Paste in Supabase SQL Editor and run');
    console.log('2. Start your development server: npm run dev');
    console.log('3. Sign up for an account at http://localhost:3000/auth');
    console.log('4. Generate some data and test saving to database');
    console.log('5. Check the history page to see saved activities');

  } catch (error) {
    console.log('❌ Database connection failed:');
    console.log('Error:', error.message);
    
    if (error.message.includes('Invalid API key')) {
      console.log('\n💡 Possible solutions:');
      console.log('- Check your NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
      console.log('- Make sure you copied the correct anon key from Supabase dashboard');
    } else if (error.message.includes('Failed to fetch')) {
      console.log('\n💡 Possible solutions:');
      console.log('- Check your NEXT_PUBLIC_SUPABASE_URL in .env.local');
      console.log('- Make sure your Supabase project is active');
      console.log('- Check your internet connection');
    }
  }
}

// Run the test
testDatabaseConnection().catch(console.error);
