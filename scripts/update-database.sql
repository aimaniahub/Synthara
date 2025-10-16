-- Update existing Supabase database with missing tables
-- Run this in your Supabase SQL Editor to add the missing tables

-- Add missing columns to user_activities table (if not already added)
ALTER TABLE public.user_activities 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'COMPLETED',
ADD COLUMN IF NOT EXISTS related_resource_id UUID;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create file_storage table
CREATE TABLE IF NOT EXISTS public.file_storage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    file_path TEXT NOT NULL,
    storage_bucket VARCHAR(100) DEFAULT 'datasets',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON public.user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_status ON public.user_activities(status);
CREATE INDEX IF NOT EXISTS idx_generated_datasets_dataset_name ON public.generated_datasets(dataset_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_user_id ON public.file_storage(user_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_created_at ON public.file_storage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_storage_file_type ON public.file_storage(file_type);

-- Enable RLS on new tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_storage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON public.user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for file_storage
CREATE POLICY "Users can view their own files" ON public.file_storage
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files" ON public.file_storage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files" ON public.file_storage
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files" ON public.file_storage
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_profiles updated_at
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('datasets', 'datasets', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" ON storage.objects
    FOR SELECT USING (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" ON storage.objects
    FOR UPDATE USING (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" ON storage.objects
    FOR DELETE USING (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);
