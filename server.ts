import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { generateRealisticDemoTransactions, RawTransaction } from './backend/demoGenerator';
import { runNativeFraudEngine, FraudAnalysisResult, ScoredTransaction } from './backend/nativeFraudEngine';
import { plaidService } from './services/plaid/plaidService';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory cache of current analysis results
let currentDataset: FraudAnalysisResult | null = null;

function getOrInitDataset(): FraudAnalysisResult {
  if (!currentDataset) {
    const initialDemo = generateRealisticDemoTransactions();
    currentDataset = runNativeFraudEngine(initialDemo);
    currentDataset.engine_meta = {
      engine: 'HNX26 Native Anomaly & Syndicate Engine',
      timestamp: new Date().toISOString(),
    };
  }
  return currentDataset;
}

// Initial warm-up with realistic demo dataset
try {
  getOrInitDataset();
} catch (e) {
  console.error('Initial dataset generation failed:', e);
}

// Initialize Gemini Client server-side
let geminiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Could not initialize GoogleGenAI client:', err);
  }
}

/**
 * Executes the Python fraud engine via child process with pure stdin/stdout pipe.
 * Falls back to Native TypeScript engine if python process fails or times out.
 */
async function executeFraudPipeline(transactions: RawTransaction[]): Promise<FraudAnalysisResult> {
  const pythonPath = path.join(process.cwd(), 'python', 'fraud_engine.py');

  if (fs.existsSync(pythonPath)) {
    const pythonCmds = process.env.PYTHON_PATH
      ? [process.env.PYTHON_PATH]
      : process.platform === 'win32'
      ? ['python', 'py', 'python3']
      : ['python3', 'python'];

    for (const cmd of pythonCmds) {
      try {
        const pythonResult = await new Promise<FraudAnalysisResult>((resolve, reject) => {
          const pyProc = spawn(cmd, [pythonPath, '-'], {
            timeout: 10000,
          });

          let stdoutData = '';
          let stderrData = '';

          pyProc.stdout.on('data', (data) => {
            stdoutData += data.toString();
          });

          pyProc.stderr.on('data', (data) => {
            stderrData += data.toString();
          });

          pyProc.on('error', (err) => {
            reject(err);
          });

          pyProc.on('close', (code) => {
            if (code === 0 && stdoutData.trim()) {
              try {
                const res = JSON.parse(stdoutData.trim());
                if (res.success && res.data) {
                  res.data.engine_meta = {
                    engine: 'Python 3 (scikit-learn / Isolation Forest Pipeline)',
                    timestamp: new Date().toISOString(),
                  };
                  return resolve(res.data);
                }
              } catch (parseErr) {
                // json parse failure
              }
            }
            reject(new Error(stderrData || `Python exited with code ${code}`));
          });

          pyProc.stdin.write(JSON.stringify(transactions));
          pyProc.stdin.end();
        });

        return pythonResult;
      } catch (pyError: any) {
        console.warn(`[Pipeline] Python command "${cmd}" failed: ${pyError.message || pyError}`);
      }
    }

    console.warn(`[Pipeline] Python engine returned error or was unavailable. Seamlessly engaging Native TypeScript Fraud Engine.`);
  }

  // Fallback to Native TypeScript Twin Engine
  const nativeResult = runNativeFraudEngine(transactions);
  nativeResult.engine_meta = {
    engine: 'Native High-Performance Anomaly & Network Engine',
    timestamp: new Date().toISOString(),
  };
  return nativeResult;
}

// Initial warm-up with realistic demo dataset
try {
  const initialDemo = generateRealisticDemoTransactions();
  currentDataset = runNativeFraudEngine(initialDemo);
} catch (e) {
  console.error('Initial dataset generation failed:', e);
}

// ==========================================
// REST API ROUTES
// ==========================================

// Parse CSV text to transaction array
function parseCsvToTransactions(csvContent: string): RawTransaction[] {
  const lines = csvContent.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV file contains no transaction data rows.');
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const required = ['transaction_id', 'account_id', 'amount', 'timestamp', 'merchant', 'merchant_category', 'device_id', 'location', 'payment_channel'];
  const missing = required.filter((r) => !headers.includes(r));
  if (missing.length > 0) {
    throw new Error(`CSV is missing required columns: ${missing.join(', ')}`);
  }

  const records: RawTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Basic CSV splitting (supporting simple quoted fields)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length < headers.length) continue;

    const rowObj: any = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] || '';
    });

    records.push({
      transaction_id: rowObj.transaction_id,
      account_id: rowObj.account_id,
      amount: parseFloat(rowObj.amount) || 0,
      timestamp: rowObj.timestamp,
      merchant: rowObj.merchant,
      merchant_category: rowObj.merchant_category,
      device_id: rowObj.device_id,
      location: rowObj.location,
      payment_channel: rowObj.payment_channel,
    });
  }

  return records;
}

// Health & Status endpoint for Render / monitoring
app.get(['/api/health', '/api/status', '/healthz'], (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    success: true,
    platform: 'HNX26 Fraud Intelligence Platform',
    timestamp: new Date().toISOString(),
    engine: currentDataset?.engine_meta?.engine || 'HNX26 Native Anomaly & Syndicate Engine',
  });
});

// 1. POST /api/analyze - Accepts CSV text or JSON transactions
app.post('/api/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    let transactions: RawTransaction[] = [];

    if (req.body.csv && typeof req.body.csv === 'string') {
      transactions = parseCsvToTransactions(req.body.csv);
    } else if (Array.isArray(req.body.transactions)) {
      transactions = req.body.transactions;
    } else {
      res.status(400).json({ success: false, error: 'Request body must contain either "csv" string or "transactions" array.' });
      return;
    }

    if (transactions.length === 0) {
      res.status(400).json({ success: false, error: 'No transactions found in request payload.' });
      return;
    }

    const result = await executeFraudPipeline(transactions);
    currentDataset = result;
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Analysis failed' });
  }
});

// 2. POST /api/generate-demo-data - Generates rich synthetic demo data
app.post('/api/generate-demo-data', async (_req: Request, res: Response): Promise<void> => {
  try {
    const rawDemo = generateRealisticDemoTransactions();
    const result = await executeFraudPipeline(rawDemo);
    currentDataset = result;
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET /api/transactions - Returns scored transactions
app.get('/api/transactions', (_req: Request, res: Response): void => {
  const dataset = getOrInitDataset();
  res.json({ success: true, data: dataset.transactions, summary: dataset.summary });
});

// 4. GET /api/alerts - Returns fraud alerts
app.get('/api/alerts', (_req: Request, res: Response): void => {
  const dataset = getOrInitDataset();
  res.json({ success: true, data: dataset.alerts });
});

// 5. GET /api/accounts/:id - Returns account profile and investigation data
app.get('/api/accounts/:id', (req: Request, res: Response): void => {
  const dataset = getOrInitDataset();
  const accountId = req.params.id;
  const account = dataset.accounts.find((a) => a.account_id === accountId);
  if (!account) {
    res.status(404).json({ success: false, error: `Account '${accountId}' not found in active dataset.` });
    return;
  }

  const txns = dataset.transactions.filter((t) => t.account_id === accountId);
  res.json({
    success: true,
    data: {
      account,
      transactions: txns,
    },
  });
});

// 6. GET /api/network - Returns relationship graph nodes, edges, rings
app.get('/api/network', (_req: Request, res: Response): void => {
  const dataset = getOrInitDataset();
  res.json({ success: true, data: dataset.network });
});

// 7. POST /api/ai/explain - Gemini AI explanation of already-generated fraud findings
app.post('/api/ai/explain', async (req: Request, res: Response): Promise<void> => {
  try {
    const { transaction, question } = req.body;
    if (!transaction || !transaction.transaction_id) {
      res.status(400).json({ success: false, error: 'Missing transaction data in explanation request.' });
      return;
    }

    const reasonsText = Array.isArray(transaction.reasons) ? transaction.reasons.join('; ') : 'No specific anomaly noted.';
    const flagsText = Array.isArray(transaction.anomaly_flags) ? transaction.anomaly_flags.join(', ') : 'None';

    const deterministicFallback = `This transaction (${transaction.transaction_id}) was assigned a risk score of ${transaction.risk_score}/100 (${transaction.risk_level}) by the anomaly engine because: ${reasonsText} Recommended procedural action: ${transaction.recommended_action || 'Review transaction'}.`;

    if (!geminiClient) {
      res.json({
        success: true,
        explanation: deterministicFallback,
        source: 'deterministic_engine',
        note: 'Gemini API key not configured or initialized; provided deterministic evidence directly.',
      });
      return;
    }

    const prompt = `
Question from Investigator: "${question || 'Why was this transaction flagged?'}"

Verified Transaction Facts:
- Transaction ID: ${transaction.transaction_id}
- Account ID: ${transaction.account_id}
- Amount: $${Number(transaction.amount).toFixed(2)}
- Timestamp: ${transaction.timestamp}
- Merchant: ${transaction.merchant} (${transaction.merchant_category})
- Device ID: ${transaction.device_id}
- Geographic Location: ${transaction.location}
- Payment Channel: ${transaction.payment_channel}

Deterministic Engine Output:
- Risk Score: ${transaction.risk_score} / 100
- Risk Classification: ${transaction.risk_level}
- Confirmed Anomaly Signals: ${flagsText}
- Verified Reasons: ${reasonsText}
- Recommended Action: ${transaction.recommended_action}

Instructions:
1. Explain concisely (2-4 sentences) why this transaction was flagged.
2. Ground your entire answer strictly and exclusively in the supplied verified reasons and transaction facts.
3. NEVER make up or extrapolate facts that are not present.
4. Conclude with the recommended investigative step.
`;

    const response = await geminiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are an expert financial fraud intelligence assistant. You explain already-calculated fraud scores based strictly on provided deterministic evidence. You never fabricate facts or override scores.',
        temperature: 0.2,
      },
    });

    const explanationText = response.text || deterministicFallback;

    res.json({
      success: true,
      explanation: explanationText.trim(),
      source: 'gemini-3.8-flash',
      risk_score: transaction.risk_score,
      risk_level: transaction.risk_level,
    });
  } catch (err: any) {
    console.warn('Gemini explanation failed, falling back to deterministic:', err.message);
    const txn = req.body?.transaction || {};
    const fallback = `This transaction was flagged with a risk score of ${txn.risk_score || 0}/100 (${txn.risk_level || 'Evaluated'}). Key reasons: ${(txn.reasons || []).join(' ')}`;
    res.json({
      success: true,
      explanation: fallback,
      source: 'deterministic_fallback',
    });
  }
});

// 8. Plaid Sandbox Routes
app.get('/api/plaid/status', (_req: Request, res: Response): void => {
  res.json({ success: true, data: plaidService.getStatus() });
});

app.post('/api/plaid/create-link-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.body.userId || 'user_demo_1';
    const result = await plaidService.createLinkToken(userId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/plaid/exchange-public-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { publicToken } = req.body;
    const tokenResult = await plaidService.exchangePublicToken(publicToken || 'mock_token');
    const transactions = await plaidService.fetchAndNormalizeTransactions(tokenResult.accessToken);
    const analysis = await executeFraudPipeline(transactions);
    currentDataset = analysis;
    res.json({
      success: true,
      tokenResult,
      analysis,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const SAMPLE_CSV_FALLBACK = `transaction_id,account_id,amount,timestamp,merchant,merchant_category,device_id,location,payment_channel
TXN_1001,ACC_101,42.50,2026-10-01T08:14:00Z,Whole Foods Market,Groceries,DEV_USR_101,Seattle WA,in_store
TXN_1002,ACC_101,15.20,2026-10-01T12:30:00Z,Starbucks Coffee,Dining,DEV_USR_101,Seattle WA,mobile_app
TXN_1003,ACC_101,89.99,2026-10-02T19:05:00Z,Target Superstore,Retail,DEV_USR_101,Seattle WA,in_store
TXN_1004,ACC_101,2450.00,2026-10-03T09:00:00Z,Avalon Property Management,Rent/Housing,DEV_USR_101,Seattle WA,web_portal
TXN_1005,ACC_101,54.10,2026-10-04T17:22:00Z,Shell Gasoline,Automotive,DEV_USR_101,Seattle WA,in_store
TXN_1013,ACC_201,9800.00,2026-10-04T03:15:00Z,Global Coin Vault,Cryptocurrency,DEV_UNKNOWN_99,Lagos Nigeria,web_portal
TXN_1016,ACC_301,450.00,2026-10-04T04:00:00Z,Luxury Gems Direct,Jewelry,DEV_RING_888,Miami FL,web_portal
TXN_1017,ACC_302,480.00,2026-10-04T04:02:10Z,Luxury Gems Direct,Jewelry,DEV_RING_888,Miami FL,web_portal
TXN_1025,ACC_501,12.00,2026-10-04T12:00:00Z,Speedy Cash Card Testing,Gift Cards,DEV_BOTNET_44,New York NY,web_portal
TXN_1026,ACC_501,12.00,2026-10-04T12:00:30Z,Speedy Cash Card Testing,Gift Cards,DEV_BOTNET_44,New York NY,web_portal`;

// Download sample CSV endpoint
app.get('/api/sample-csv', (_req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="transactions_sample.csv"');

  const samplePath = path.join(process.cwd(), 'sample-data', 'transactions_sample.csv');
  if (fs.existsSync(samplePath)) {
    fs.createReadStream(samplePath).pipe(res);
  } else {
    res.send(SAMPLE_CSV_FALLBACK);
  }
});

// Explicit 404 handler for API routes (always return JSON)
app.all('/api/*', (_req: Request, res: Response): void => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// Vite Middleware for Full-stack dev mode & Static Serving in Production
async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' || (fs.existsSync(distPath) && process.env.NODE_ENV !== 'development');

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HNX26 Fraud Intelligence] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

export default app;
export { app };
