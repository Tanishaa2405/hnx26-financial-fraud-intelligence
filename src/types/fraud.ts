export interface RawTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;
  timestamp: string;
  merchant: string;
  merchant_category: string;
  device_id: string;
  location: string;
  payment_channel: string;
}

export type RiskLevel = 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Critical Risk';

export interface ScoredTransaction extends RawTransaction {
  risk_score: number;
  risk_level: RiskLevel;
  classification: 'Normal' | 'Suspicious';
  status: 'Approved' | 'Monitored' | 'Under Review' | 'Flagged';
  recommended_action: string;
  reasons: string[];
  anomaly_flags: string[];
  ml_anomaly_score: number;
  engineered_features: Record<string, any>;
}

export interface AccountSummary {
  account_id: string;
  transaction_count: number;
  total_value: number;
  average_value: number;
  risk_score: number;
  risk_level: 'Low' | 'Medium' | 'High' | 'Critical';
  suspicious_transaction_count: number;
  devices_used: string[];
  merchants_used: string[];
  locations_used: string[];
  related_accounts: string[];
}

export interface NetworkNode {
  id: string;
  label: string;
  type: 'account' | 'device' | 'merchant' | 'location';
  risk_score: number;
  meta?: Record<string, any>;
}

export interface NetworkEdge {
  source: string;
  target: string;
  relationship: string;
  weight: number;
  is_suspicious: boolean;
}

export interface DetectedRing {
  ring_id: string;
  shared_device: string;
  account_count: number;
  accounts: string[];
  common_merchants: string[];
  description: string;
}

export interface FraudAlert {
  alert_id: string;
  transaction_id: string;
  account_id: string;
  amount: number;
  merchant: string;
  device_id: string;
  location: string;
  timestamp: string;
  risk_score: number;
  risk_level: RiskLevel;
  reasons: string[];
  anomaly_flags: string[];
  recommended_action: string;
}

export interface FraudAnalysisResult {
  summary: {
    total_transactions: number;
    suspicious_transactions: number;
    high_risk_accounts: number;
    critical_alerts: number;
    average_risk_score: number;
    risk_distribution: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    detected_rings_count: number;
  };
  transactions: ScoredTransaction[];
  alerts: FraudAlert[];
  accounts: AccountSummary[];
  network: {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
    detected_rings: DetectedRing[];
  };
  engine_meta?: {
    engine: string;
    timestamp: string;
  };
}

export interface AIExplainResponse {
  success: boolean;
  explanation: string;
  source: string;
  risk_score?: number;
  risk_level?: string;
  note?: string;
}
