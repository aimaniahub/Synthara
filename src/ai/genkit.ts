
/**
 * Simple AI service without OpenTelemetry dependencies
 * Replaces Genkit to avoid build issues
 */

import { config } from 'dotenv';

// Load environment variables from .env.local, .env, etc.
config();

// Re-export our simple AI service
export { ai, z } from './simple-ai';
