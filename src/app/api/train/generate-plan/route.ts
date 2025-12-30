import { NextRequest, NextResponse } from 'next/server';
import { SimpleAI } from '@/ai/simple-ai';

export const runtime = 'nodejs';

type ColType = 'number' | 'string';

type SchemaCol = { name: string; type: ColType };

type Plan = {
  targetColumn: string;
  modelType: 'classification' | 'regression';
  features: string[];
  params: { testSplit: number; epochs: number; batchSize: number };
  scriptLanguage: 'python';
  script: string;
  rationale?: string;
  constraintsUsed?: string[];
};

function uniqCount(rows: any[], key: string) {
  const s = new Set(rows.map((r) => r?.[key]));
  return s.size;
}

function suggestPlan(schema: SchemaCol[], rows: any[]): Omit<Plan, 'script'> & { script?: string } {
  const cols = schema.map((c) => c.name);
  const n = rows.length;
  const candidate = cols.filter((c) => !/^(id|uuid|index|row|timestamp)$/i.test(c) && uniqCount(rows, c) > 1);
  let targetColumn = cols[cols.length - 1] || '';
  let modelType: 'classification' | 'regression' = 'classification';
  let best = -Infinity;
  for (const c of candidate) {
    const u = uniqCount(rows, c);
    const t = schema.find((x) => x.name === c)?.type || 'string';
    const ratio = u / Math.max(1, n);
    let score = -1;
    if (t === 'string') {
      if (u >= 2 && u <= 20 && ratio <= 0.7) score = 100 - u;
    } else {
      if (u > 10) score = 50 + Math.min(50, u / 10);
    }
    if (score > best) {
      best = score;
      targetColumn = c;
      modelType = t === 'string' && u <= 20 ? 'classification' : 'regression';
    }
  }
  const features = candidate.filter((c) => c !== targetColumn).filter((c) => {
    const t = schema.find((x) => x.name === c)?.type || 'string';
    if (t === 'number') return true;
    return uniqCount(rows, c) <= 50;
  });
  let testSplit = 0.2;
  if (n < 500) testSplit = 0.3; else if (n > 3000) testSplit = 0.15;
  const epochs = Math.max(8, Math.min(20, Math.round(8000 / Math.max(200, n))));
  const batchSize = n < 1000 ? 32 : n < 4000 ? 64 : 128;
  const plan = {
    targetColumn,
    modelType,
    features: features.length ? features : cols.filter((c) => c !== targetColumn),
    params: { testSplit, epochs, batchSize },
    scriptLanguage: 'python' as const,
  };
  return plan;
}

function buildPythonScript(plan: Omit<Plan, 'script'>, schema: SchemaCol[]) {
  const t = plan.targetColumn;
  const feats = plan.features;
  const numeric = schema.filter((c) => c.type === 'number').map((c) => c.name).filter((c) => feats.includes(c));
  const categorical = schema.filter((c) => c.type === 'string').map((c) => c.name).filter((c) => feats.includes(c));
  const isClassification = plan.modelType === 'classification';
  const modelLine = isClassification ? "LogisticRegression(max_iter=1000)" : "LinearRegression()";
  return `import pandas as pd\nimport numpy as np\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.preprocessing import OneHotEncoder, StandardScaler\nfrom sklearn.compose import ColumnTransformer\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.linear_model import ${isClassification ? 'LogisticRegression' : 'LinearRegression'}\nfrom sklearn.metrics import ${isClassification ? 'accuracy_score' : 'mean_absolute_error, mean_squared_error'}\n\n# df = pd.read_csv('your_dataset.csv')\n# Replace the above line with your CSV path\n\nfeatures = ${JSON.stringify(feats)}\ntarget = '${t}'\n\nX = df[features].copy()\ny = df[target].copy()\n\nnumeric_features = ${JSON.stringify(numeric)}\ncategorical_features = ${JSON.stringify(categorical)}\n\npreprocess = ColumnTransformer(\n    transformers=[\n        ('num', StandardScaler(with_mean=True, with_std=True), numeric_features),\n        ('cat', OneHotEncoder(handle_unknown='ignore'), categorical_features)\n    ]\n)\n\nmodel = ${modelLine}\n\nclf = Pipeline(steps=[('preprocess', preprocess), ('model', model)])\n\nX_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=${plan.params.testSplit}, random_state=42, stratify=y if ${isClassification ? 'True' : 'False'} else None\n)\n\nclf.fit(X_train, y_train)\n\ny_pred = clf.predict(X_test)\n${isClassification ? 'print("accuracy:", accuracy_score(y_test, y_pred))' : 'print("mae:", mean_absolute_error(y_test, y_pred));\nrmse = np.sqrt(mean_squared_error(y_test, y_pred));\nprint("rmse:", rmse)'}\n`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const schema: SchemaCol[] = Array.isArray(body?.schema) ? body.schema : [];
    const sampleRows: any[] = Array.isArray(body?.sampleRows) ? body.sampleRows : [];
    const limitedRows = sampleRows.slice(0, 100);
    if (!schema.length || !limitedRows.length) {
      return NextResponse.json({ success: false, error: 'schema and sampleRows are required' }, { status: 400 });
    }

    const responseSchema = {
      type: 'object',
      properties: {
        targetColumn: { type: 'string' },
        modelType: { enum: ['classification', 'regression'] },
        features: { type: 'array', items: { type: 'string' } },
        params: {
          type: 'object',
          properties: {
            testSplit: { type: 'number' },
            epochs: { type: 'integer' },
            batchSize: { type: 'integer' }
          },
          required: ['testSplit', 'epochs', 'batchSize']
        },
        scriptLanguage: { enum: ['python'] },
        script: { type: 'string' },
        rationale: { type: 'string' },
        constraintsUsed: { type: 'array', items: { type: 'string' } }
      },
      required: ['targetColumn', 'modelType', 'features', 'params', 'scriptLanguage', 'script']
    };

    const colSummary = schema.map((c) => `${c.name}:${c.type}`).join(', ');
    const prompt = `You are a high-level data scientist. Analyze the dataset schema and sample to propose a professional training strategy.
    
    Schema: ${colSummary}
    Sample (first ${limitedRows.length}): ${JSON.stringify(limitedRows).slice(0, 12000)}

    Requirements:
    1. Select optimal targetColumn, modelType (classification/regression), and features.
    2. Suggest params (testSplit, epochs, batchSize).
    3. Generate a standalone Python script that:
       - Includes !pip install for required libraries.
       - Contains a placeholder cell for data loading (from CSV).
       - Implements robust preprocessing using scikit-learn ColumnTransformer (scaling numeric, one-hot encoding categorical).
       - Build a suitable scikit-learn pipeline (LogisticRegression for classification, LinearRegression for regression).
       - Includes evaluation metrics and code to print a professional report.
    4. Provide a 'rationale' explaining why these choices were made.
    
    Return strictly valid JSON.`;

    let plan: Plan | null = null;
    try {
      const ai = await SimpleAI.generateWithSchema<Plan>({
        prompt,
        schema: responseSchema,
        temperature: 0.2,
        maxTokens: 3000,
      });
      plan = ai;
    } catch (e) { }

    if (!plan) {
      const base = suggestPlan(schema, limitedRows);
      const script = buildPythonScript(base, schema);
      plan = { ...base, script } as Plan;
    }

    return NextResponse.json({ success: true, plan });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to generate plan' }, { status: 500 });
  }
}
