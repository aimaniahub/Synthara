import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { datasetName, generationResult, prompt, numRows, isPublic } = body;

    // Validate required fields
    if (!datasetName || !generationResult) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: datasetName and generationResult' },
        { status: 400 }
      );
    }

    // Validate generation result structure
    if (!generationResult.data || !Array.isArray(generationResult.data)) {
      return NextResponse.json(
        { success: false, error: 'Invalid generation result: data must be an array' },
        { status: 400 }
      );
    }

    // Ensure we have CSV data
    let csvData = generationResult.csv;
    if (!csvData && generationResult.data && generationResult.data.length > 0) {
      // Generate CSV from data if not provided
      const headers = generationResult.schema?.map((col: any) => col.name) || Object.keys(generationResult.data[0]);
      const csvRows = generationResult.data.map((row: any) => 
        headers.map((header: any) => {
          const value = row[header];
          // Escape CSV values properly
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      );
      csvData = [headers.join(','), ...csvRows].join('\n');
    }

    if (!csvData) {
      return NextResponse.json(
        { success: false, error: 'No CSV data available to save' },
        { status: 400 }
      );
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `dataset-${timestamp}.csv`;

    // Save to local file system
    const outputDir = join(process.cwd(), 'output');
    try {
      await mkdir(outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    const filepath = join(outputDir, filename);
    await writeFile(filepath, csvData, 'utf8');

    // Create metadata file
    const metadata = {
      datasetName,
      filename,
      timestamp: new Date().toISOString(),
      prompt,
      numRows,
      actualRows: generationResult.data.length,
      schema: generationResult.schema || [],
      feedback: generationResult.feedback || null
    };

    const metadataFilename = `metadata-${timestamp}.json`;
    const metadataFilepath = join(outputDir, metadataFilename);
    await writeFile(metadataFilepath, JSON.stringify(metadata, null, 2), 'utf8');

    // Save to Supabase
    let supabaseSuccess = false;
    let supabaseError = null;

    try {
      const supabase = await createSupabaseServerClient();
      if (!supabase) {
        console.log('[Save Dataset] Supabase not configured, skipping Supabase save');
        supabaseSuccess = false;
        supabaseError = 'Supabase not configured';
      } else {
      
      // Get current user (if authenticated)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.log('[Save Dataset] No authenticated user, skipping Supabase save');
        supabaseSuccess = false;
        supabaseError = 'No authenticated user';
      } else {
        // Save to Supabase
        const { data: insertData, error: insertError } = await supabase
          .from('generated_datasets')
          .insert({
            user_id: user.id,
            dataset_name: datasetName,
            prompt_used: prompt,
            num_rows: generationResult.data.length,
            schema_json: generationResult.schema || [],
            data_csv: csvData,
            feedback: generationResult.feedback || null,
            is_public: !!isPublic
          })
          .select()
          .single();

        if (insertError) {
          console.error('[Save Dataset] Supabase insert error:', insertError);
          supabaseError = insertError.message;
        } else {
          console.log('[Save Dataset] Saved to Supabase:', insertData.id);
          supabaseSuccess = true;
        }
      }
      }
    } catch (supabaseErr: any) {
      console.error('[Save Dataset] Supabase error:', supabaseErr);
      supabaseError = supabaseErr.message;
    }

    console.log(`[Save Dataset] Local save: ${filename}`);
    console.log(`[Save Dataset] Supabase save: ${supabaseSuccess ? 'Success' : 'Failed'}`);
    console.log(`[Save Dataset] Rows: ${generationResult.data.length}`);
    console.log(`[Save Dataset] Columns: ${generationResult.schema?.length || 0}`);

    return NextResponse.json({
      success: true,
      filename,
      metadataFilename,
      rows: generationResult.data.length,
      columns: generationResult.schema?.length || 0,
      localSave: true,
      supabaseSave: supabaseSuccess,
      supabaseError: supabaseError,
      message: `Dataset "${datasetName}" saved successfully${supabaseSuccess ? ' to both local storage and Supabase' : ' to local storage only'}`
    });

  } catch (error) {
    console.error('[Save Dataset] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save dataset' 
      },
      { status: 500 }
    );
  }
}
