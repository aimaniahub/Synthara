
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import { config } from 'dotenv';

// Load environment variables from .env.local, .env, etc.
config();

// Unified Google API Key for Gemini models and potentially other Google AI services.
const googleApiKey = process.env.GOOGLE_API_KEY;

if (!googleApiKey && process.env.NODE_ENV !== 'test') {
  console.warn(
    'WARNING: GOOGLE_API_KEY environment variable is not set. The Google AI plugin (for Gemini models) may not function correctly. Please set it in your .env.local file.'
  );
}

export const ai = genkit({
  plugins: [
    // Configure the googleAI plugin with the Google API key.
    // This key will be used for Gemini model access.
    googleAI(
      googleApiKey ? { apiKey: googleApiKey } : undefined
    ),
  ],
  // Sets the default model for ai.generate() calls if no model is specified in the call itself.
  // Using gemini-1.5-flash-latest for good general capabilities and tool support.
  model: 'googleai/gemini-1.5-flash-latest',
});
