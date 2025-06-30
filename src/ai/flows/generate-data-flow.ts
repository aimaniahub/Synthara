
'use server';
/**
 * @fileOverview A flow for generating synthetic data based on a natural language prompt.
 * This flow relies on the model's internal knowledge and does not access external data.
 *
 * - generateData - A function that takes a prompt and number of rows to generate structured data.
 * - GenerateDataInput - The input type for the generateData function.
 * - GenerateDataOutput - The return type for the generateData function.
 * - Column - The type definition for a column schema.
 */

import {ai, z} from '@/ai/genkit';

// Define and export types separately to avoid exporting non-function objects from a 'use server' file.
export interface Column {
  name: string;
  type: string;
}

export interface GenerateDataOutput {
  generatedRows: Array<Record<string, any>>;
  generatedCsv?: string;
  detectedSchema: Column[];
  feedback?: string;
}


// Zod schemas are now internal to this flow and are NOT exported.
const ColumnSchema = z.object({
  name: z.string().describe('The name of the column.'),
  type: z.string().describe('The inferred data type of the column (e.g., String, Integer, Float, Boolean, Date).'),
});

const GenerateDataInputSchema = z.object({
  prompt: z.string().describe('The natural language prompt describing the data to generate.'),
  numRows: z.number().optional().default(50).describe('The number of data rows to generate. Maximum 100.'),
});
export type GenerateDataInput = z.infer<typeof GenerateDataInputSchema>;

const LLMGenerateDataOutputSchema = z.object({
  generatedJsonString: z.string().describe('A JSON string representing an array of generated data objects (rows). This string MUST be a valid JSON array of objects. For example: [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]'),
  detectedSchema: z.array(ColumnSchema).describe('The schema (column names and types) inferred from the generated data. This should be derived from the structure of generatedJsonString.'),
  feedback: z.string().optional().describe('Any feedback or notes from the generation process, like warnings or suggestions.'),
});

const GenerateDataOutputSchema = z.object({
  generatedRows: z.array(z.record(z.string(), z.any())).describe('An array of generated data objects, where each object represents a row. Parsed from the LLM output.'),
  generatedCsv: z.string().optional().describe('The generated data in CSV format.'),
  detectedSchema: z.array(ColumnSchema).describe('The schema (column names and types) inferred from the generated data.'),
  feedback: z.string().optional().describe('Any feedback or notes from the generation process.'),
});

// This function is only used internally, so it is no longer exported.
async function jsonToCsv(jsonData: Array<Record<string, any>>): Promise<string> {
  if (!jsonData || jsonData.length === 0) {
    return "";
  }
  const keys = Object.keys(jsonData[0]);
  const csvRows = [
    keys.join(','), // header row
    ...jsonData.map(row =>
      keys.map(key => {
        let cell = row[key] === null || row[key] === undefined ? '' : String(row[key]);
        cell = cell.replace(/"/g, '""'); // escape double quotes
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes('\r')) {
          cell = `"${cell}"`; // quote cells with commas, quotes, or newlines
        }
        return cell;
      }).join(',')
    )
  ];
  return csvRows.join('\n');
}

export async function generateData(input: GenerateDataInput): Promise<GenerateDataOutput> {
  return generateDataFlow(input);
}

const generationPrompt = ai.definePrompt({
  name: 'generateSyntheticDataPrompt',
  model: 'googleai/gemini-1.5-flash-latest', 
  input: {schema: GenerateDataInputSchema }, 
  output: {schema: LLMGenerateDataOutputSchema},
  prompt: `You are an expert data generation assistant. Based on the user's prompt, generate synthetic data using your internal knowledge.
The output MUST be a JSON object adhering to the output schema.
The 'generatedJsonString' field MUST be a valid JSON string representing an array of JSON objects, where each object is a row of data.
The 'detectedSchema' field should be an array describing each column: its name and inferred data type (e.g., String, Integer, Date, Boolean, Float). Infer this from the data you generate for 'generatedJsonString'.

User Prompt: {{{prompt}}}
Number of rows to generate: {{numRows}}

Think step-by-step:
1.  Analyze the user prompt: "{{prompt}}".
2.  Define the columns and their types based on the user's prompt. This will become your 'detectedSchema'.
3.  Generate the data for {{numRows}} rows according to these columns.
4.  Format this generated data as a single, valid JSON string for the 'generatedJsonString' field.
5.  Provide 'feedback' if there are any issues, like capping the number of rows.

For example, if the prompt is "customer data with name, email, and age", the 'detectedSchema' might be:
[ { "name": "Name", "type": "String" }, { "name": "Email", "type": "String" }, { "name": "Age", "type": "Integer" } ]
And 'generatedJsonString' would be a string like:
"[{\"Name\":\"John Doe\",\"Email\":\"john.doe@example.com\",\"Age\":30},{\"Name\":\"Jane Smith\",\"Email\":\"jane.smith@example.com\",\"Age\":25}]"

Ensure dates are in YYYY-MM-DD format if generated.
Limit generated rows to a maximum of 100, even if numRows is higher, and mention this in feedback if applicable.
If the prompt implies a very large number of columns or very complex data, try to simplify and note this in feedback.
`,
});

const generateDataFlow = ai.defineFlow(
  {
    name: 'generateDataFlow', 
    inputSchema: GenerateDataInputSchema,
    outputSchema: GenerateDataOutputSchema, 
  },
  async (input) => {
    const effectiveNumRows = Math.min(input.numRows || 50, 100);
    let baseFeedback = input.numRows > 100 ? "Note: Number of rows capped at 100 for this direct generation. " : "";

    const {output: llmOutput} = await generationPrompt({ 
      ...input,
      numRows: effectiveNumRows,
    });

    let parsedRows: Array<Record<string, any>> = [];
    let generatedCsv: string | undefined = undefined;
    let combinedFeedback = baseFeedback;

    if (llmOutput) {
      if (llmOutput.generatedJsonString) {
        try {
          parsedRows = JSON.parse(llmOutput.generatedJsonString);
          if (Array.isArray(parsedRows) && parsedRows.length > 0) {
            generatedCsv = await jsonToCsv(parsedRows);
            if ((!llmOutput.detectedSchema || llmOutput.detectedSchema.length === 0) && parsedRows.length > 0 && parsedRows[0]) {
                 llmOutput.detectedSchema = Object.keys(parsedRows[0]).map(key => ({
                    name: key, 
                    type: typeof parsedRows[0][key] === 'number' 
                            ? (Number.isInteger(parsedRows[0][key]) ? 'Integer' : 'Float') 
                            : typeof parsedRows[0][key] === 'boolean' 
                                ? 'Boolean' 
                                : 'String' 
                }));
                const schemaInferMsg = " Schema was auto-inferred from data.";
                combinedFeedback = combinedFeedback ? combinedFeedback + schemaInferMsg : schemaInferMsg.trim();
            }
          } else if (Array.isArray(parsedRows) && parsedRows.length === 0) {
             const emptyDataMsg = " AI returned an empty dataset.";
             combinedFeedback = combinedFeedback ? combinedFeedback + emptyDataMsg : emptyDataMsg.trim();
          }
        } catch (e: any) {
          console.error("Error parsing generatedJsonString:", e);
          const parseErrorMsg = ` Error parsing generated JSON: ${e.message}`;
          combinedFeedback = combinedFeedback ? combinedFeedback + parseErrorMsg : parseErrorMsg.trim();
          parsedRows = []; 
        }
      } else {
         const noDataStringMsg = " AI did not return any data string.";
         combinedFeedback = combinedFeedback ? combinedFeedback + noDataStringMsg : noDataStringMsg.trim();
      }

      if (llmOutput.feedback) {
         combinedFeedback = combinedFeedback ? `${combinedFeedback} LLM Feedback: ${llmOutput.feedback}` : llmOutput.feedback;
      }

      return {
        generatedRows: parsedRows,
        generatedCsv: generatedCsv,
        detectedSchema: llmOutput.detectedSchema || [],
        feedback: combinedFeedback.trim() || undefined,
      };
    }

    return {
      generatedRows: [],
      generatedCsv: undefined,
      detectedSchema: [],
      feedback: combinedFeedback.trim() || "Failed to generate data. The model did not return a valid output. Please try rephrasing your prompt.",
    };
  }
);
