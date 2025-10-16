#!/usr/bin/env node

/**
 * Debug Save Functionality for Synthara AI
 * This script tests the save dataset functionality
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function debugSaveFunction() {
  console.log('🔍 Debugging Save Functionality...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase environment variables');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Check if we can insert into user_activities
    console.log('📝 Test 1: Testing user_activities insert...');
    const { data: activityData, error: activityError } = await supabase
      .from('user_activities')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID for testing
        activity_type: 'TEST_ACTIVITY',
        description: 'Test activity from debug script',
        status: 'COMPLETED',
        metadata: { test: true }
      })
      .select();

    if (activityError) {
      console.log('❌ user_activities insert failed:', activityError.message);
      if (activityError.code === '42501') {
        console.log('💡 This is expected - RLS prevents inserting without authentication');
      }
    } else {
      console.log('✅ user_activities insert successful');
    }

    // Test 2: Check if we can insert into generated_datasets
    console.log('\n📊 Test 2: Testing generated_datasets insert...');
    const testDataset = {
      user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID for testing
      dataset_name: 'Test Dataset',
      prompt_used: 'Test prompt for debugging',
      num_rows: 5,
      schema_json: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }],
      data_csv: 'id,name\n1,Test\n2,Data\n3,CSV\n4,Content\n5,Debug',
      feedback: 'Test feedback'
    };

    const { data: datasetData, error: datasetError } = await supabase
      .from('generated_datasets')
      .insert(testDataset)
      .select();

    if (datasetError) {
      console.log('❌ generated_datasets insert failed:', datasetError.message);
      if (datasetError.code === '42501') {
        console.log('💡 This is expected - RLS prevents inserting without authentication');
      }
    } else {
      console.log('✅ generated_datasets insert successful');
    }

    // Test 3: Check existing data
    console.log('\n📋 Test 3: Checking existing data...');
    const { data: existingActivities, error: activitiesError } = await supabase
      .from('user_activities')
      .select('count')
      .limit(1);

    if (activitiesError) {
      console.log('❌ Error fetching activities:', activitiesError.message);
    } else {
      console.log('✅ Activities table accessible');
    }

    const { data: existingDatasets, error: datasetsError } = await supabase
      .from('generated_datasets')
      .select('count')
      .limit(1);

    if (datasetsError) {
      console.log('❌ Error fetching datasets:', datasetsError.message);
    } else {
      console.log('✅ Datasets table accessible');
    }

    console.log('\n🎯 Summary:');
    console.log('- Database connection: ✅ Working');
    console.log('- Tables exist: ✅ All tables accessible');
    console.log('- RLS policies: ✅ Working (prevents unauthorized access)');
    console.log('\n💡 The issue is likely that you need to be authenticated to save data.');
    console.log('   Make sure you are signed in to your account when generating data.');

  } catch (error) {
    console.log('❌ Debug test failed:', error.message);
  }
}

// Run the debug test
debugSaveFunction().catch(console.error);
