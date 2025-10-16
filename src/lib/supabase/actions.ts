// src/lib/supabase/actions.ts
'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type User } from '@supabase/supabase-js';
// Generic types for data generation results
interface GenerationResult {
  generatedRows?: Array<Record<string, any>>;
  generatedCsv?: string;
  detectedSchema?: Array<{ name: string; type: string; description?: string }>;
  data?: Array<Record<string, any>>;
  csv?: string;
  schema?: Array<{ name: string; type: string; description?: string }>;
  feedback?: string;
  error?: string;
}
import type { EnhancePromptOutput } from '@/ai/flows/enhance-prompt-flow';

// Helper to get Supabase client and authenticated user
async function getSupabaseUserClient() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    console.error('Error fetching user:', userError.message);
    throw new Error(`Authentication error: ${userError.message}`);
  }
  
  if (!user) {
    console.error('User not authenticated');
    throw new Error('User not authenticated');
  }
  return { supabase, user };
}

export interface ActivityLog {
  id: string;
  created_at: string;
  activity_type: string;
  description: string;
  details?: Record<string, any>;
  status: string;
  user_id: string;
  related_resource_id?: string | null;
}

export interface SavedDataset {
  id: string;
  created_at: string;
  dataset_name: string;
  prompt_used: string;
  num_rows: number;
  schema_json: Record<string, any>; // Adjust if schema is more specific
  feedback?: string | null;
  user_id: string;
  // data_csv is not typically fetched in list views to save bandwidth
}


// --- User Activity Logging ---
type ActivityType = "DATA_GENERATION" | "PROMPT_ENHANCEMENT" | "DATA_ANALYSIS_SNIPPET" | "DATASET_SAVED";

interface LogActivityInput {
  activityType: ActivityType;
  description: string;
  details?: Record<string, any>;
  status?: string;
  relatedResourceId?: string;
}

export async function logActivity(input: LogActivityInput): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await getSupabaseUserClient();
    const { activityType, description, details, status = "COMPLETED", relatedResourceId } = input;

    console.log('[LogActivity] Starting activity log for user:', user?.id, 'Activity:', activityType);

    const { error } = await supabase.from('user_activities').insert({
      user_id: user.id,
      activity_type: activityType,
      description,
      metadata: details, // Map details to metadata column
      status,
      related_resource_id: relatedResourceId,
    });

    if (error) {
      // Handle table not found error gracefully
      if (error.code === 'PGRST116' || error.message.includes('relation "public.user_activities" does not exist')) {
        console.warn('User activities table not found. Activity logging disabled.');
        return { success: false, error: 'Activity logging not available' };
      }
      throw error;
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error logging activity:', err.message);
    return { success: false, error: err.message };
  }
}

// --- Dataset Storage ---
interface SaveDatasetInput {
  datasetName: string;
  generationResult: GenerationResult;
  prompt: string;
  numRows: number;
}

export async function saveDataset(
  input: SaveDatasetInput
): Promise<{ success: boolean; datasetId?: string; error?: string }> {
  try {
    const { supabase, user } = await getSupabaseUserClient();
    const { datasetName, generationResult, prompt, numRows } = input;

    console.log('[SaveDataset] Starting save process for user:', user?.id);

    // Detailed validation logging
    console.log('[SaveDataset] Validation check:', {
      hasGenerationResult: !!generationResult,
      hasGeneratedCsv: !!generationResult?.generatedCsv,
      hasDetectedSchema: !!generationResult?.detectedSchema,
      hasGeneratedRows: !!generationResult?.generatedRows,
      csvLength: generationResult?.generatedCsv?.length || 0,
      schemaLength: generationResult?.detectedSchema?.length || 0,
      rowsLength: generationResult?.generatedRows?.length || 0,
      generationResultKeys: generationResult ? Object.keys(generationResult) : [],
    });

    // Handle both old and new format
    const csv = generationResult.generatedCsv || generationResult.csv;
    const schema = generationResult.detectedSchema || generationResult.schema;
    
    if (!csv || !schema) {
      const missingFields = [];
      if (!csv) missingFields.push('csv/generatedCsv');
      if (!schema) missingFields.push('schema/detectedSchema');

      const errorMsg = `Cannot save dataset: Missing required fields: ${missingFields.join(', ')}. Available fields: ${Object.keys(generationResult || {}).join(', ')}`;
      console.error('[SaveDataset] Validation failed:', errorMsg);
      throw new Error(errorMsg);
    }
    
    const { data, error } = await supabase
      .from('generated_datasets')
      .insert({
        user_id: user.id,
        dataset_name: datasetName,
        prompt_used: prompt,
        num_rows: numRows,
        schema_json: schema,
        data_csv: csv,
        feedback: generationResult.feedback,
      })
      .select('id')
      .single();

    if (error) {
      // Handle table not found error gracefully
      if (error.code === 'PGRST116' || error.message.includes('relation "public.generated_datasets" does not exist')) {
        console.warn('Generated datasets table not found. Please run the database schema setup.');
        return { success: false, error: 'Database tables not set up. Please contact support.' };
      }
      throw error;
    }
    if (!data || !data.id) throw new Error("Failed to get dataset ID after insert.");

    // Log the save activity
    await logActivity({
      activityType: 'DATASET_SAVED',
      description: `Saved dataset: "${datasetName}"`,
      details: { datasetName, numRows, schemaColumns: generationResult.detectedSchema?.length || 0 },
      relatedResourceId: data.id,
    });
    
    return { success: true, datasetId: data.id };
  } catch (err: any) {
    console.error('Error saving dataset:', err.message);
    return { success: false, error: err.message };
  }
}


// --- Data Fetching ---
export async function getUserActivities(limit = 20): Promise<ActivityLog[]> {
  try {
    const { supabase, user } = await getSupabaseUserClient();
    const { data, error } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Handle table not found error gracefully
      if (error.code === 'PGRST116' || error.message.includes('relation "public.user_activities" does not exist')) {
        console.warn('User activities table not found. Please run the database schema setup.');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (err: any) {
    console.error('Error fetching user activities:', err.message);
    return [];
  }
}

export async function getUserDatasets(limit = 20): Promise<SavedDataset[]> {
 try {
    const { supabase, user } = await getSupabaseUserClient();
    // Select all fields except data_csv for list view performance
    const { data, error } = await supabase
      .from('generated_datasets')
      .select('id, created_at, dataset_name, prompt_used, num_rows, schema_json, feedback, user_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Handle table not found error gracefully
      if (error.code === 'PGRST116' || error.message.includes('relation "public.generated_datasets" does not exist')) {
        console.warn('Generated datasets table not found. Please run the database schema setup.');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (err: any) {
    console.error('Error fetching user datasets:', err.message);
    return [];
  }
}

export async function getDatasetById(datasetId: string): Promise<(SavedDataset & { data_csv: string }) | null> {
  try {
    const { supabase, user } = await getSupabaseUserClient();
    const { data, error } = await supabase
      .from('generated_datasets')
      .select('*') // Select all including data_csv for a single dataset
      .eq('id', datasetId)
      .eq('user_id', user.id) // Ensure user owns the dataset
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // PostgREST error for "Relation does not exist or no rows found"
      throw error;
    }
    return data;
  } catch (err: any) {
    console.error(`Error fetching dataset by ID (${datasetId}):`, err.message);
    return null;
  }
}
