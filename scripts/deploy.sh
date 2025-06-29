#!/bin/bash

# Synthara AI - Netlify Deployment Script
# This script prepares the project for Netlify deployment

echo "🚀 Preparing Synthara AI for Netlify deployment..."

# Check if required environment variables are set
echo "📋 Checking environment variables..."

required_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "ANTHROPIC_API_KEY"
    "GOOGLE_GENERATIVE_AI_API_KEY"
    "SERPAPI_API_KEY"
    "FIRECRAWL_API_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '%s\n' "${missing_vars[@]}"
    echo ""
    echo "Please set these variables in your Netlify dashboard under:"
    echo "Site settings > Environment variables"
    echo ""
    echo "Or create a .env.local file for local development."
    exit 1
fi

echo "✅ All required environment variables are set"

# Clean up any temporary files
echo "🧹 Cleaning up temporary files..."
rm -rf temp/
rm -rf .next/
rm -rf out/
rm -rf node_modules/.cache/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Run type checking
echo "🔍 Running type checks..."
npm run typecheck

# Build the project
echo "🏗️ Building the project..."
npm run build

echo "✅ Deployment preparation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Push your code to GitHub"
echo "2. Connect your repository to Netlify"
echo "3. Set environment variables in Netlify dashboard"
echo "4. Deploy!"
echo ""
echo "🌐 Your Synthara AI app will be live on Netlify!"
