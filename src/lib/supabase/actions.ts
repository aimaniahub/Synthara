// src/lib/supabase/actions.ts
'use server';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { type User } from '@supabase/supabase-js';
import type { GenerateDataOutput } from '@/ai/flows/generate-data-flow';
import type { AnalyzeDatasetSnippetOutput } from '@/ai/flows/analyze-dataset-snippet-flow';
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
  
  if (userError || !user) {
    console.error('User not authenticated or error fetching user:', userError?.message);
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

    const { error } = await supabase.from('user_activities').insert({
      user_id: user.id,
      activity_type: activityType,
      description,
      details,
      status,
      related_resource_id: relatedResourceId,
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('Error logging activity:', err.message);
    return { success: false, error: err.message };
  }
}

// --- Dataset Storage ---
interface SaveDatasetInput {
  datasetName: string;
  generationResult: GenerateDataOutput;
  prompt: string;
  numRows: number;
}

export async function saveDataset(
  input: SaveDatasetInput
): Promise<{ success: boolean; datasetId?: string; error?: string }> {
  try {
    const { supabase, user } = await getSupabaseUserClient();
    const { datasetName, generationResult, prompt, numRows } = input;

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

    if (!generationResult.generatedCsv || !generationResult.detectedSchema) {
      const missingFields = [];
      if (!generationResult.generatedCsv) missingFields.push('generatedCsv');
      if (!generationResult.detectedSchema) missingFields.push('detectedSchema');

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
        schema_json: generationResult.detectedSchema,
        data_csv: generationResult.generatedCsv,
        feedback: generationResult.feedback,
      })
      .select('id')
      .single();

    if (error) throw error;
    if (!data || !data.id) throw new Error("Failed to get dataset ID after insert.");

    // Log the save activity
    await logActivity({
      activityType: 'DATASET_SAVED',
      description: `Saved dataset: "${datasetName}"`,
      details: { datasetName, numRows, schemaColumns: generationResult.detectedSchema.length },
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

    if (error) throw error;
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

    if (error) throw error;
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
