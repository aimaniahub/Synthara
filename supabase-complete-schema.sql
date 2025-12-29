-- Complete Supabase Database Schema for Synthara AI
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create user_activities table with all required columns
CREATE TABLE IF NOT EXISTS public.user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'COMPLETED',
    related_resource_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create generated_datasets table
CREATE TABLE IF NOT EXISTS public.generated_datasets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dataset_name VARCHAR(255) NOT NULL,
    prompt_used TEXT NOT NULL,
    num_rows INTEGER NOT NULL DEFAULT 0,
    schema_json JSONB NOT NULL,
    data_csv TEXT NOT NULL,
    feedback TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table for additional user information
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

-- Create file_storage table for tracking uploaded/downloaded files
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON public.user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON public.user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON public.user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_status ON public.user_activities(status);

CREATE INDEX IF NOT EXISTS idx_generated_datasets_user_id ON public.generated_datasets(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_datasets_created_at ON public.generated_datasets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_datasets_dataset_name ON public.generated_datasets(dataset_name);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_file_storage_user_id ON public.file_storage(user_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_created_at ON public.file_storage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_storage_file_type ON public.file_storage(file_type);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_storage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_activities
CREATE POLICY "Users can view their own activities" ON public.user_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities" ON public.user_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities" ON public.user_activities
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities" ON public.user_activities
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for generated_datasets
CREATE POLICY "Users can view their own datasets" ON public.generated_datasets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own datasets" ON public.generated_datasets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own datasets" ON public.generated_datasets
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own datasets" ON public.generated_datasets
    FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.generated_datasets ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE POLICY IF NOT EXISTS "Anyone can view public datasets" ON public.generated_datasets
    FOR SELECT USING (is_public = true);

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

-- Create triggers for updated_at
CREATE TRIGGER update_generated_datasets_updated_at 
    BEFORE UPDATE ON public.generated_datasets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
CREATE POLICY IF NOT EXISTS "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can view their own files" ON storage.objects
    FOR SELECT USING (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can update their own files" ON storage.objects
    FOR UPDATE USING (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can delete their own files" ON storage.objects
    FOR DELETE USING (bucket_id = 'datasets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Training tables for production-like training lifecycle
CREATE TABLE IF NOT EXISTS public.training_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dataset_name TEXT,
    config JSONB DEFAULT '{}'::jsonb NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
    total_epochs INTEGER NOT NULL DEFAULT 0,
    current_epoch INTEGER NOT NULL DEFAULT 0,
    progress INTEGER NOT NULL DEFAULT 0,
    last_metrics JSONB,
    artifact_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_logs (
    id BIGSERIAL PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES public.training_jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    epoch INTEGER NOT NULL,
    progress INTEGER NOT NULL,
    metrics JSONB,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for training tables
CREATE INDEX IF NOT EXISTS idx_training_jobs_user_id ON public.training_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_training_jobs_created_at ON public.training_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_logs_job_id_epoch ON public.training_logs(job_id, epoch);
CREATE INDEX IF NOT EXISTS idx_training_logs_user_id ON public.training_logs(user_id);

-- Enable RLS on training tables
ALTER TABLE public.training_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_logs ENABLE ROW LEVEL SECURITY;

-- Policies for training_jobs
CREATE POLICY IF NOT EXISTS "Users can view their own training jobs" ON public.training_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own training jobs" ON public.training_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own training jobs" ON public.training_jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own training jobs" ON public.training_jobs
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for training_logs
CREATE POLICY IF NOT EXISTS "Users can view their own training logs" ON public.training_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own training logs" ON public.training_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own training logs" ON public.training_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- Trigger to keep updated_at fresh on training_jobs
CREATE TRIGGER IF NOT EXISTS update_training_jobs_updated_at 
    BEFORE UPDATE ON public.training_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for model artifacts
INSERT INTO storage.buckets (id, name, public) VALUES ('models', 'models', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for model artifacts
CREATE POLICY IF NOT EXISTS "Users can upload their own model artifacts" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'models' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can view their own model artifacts" ON storage.objects
    FOR SELECT USING (bucket_id = 'models' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can update their own model artifacts" ON storage.objects
    FOR UPDATE USING (bucket_id = 'models' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Users can delete their own model artifacts" ON storage.objects
    FOR DELETE USING (bucket_id = 'models' AND auth.uid()::text = (storage.foldername(name))[1]);
