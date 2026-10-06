import { FraudAnalysisResult, RawTransaction, ScoredTransaction, FraudAlert, AccountSummary, AIExplainResponse } from '../types/fraud';

const API_BASE = '/api';

export async function analyzeCsv(csv: string): Promise<FraudAnalysisResult> {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to analyze CSV');
  }
  return data.data;
}

export async function analyzeTransactions(transactions: RawTransaction[]): Promise<FraudAnalysisResult> {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactions }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to analyze transactions');
  }
  return data.data;
}

export async function generateDemoData(): Promise<FraudAnalysisResult> {
  const response = await fetch(`${API_BASE}/generate-demo-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to generate demo data');
  }
  return data.data;
}

export async function getTransactions(): Promise<{ transactions: ScoredTransaction[]; summary: any }> {
  const response = await fetch(`${API_BASE}/transactions`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch transactions');
  }
  return { transactions: data.data, summary: data.summary };
}

export async function getAlerts(): Promise<FraudAlert[]> {
  const response = await fetch(`${API_BASE}/alerts`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch alerts');
  }
  return data.data;
}

export async function getAccountDetails(accountId: string): Promise<{ account: AccountSummary; transactions: ScoredTransaction[] }> {
  const response = await fetch(`${API_BASE}/accounts/${encodeURIComponent(accountId)}`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || `Failed to fetch account ${accountId}`);
  }
  return data.data;
}

export async function getNetwork(): Promise<FraudAnalysisResult['network']> {
  const response = await fetch(`${API_BASE}/network`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to fetch network graph');
  }
  return data.data;
}

export async function explainTransactionWithAI(
  transaction: ScoredTransaction,
  question?: string
): Promise<AIExplainResponse> {
  const response = await fetch(`${API_BASE}/ai/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction, question }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to generate explanation');
  }
  return data;
}

export async function getPlaidStatus(): Promise<{ isConfigured: boolean; environment: string; statusMessage: string }> {
  const response = await fetch(`${API_BASE}/plaid/status`);
  const data = await response.json();
  return data.data;
}

export async function simulatePlaidSync(): Promise<FraudAnalysisResult> {
  const response = await fetch(`${API_BASE}/plaid/exchange-public-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicToken: 'public-sandbox-simulated-token' }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to sync Plaid transactions');
  }
  return data.analysis;
}
