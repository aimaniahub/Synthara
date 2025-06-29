'use server';
/**
 * @fileOverview A flow for performing a comprehensive, ML-focused analysis on a snippet of a dataset.
 *
 * - analyzeDatasetSnippet - A function that takes a data snippet and returns detailed ML readiness insights.
 * - AnalyzeDatasetSnippetInput - The input type for the analyzeDatasetSnippet function.
 * - AnalyzeDatasetSnippetOutput - The return type for the analyzeDatasetSnippet function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { AnthropicService } from '@/services/anthropic-service';

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

// Fallback function using Anthropic Claude
async function analyzeWithAnthropic(input: AnalyzeDatasetSnippetInput): Promise<AnalyzeDatasetSnippetOutput> {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

  if (!anthropicApiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const anthropicService = new AnthropicService({
    apiKey: anthropicApiKey,
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.1,
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
    const response = await anthropicService.processScrapedContent({
      userPrompt: analysisPrompt,
      numRows: 0, // Not used for analysis
      scrapedContent: '', // Not used for analysis
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
    console.error('[Anthropic Analysis] Error:', error);
    throw new Error(`Anthropic analysis failed: ${error.message}`);
  }
}

const analysisPrompt = ai.definePrompt({
  name: 'analyzeDatasetSnippetMLPrompt',
  input: {schema: AnalyzeDatasetSnippetInputSchema},
  output: {schema: AnalyzeDatasetSnippetOutputSchema},
  prompt: `You are an expert Data Scientist specializing in evaluating datasets for Machine Learning readiness.
Analyze the provided JSON data snippet with the goal of preparing it for ML model training.

Based on the snippet:
1.  **Overall ML Readiness**: Provide a score (0-100) and a summary of why the data is (or isn't) ready for ML. Consider data quality, feature suitability, and potential challenges.
2.  **ML-Focused Quality Summary**: Based on the snippet, provide scores (0-100) for:
    *   **overallScore**: An overall data quality score considering ML usability.
    *   **featureSuitability**: How suitable the observed features seem for ML (e.g., types, variance, not just IDs).
    *   **structuralIntegrity**: How well-structured the snippet is for tabular ML input.
    *   **valueConsistency**: How consistent and valid values within columns appear for ML.
    Briefly note if any of these critically impact ML potential in the 'Overall ML Readiness' summary.
3.  **Key Observations for ML**: List significant observations (e.g., potential target variables if obvious, useful features, data types, initial patterns, data scale/range, presence of identifiers). For each, explain its implication for modeling.
4.  **Potential ML Issues & Recommendations**: Identify problems like high cardinality in categoricals, severe skewness in numerical features, potential data leakage risks (e.g. IDs that might correlate with target), inconsistent formats, insufficient variance in a column, or need for scaling/normalization. For each issue, recommend a mitigation strategy or investigation step.
5.  **Feature Engineering Suggestions**: Suggest ways to create new, valuable features from existing columns (e.g., extracting date components like year/month/day, binning numerical data, creating interaction terms if plausible, basic text feature extraction ideas like word count if applicable).
6.  **Preprocessing Recommendations**: Suggest necessary preprocessing steps (e.g., "Handle missing values in 'Age' using median imputation due to potential skew." or "One-hot encode categorical column 'City'." or "Scale numerical features like 'Income' using StandardScaler if using distance-based algorithms."). Be specific to columns where possible.
7.  **Visualization Suggestions**: Recommend specific plots or charts that would help understand the data better from an ML perspective (e.g., "Plot histograms for numerical features such as 'Age' to check distributions and identify skewness." or "Create a correlation matrix for numerical features to identify multicollinearity." or "Use box plots to identify outliers in 'Salary' grouped by 'Department'.").
8.  **Suggested ML Models**: Based on the apparent characteristics of the data snippet (e.g., type of likely target variable - classification/regression, feature types, data size hinted by snippet), suggest 2-3 suitable ML models or algorithms (e.g., Logistic Regression, Random Forest, Gradient Boosting, SVM, K-Means if unsupervised clustering seems applicable). For each, provide a brief (1-2 sentence) justification for its suitability. If the data seems insufficient to make a strong recommendation, state that.

Data Snippet (JSON format):
{{{dataSnippetJson}}}

Output your analysis strictly in the specified JSON format. Be professional, insightful, and actionable for an ML practitioner.
If the snippet is too small (e.g., less than 3 diverse rows or only 1-2 columns with no clear ML context) or completely inappropriate for meaningful ML analysis (e.g. unstructured text not meant for tabular ML), state this clearly in the 'Overall ML Readiness' summary and score, and keep other sections brief or indicate "Not applicable due to insufficient/inappropriate data snippet." If suggesting ML models seems premature due to data quality or quantity, indicate this in the 'Suggested ML Models' section.
`,
});

const analyzeDatasetSnippetFlow = ai.defineFlow(
  {
    name: 'analyzeDatasetSnippetFlow',
    inputSchema: AnalyzeDatasetSnippetInputSchema,
    outputSchema: AnalyzeDatasetSnippetOutputSchema,
  },
  async (input) => {
    try {
      console.log('[AnalyzeDatasetSnippet] Attempting analysis with Gemini...');
      const {output} = await analysisPrompt(input);
      if (!output) {
        console.log('[AnalyzeDatasetSnippet] Gemini returned no output, trying Anthropic fallback...');
        return await analyzeWithAnthropic(input);
      }
      console.log('[AnalyzeDatasetSnippet] Gemini analysis successful');
      return output;
    } catch (error: any) {
      console.error('[AnalyzeDatasetSnippet] Gemini error:', error.message);

      // Check if it's a quota/rate limit error
      const isQuotaError = error.message?.includes('429') ||
                          error.message?.includes('quota') ||
                          error.message?.includes('Too Many Requests') ||
                          error.message?.includes('exceeded your current quota');

      if (isQuotaError) {
        console.log('[AnalyzeDatasetSnippet] Quota exceeded, trying Anthropic fallback...');
        try {
          const result = await analyzeWithAnthropic(input);
          console.log('[AnalyzeDatasetSnippet] Anthropic fallback successful');
          return result;
        } catch (fallbackError: any) {
          console.error('[AnalyzeDatasetSnippet] Anthropic fallback also failed:', fallbackError.message);
          return {
            overallMlReadiness: {
              score: 0,
              summary: "Analysis temporarily unavailable due to API limitations. Both primary and fallback AI services are currently unavailable."
            },
            dataQualitySummary: { overallScore: 0, featureSuitability: 0, structuralIntegrity: 0, valueConsistency: 0 },
            keyObservationsForML: [],
            potentialMlIssues: [{
              issue: "AI services temporarily unavailable",
              recommendation: "Please try again later. Both Gemini and Together AI services are currently experiencing issues."
            }],
            featureEngineeringSuggestions: [],
            preprocessingRecommendations: [],
            visualizationSuggestions: [],
            suggestedMlModels: []
          };
        }
      }

      // For other errors, also try the fallback
      console.log('[AnalyzeDatasetSnippet] Non-quota error, trying Anthropic fallback...');
      try {
        const result = await analyzeWithAnthropic(input);
        console.log('[AnalyzeDatasetSnippet] Anthropic fallback successful');
        return result;
      } catch (fallbackError: any) {
        console.error('[AnalyzeDatasetSnippet] Anthropic fallback also failed:', fallbackError.message);
        return {
          overallMlReadiness: {
            score: 0,
            summary: "Analysis failed due to technical errors. Please try again or contact support if the issue persists."
          },
          dataQualitySummary: { overallScore: 0, featureSuitability: 0, structuralIntegrity: 0, valueConsistency: 0 },
          keyObservationsForML: [],
          potentialMlIssues: [{
            issue: "Technical error during analysis",
            recommendation: "Please try again with a different dataset or contact support if the problem continues."
          }],
          featureEngineeringSuggestions: [],
          preprocessingRecommendations: [],
          visualizationSuggestions: [],
          suggestedMlModels: []
        };
      }
    }
  }
);
