'use server';
/**
 * @fileOverview A flow for performing a comprehensive, ML-focused analysis on a snippet of a dataset.
 *
 * - analyzeDatasetSnippet - A function that takes a data snippet and returns detailed ML readiness insights.
 * - AnalyzeDatasetSnippetInput - The input type for the analyzeDatasetSnippet function.
 * - AnalyzeDatasetSnippetOutput - The return type for the analyzeDatasetSnippet function.
 */

import { z } from 'zod';
import { OpenRouterService } from '@/services/openrouter-service';

const AnalyzeDatasetSnippetInputSchema = z.object({
  dataSnippetJson: z.string().describe('A JSON string representing a small sample of the dataset (e.g., an array of the first 5-10 rows).'),
});
export type AnalyzeDatasetSnippetInput = z.infer<typeof AnalyzeDatasetSnippetInputSchema>;

const MLFocusedQualitySummarySchema = z.object({
  overallScore: z.number().min(0).max(100).describe('An overall data quality score from 0 to 100 based on the snippet, considering ML usability.'),
  featureSuitability: z.number().min(0).max(100).describe('Score (0-100) indicating how suitable the observed features are for ML tasks (e.g., appropriate types, sufficient variance, not just identifiers).'),
  structuralIntegrity: z.number().min(0).max(100).describe('Score (0-100) assessing how well-structured the data snippet is for typical ML tabular input (e.g., consistent number of fields per record, clear delineation).'),
  valueConsistency: z.number().min(0).max(100).describe('Score (0-100) estimating the consistency and validity of data values within columns (e.g., reasonable ranges, expected formats, absence of mixed types within a feature). Similar to data validity but focused on ML input requirements.'),
});

const AnalyzeDatasetSnippetOutputSchema = z.object({
  overallMlReadiness: z.object({
    score: z.number().min(0).max(100).describe("An overall score (0-100) indicating the dataset snippet's readiness for ML tasks."),
    summary: z.string().describe("A brief summary explaining the ML readiness score, highlighting key strengths and weaknesses for modeling."),
  }),
  dataQualitySummary: MLFocusedQualitySummarySchema.describe('An ML-focused data quality assessment. The AI should interpret these scores in the context of ML readiness if providing commentary.'),
  keyObservationsForML: z.array(z.object({
    observation: z.string().describe("A key observation about the data relevant to ML (e.g., data types, distributions, potential targets, feature characteristics, data scale/range)."),
    implication: z.string().describe("What this observation implies for ML model training or data preparation."),
  })).describe("Key observations from an ML perspective derived from the snippet."),
  potentialMlIssues: z.array(z.object({
    issue: z.string().describe("A potential issue that could affect ML modeling (e.g., high cardinality, severe skewness, potential data leakage risk, inconsistent formats, data sparsity for a column, need for scaling/normalization)."),
    recommendation: z.string().describe("A suggestion on how to address or further investigate this issue."),
  })).describe("Potential issues for ML identified in the snippet and actionable recommendations."),
  featureEngineeringSuggestions: z.array(z.string()).describe("Suggestions for creating new features or transforming existing ones to potentially improve model performance (e.g., extracting date components, binning numerical data, creating interaction terms, text feature extraction ideas)."),
  preprocessingRecommendations: z.array(z.string()).describe("Recommendations for data preprocessing steps critical for ML (e.g., 'Handle missing values in column X using mean imputation.' or 'One-hot encode categorical column Y.' or 'Scale numerical features using StandardScaler.')."),
  visualizationSuggestions: z.array(z.string()).describe("Suggestions for specific visualizations that could provide further insight for ML (e.g., 'Plot histograms for numerical features like Age to check distributions.' or 'Create a correlation matrix for numerical features.' or 'Use box plots to identify outliers in column Z for specific categories.')."),
  suggestedMlModels: z.array(z.object({
    modelName: z.string().describe("Name of a suitable ML model or algorithm (e.g., Random Forest, Logistic Regression, XGBoost)."),
    suitabilityReason: z.string().describe("Brief explanation why this model is a good fit for the observed data characteristics (e.g., 'Good for tabular data with mixed feature types and potential non-linear relationships').")
  })).describe("Suggestions for 2-3 ML models/algorithms suitable for the data characteristics observed, with reasons."),
});
export type AnalyzeDatasetSnippetOutput = z.infer<typeof AnalyzeDatasetSnippetOutputSchema>;

export async function analyzeDatasetSnippet(input: AnalyzeDatasetSnippetInput): Promise<AnalyzeDatasetSnippetOutput> {
  return analyzeDatasetSnippetFlow(input);
}

// Fallback function using OpenRouter DeepSeek
async function analyzeWithOpenRouter(input: AnalyzeDatasetSnippetInput): Promise<AnalyzeDatasetSnippetOutput> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterApiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  const openRouterService = new OpenRouterService({
    apiKey: openRouterApiKey,
    baseUrl: process.env.OPENROUTER_BASE_URL,
    model: process.env.OPENROUTER_MODEL,
    siteUrl: process.env.OPENROUTER_SITE_URL,
    siteName: process.env.OPENROUTER_SITE_NAME,
  });

  const analysisPrompt = `You are an expert Data Scientist specializing in evaluating datasets for Machine Learning readiness.
Analyze the provided JSON data snippet with the goal of preparing it for ML model training.

Based on the snippet:
1. **Overall ML Readiness**: Provide a score (0-100) and a summary of why the data is (or isn't) ready for ML. Consider data quality, feature suitability, and potential challenges.
2. **ML-Focused Quality Summary**: Based on the snippet, provide scores (0-100) for:
   * **overallScore**: An overall data quality score considering ML usability.
   * **featureSuitability**: How suitable the observed features seem for ML (e.g., types, variance, not just IDs).
   * **structuralIntegrity**: How well-structured the snippet is for tabular ML input.
   * **valueConsistency**: How consistent and valid values within columns appear for ML.
3. **Key Observations for ML**: List significant observations (e.g., potential target variables if obvious, useful features, data types, initial patterns, data scale/range, presence of identifiers). For each, explain its implication for modeling.
4. **Potential ML Issues & Recommendations**: Identify problems like high cardinality in categoricals, severe skewness in numerical features, potential data leakage risks, inconsistent formats, insufficient variance in a column, or need for scaling/normalization. For each issue, recommend a mitigation strategy.
5. **Feature Engineering Suggestions**: Suggest ways to create new, valuable features from existing columns.
6. **Preprocessing Recommendations**: Suggest necessary preprocessing steps.
7. **Visualization Suggestions**: Recommend specific plots or charts that would help understand the data better from an ML perspective.
8. **Suggested ML Models**: Based on the apparent characteristics of the data snippet, suggest 2-3 suitable ML models or algorithms with brief justifications.

Data Snippet (JSON format):
${input.dataSnippetJson}

Please respond with a valid JSON object in this exact format:
{
  "overallMlReadiness": {
    "score": <number 0-100>,
    "summary": "<string>"
  },
  "dataQualitySummary": {
    "overallScore": <number 0-100>,
    "featureSuitability": <number 0-100>,
    "structuralIntegrity": <number 0-100>,
    "valueConsistency": <number 0-100>
  },
  "keyObservationsForML": [
    {
      "observation": "<string>",
      "implication": "<string>"
    }
  ],
  "potentialMlIssues": [
    {
      "issue": "<string>",
      "recommendation": "<string>"
    }
  ],
  "featureEngineeringSuggestions": ["<string>"],
  "preprocessingRecommendations": ["<string>"],
  "visualizationSuggestions": ["<string>"],
  "suggestedMlModels": [
    {
      "modelName": "<string>",
      "suitabilityReason": "<string>"
    }
  ]
}`;

  try {
    const response = await openRouterService.processScrapedContent({
      userPrompt: analysisPrompt,
      numRows: 0, // Not used for analysis
      scrapedContent: input.dataSnippetJson, // Use the actual data snippet
    });

    // Parse the JSON response
    const analysisResult = JSON.parse(response.jsonString);

    // Validate and return the result
    return {
      overallMlReadiness: analysisResult.overallMlReadiness || { score: 0, summary: "Analysis completed with limited insights" },
      dataQualitySummary: analysisResult.dataQualitySummary || { overallScore: 0, featureSuitability: 0, structuralIntegrity: 0, valueConsistency: 0 },
      keyObservationsForML: analysisResult.keyObservationsForML || [],
      potentialMlIssues: analysisResult.potentialMlIssues || [],
      featureEngineeringSuggestions: analysisResult.featureEngineeringSuggestions || [],
      preprocessingRecommendations: analysisResult.preprocessingRecommendations || [],
      visualizationSuggestions: analysisResult.visualizationSuggestions || [],
      suggestedMlModels: analysisResult.suggestedMlModels || []
    };
  } catch (error: any) {
    console.error('[OpenRouter Analysis] Error:', error);
    throw new Error(`OpenRouter analysis failed: ${error.message}`);
  }
}

async function analyzeDatasetSnippetFlow(input: AnalyzeDatasetSnippetInput): Promise<AnalyzeDatasetSnippetOutput> {
    try {
      console.log('[AnalyzeDatasetSnippet] Attempting analysis with OpenRouter DeepSeek...');
      return await analyzeWithOpenRouter(input);
    } catch (error: any) {
      console.error('[AnalyzeDatasetSnippet] OpenRouter error:', error.message);
      return {
        overallMlReadiness: {
          score: 0,
          summary: "Analysis failed due to OpenRouter API error. Please check your API key and try again."
        },
        dataQualitySummary: { overallScore: 0, featureSuitability: 0, structuralIntegrity: 0, valueConsistency: 0 },
        keyObservationsForML: [],
        potentialMlIssues: [{
          issue: "OpenRouter API error",
          recommendation: "Please check your OPENROUTER_API_KEY environment variable and try again."
        }],
        featureEngineeringSuggestions: [],
        preprocessingRecommendations: [],
        visualizationSuggestions: [],
        suggestedMlModels: []
      };
    }
}
