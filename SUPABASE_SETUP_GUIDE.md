# Supabase Setup Guide for Synthara AI

This guide will help you set up Supabase for your Synthara AI project to enable data storage and user authentication.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Your Synthara AI project files

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `synthara-ai` (or your preferred name)
   - **Database Password**: Generate a strong password and save it
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be created (this may take a few minutes)

## Step 2: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

## Step 3: Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `supabase-complete-schema.sql` from your project
4. Paste it into the SQL Editor
5. Click "Run" to execute the schema

This will create:
- `user_activities` table for logging user actions
- `generated_datasets` table for storing CSV data and metadata
- `user_profiles` table for user information
- `file_storage` table for file tracking
- All necessary indexes and security policies

## Step 4: Configure Environment Variables

1. In your project root, create a `.env.local` file (if it doesn't exist)
2. Add your Supabase credentials:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# AI Service API Keys (Required for data generation)
GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key_here
SERPAPI_KEY=your_serpapi_key_here

# Optional: OpenAI API Key (if using OpenAI models)
OPENAI_API_KEY=your_openai_api_key_here

# Crawl4AI Service Configuration
CRAWL4AI_SERVICE_URL=http://localhost:11235

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# Production URLs (Update for production deployment)
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

## Step 5: Set Up Authentication

1. In your Supabase dashboard, go to **Authentication** → **Settings**
2. Configure your site URL:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add `http://localhost:3000/auth/callback`
3. Go to **Authentication** → **Providers**
4. Enable the providers you want to use:
   - **Email**: Enable for email/password authentication
   - **Google**: Enable if you want Google OAuth
   - **GitHub**: Enable if you want GitHub OAuth

## Step 6: Set Up File Storage (Optional)

1. In your Supabase dashboard, go to **Storage**
2. You should see a `datasets` bucket created by the schema
3. If not, create a new bucket:
   - **Name**: `datasets`
   - **Public**: No (private bucket)
   - **File size limit**: 50MB (or your preferred limit)

## Step 7: Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to `http://localhost:3000`

3. Try to:
   - Sign up for a new account
   - Generate some data
   - Save a dataset
   - Check the history page

4. Verify in Supabase dashboard:
   - **Authentication** → **Users**: Should see your test user
   - **Table Editor** → **user_activities**: Should see activity logs
   - **Table Editor** → **generated_datasets**: Should see saved datasets

## Step 8: Production Deployment

When deploying to production:

1. Update your environment variables with production URLs
2. In Supabase dashboard, update:
   - **Authentication** → **Settings** → **Site URL**: Your production domain
   - **Authentication** → **Settings** → **Redirect URLs**: Add your production callback URL
3. Update your `.env.local` or deployment environment variables

## Troubleshooting

### Common Issues:

1. **"Database tables not set up" error**:
   - Make sure you ran the complete schema SQL
   - Check that all tables exist in the Table Editor

2. **Authentication not working**:
   - Verify your Supabase URL and anon key are correct
   - Check that authentication is enabled in Supabase dashboard
   - Ensure redirect URLs are configured correctly

3. **Data not saving**:
   - Check browser console for errors
   - Verify environment variables are loaded correctly
   - Check Supabase logs in the dashboard

4. **RLS (Row Level Security) errors**:
   - Make sure you're authenticated
   - Check that RLS policies are created correctly
   - Verify user ID matches in the database

### Debug Steps:

1. Check browser console for errors
2. Check Supabase dashboard logs
3. Verify environment variables are loaded:
   ```javascript
   console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
   console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
   ```

## Database Schema Overview

### Tables Created:

1. **user_activities**: Logs all user actions and activities
2. **generated_datasets**: Stores CSV data, schemas, and metadata
3. **user_profiles**: Additional user information and preferences
4. **file_storage**: Tracks uploaded and generated files

### Security Features:

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Automatic user profile creation on signup
- Secure file storage with user-based access control

## Next Steps

After completing this setup:

1. Test all functionality thoroughly
2. Set up monitoring and alerts in Supabase
3. Configure backup strategies
4. Set up production environment variables
5. Deploy your application

Your Synthara AI project should now be able to:
- Authenticate users
- Generate and save datasets
- Track user activities
- Store files securely
- Provide a complete user experience

For additional help, check the [Supabase documentation](https://supabase.com/docs) or the project's README.md file.
