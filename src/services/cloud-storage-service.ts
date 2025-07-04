'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface CloudStorageResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class CloudStorageService {
  /**
   * Upload content to Supabase storage as a fallback for file operations
   */
  static async uploadContent(
    content: string,
    filename: string,
    bucket: string = 'temp-files'
  ): Promise<CloudStorageResult> {
    try {
      const supabase = await createSupabaseServerClient();
      
      // Create a blob from the content
      const blob = new Blob([content], { type: 'text/markdown' });
      const file = new File([blob], filename, { type: 'text/markdown' });

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('[CloudStorage] Upload error:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filename);

      console.log(`[CloudStorage] Successfully uploaded: ${filename}`);
      return { success: true, url: urlData.publicUrl };

    } catch (error: any) {
      console.error('[CloudStorage] Upload failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Download content from Supabase storage
   */
  static async downloadContent(
    filename: string,
    bucket: string = 'temp-files'
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const supabase = await createSupabaseServerClient();

      const { data, error } = await supabase.storage
        .from(bucket)
        .download(filename);

      if (error) {
        console.error('[CloudStorage] Download error:', error);
        return { success: false, error: error.message };
      }

      const content = await data.text();
      console.log(`[CloudStorage] Successfully downloaded: ${filename} (${content.length} chars)`);
      return { success: true, content };

    } catch (error: any) {
      console.error('[CloudStorage] Download failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete file from Supabase storage
   */
  static async deleteFile(
    filename: string,
    bucket: string = 'temp-files'
  ): Promise<CloudStorageResult> {
    try {
      const supabase = await createSupabaseServerClient();

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filename]);

      if (error) {
        console.error('[CloudStorage] Delete error:', error);
        return { success: false, error: error.message };
      }

      console.log(`[CloudStorage] Successfully deleted: ${filename}`);
      return { success: true };

    } catch (error: any) {
      console.error('[CloudStorage] Delete failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old files from storage
   */
  static async cleanupOldFiles(
    maxAgeHours: number = 24,
    bucket: string = 'temp-files'
  ): Promise<void> {
    try {
      const supabase = await createSupabaseServerClient();
      
      const { data: files, error } = await supabase.storage
        .from(bucket)
        .list();

      if (error) {
        console.error('[CloudStorage] List files error:', error);
        return;
      }

      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      const filesToDelete: string[] = [];

      for (const file of files || []) {
        const fileTime = new Date(file.created_at).getTime();
        if (now - fileTime > maxAge) {
          filesToDelete.push(file.name);
        }
      }

      if (filesToDelete.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove(filesToDelete);

        if (deleteError) {
          console.error('[CloudStorage] Cleanup error:', deleteError);
        } else {
          console.log(`[CloudStorage] Cleaned up ${filesToDelete.length} old files`);
        }
      }

    } catch (error: any) {
      console.error('[CloudStorage] Cleanup failed:', error);
    }
  }
}
