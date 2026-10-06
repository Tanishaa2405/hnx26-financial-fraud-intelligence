/**
 * Native TypeScript twin implementation of the HNX26 Fraud Detection Engine.
 * Provides identical mathematical feature engineering, Isolation Forest surrogate scoring,
 * deterministic evidence generation, and fraud ring network clustering.
 */

import { RawTransaction } from './demoGenerator';

export interface ScoredTransaction extends RawTransaction {
  risk_score: number;
  risk_level: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Critical Risk';
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
  alerts: Array<{
    alert_id: string;
    transaction_id: string;
    account_id: string;
    amount: number;
    merchant: string;
    device_id: string;
    location: string;
    timestamp: string;
    risk_score: number;
    risk_level: string;
    reasons: string[];
    anomaly_flags: string[];
    recommended_action: string;
  }>;
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

const HIGH_RISK_CATEGORIES = new Set([
  'cryptocurrency',
  'wire transfer',
  'gambling',
  'gift cards',
  'jewelry',
  'money transfer',
]);

export function runNativeFraudEngine(rawTransactions: RawTransaction[]): FraudAnalysisResult {
  if (!rawTransactions || rawTransactions.length === 0) {
    throw new Error('Transaction dataset is empty.');
  }

  // 1. Clean and normalize
  const txns = rawTransactions.map((t, idx) => ({
    transaction_id: String(t.transaction_id || `TXN_${idx}`).trim(),
    account_id: String(t.account_id || 'ACC_UNKNOWN').trim(),
    amount: Number(t.amount) || 0,
    timestamp: String(t.timestamp || new Date().toISOString()).trim(),
    merchant: String(t.merchant || 'Unknown Merchant').trim(),
    merchant_category: String(t.merchant_category || 'General').trim(),
    device_id: String(t.device_id || 'DEV_UNKNOWN').trim(),
    location: String(t.location || 'Unknown Location').trim(),
    payment_channel: String(t.payment_channel || 'other').trim(),
  }));

  // Sort chronologically
  txns.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // 2. Build aggregate baselines
  const accountAmounts: Record<string, number[]> = {};
  const deviceToAccounts: Record<string, Set<string>> = {};
  const merchantToAccounts: Record<string, Set<string>> = {};
  const accountTxnsMap: Record<string, Array<{ time: number; amount: number; id: string }>> = {};

  txns.forEach((t) => {
    if (!accountAmounts[t.account_id]) accountAmounts[t.account_id] = [];
    accountAmounts[t.account_id].push(t.amount);

    if (!deviceToAccounts[t.device_id]) deviceToAccounts[t.device_id] = new Set();
    deviceToAccounts[t.device_id].add(t.account_id);

    if (!merchantToAccounts[t.merchant]) merchantToAccounts[t.merchant] = new Set();
    merchantToAccounts[t.merchant].add(t.account_id);

    if (!accountTxnsMap[t.account_id]) accountTxnsMap[t.account_id] = [];
    accountTxnsMap[t.account_id].push({
      time: new Date(t.timestamp).getTime(),
      amount: t.amount,
      id: t.transaction_id,
    });
  });

  // Calculate account means and standard deviations
  const accountStats: Record<string, { mean: number; std: number; count: number }> = {};
  Object.keys(accountAmounts).forEach((acc) => {
    const list = accountAmounts[acc];
    const n = list.length;
    const mean = list.reduce((a, b) => a + b, 0) / n;
    let variance = 0;
    if (n > 1) {
      variance = list.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1);
    }
    accountStats[acc] = {
      mean,
      std: Math.sqrt(variance),
      count: n,
    };
  });

  // Track seen devices and locations per account
  const seenAccountDevices: Record<string, Set<string>> = {};
  const seenAccountLocations: Record<string, Set<string>> = {};
  const accountLastSeenTime: Record<string, number> = {};

  const scoredTransactions: ScoredTransaction[] = [];

  // 3. Score each transaction
  txns.forEach((txn) => {
    const acc = txn.account_id;
    const amt = txn.amount;
    const dev = txn.device_id;
    const loc = txn.location;
    const cat = txn.merchant_category.toLowerCase();
    const txnTime = new Date(txn.timestamp).getTime();
    const dateObj = new Date(txn.timestamp);

    const stats = accountStats[acc] || { mean: amt, std: 0, count: 1 };
    const meanAmt = stats.mean;

    const reasons: string[] = [];
    const anomalyFlags: string[] = [];
    let rulePenalty = 0;

    // Feature: Shared Device / Fraud Ring
    const sharedAccounts = Array.from(deviceToAccounts[dev] || []);
    const sharedCount = sharedAccounts.length;
    if (sharedCount >= 3) {
      rulePenalty += 40;
      reasons.push(
        `Device '${dev}' is shared across ${sharedCount} separate accounts (${sharedAccounts.slice(0, 3).join(', ')}${
          sharedCount > 3 ? '...' : ''
        }), indicating potential fraud ring or automated botnet.`
      );
      anomalyFlags.push('SHARED_DEVICE_RING');
    } else if (sharedCount === 2) {
      rulePenalty += 20;
      const otherAcc = sharedAccounts.find((a) => a !== acc) || 'another account';
      reasons.push(`Device '${dev}' is shared with another distinct account (${otherAcc}).`);
      anomalyFlags.push('SHARED_DEVICE_PAIR');
    }

    // Feature: Amount anomaly vs Account baseline
    if (meanAmt > 0) {
      const ratio = amt / meanAmt;
      if (ratio >= 8.0 && amt > 500) {
        rulePenalty += 35;
        reasons.push(
          `Transaction amount ($${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}) is ${ratio.toFixed(
            1
          )}x higher than this account's historical average ($${meanAmt.toFixed(2)}).`
        );
        anomalyFlags.push('EXTREME_AMOUNT_SPIKE');
      } else if (ratio >= 3.5 && amt > 250) {
        rulePenalty += 22;
        reasons.push(
          `Transaction amount ($${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}) is ${ratio.toFixed(
            1
          )}x above typical account expenditure ($${meanAmt.toFixed(2)}).`
        );
        anomalyFlags.push('UNUSUAL_AMOUNT');
      }
    }

    // Feature: Velocity Burst (transactions within 5 minutes)
    const recentTxns5m = (accountTxnsMap[acc] || []).filter(
      (ot) => Math.abs(txnTime - ot.time) <= 300000
    );
    const burstCount = recentTxns5m.length;

    let timeDiffSec = 86400;
    if (accountLastSeenTime[acc] !== undefined) {
      timeDiffSec = Math.max(0, (txnTime - accountLastSeenTime[acc]) / 1000);
    }
    accountLastSeenTime[acc] = txnTime;

    if (burstCount >= 4) {
      rulePenalty += 30;
      reasons.push(`High-frequency burst: ${burstCount} transactions initiated within a 5-minute window.`);
      anomalyFlags.push('HIGH_VELOCITY_BURST');
    } else if (burstCount >= 2 && timeDiffSec < 90) {
      rulePenalty += 18;
      reasons.push(`Rapid succession: Previous transaction occurred only ${Math.round(timeDiffSec)} seconds ago.`);
      anomalyFlags.push('RAPID_TRANSACTION');
    }

    // Feature: Card testing pattern (multiple rapid small transactions under $30)
    const smallBursts = recentTxns5m.filter((t) => t.amount < 30.0);
    if (smallBursts.length >= 3 && amt < 30.0) {
      rulePenalty += 26;
      reasons.push(
        `Repetitive micro-authorization pattern ($${amt.toFixed(
          2
        )}) within seconds, characteristic of automated card testing.`
      );
      anomalyFlags.push('CARD_TESTING_PATTERN');
    }

    // Feature: High-Risk Category & Off-hours
    const isHighRiskCat = Array.from(HIGH_RISK_CATEGORIES).some((hrc) => cat.includes(hrc));
    const hours = dateObj.getUTCHours();
    const isNight = hours >= 1 && hours <= 5;

    if (isHighRiskCat) {
      if (isNight) {
        rulePenalty += 24;
        reasons.push(
          `High-risk category '${txn.merchant_category}' executed during off-peak night hours (${String(
            hours
          ).padStart(2, '0')}:${String(dateObj.getUTCMinutes()).padStart(2, '0')} UTC).`
        );
        anomalyFlags.push('OFF_HOURS_HIGH_RISK');
      } else {
        rulePenalty += 12;
        reasons.push(`Merchant category '${txn.merchant_category}' carries heightened chargeback and fraud risk.`);
        anomalyFlags.push('HIGH_RISK_CATEGORY');
      }
    }

    // Feature: Unfamiliar device or geographical location switch
    if (!seenAccountDevices[acc]) seenAccountDevices[acc] = new Set();
    if (!seenAccountLocations[acc]) seenAccountLocations[acc] = new Set();

    const isNewDev = seenAccountDevices[acc].size > 0 && !seenAccountDevices[acc].has(dev);
    const isNewLoc = seenAccountLocations[acc].size > 0 && !seenAccountLocations[acc].has(loc);

    seenAccountDevices[acc].add(dev);
    seenAccountLocations[acc].add(loc);

    if (isNewDev && isNewLoc) {
      rulePenalty += 16;
      reasons.push(`Simultaneous new device '${dev}' and unfamiliar geographic location '${loc}'.`);
      anomalyFlags.push('NEW_DEVICE_AND_LOCATION');
    } else if (isNewLoc) {
      rulePenalty += 9;
      reasons.push(`Transaction originated from uncharacteristic location '${loc}'.`);
      anomalyFlags.push('LOCATION_ANOMALY');
    }

    // Baseline ML anomaly score estimate
    const mlScore = Math.min(
      Math.max((rulePenalty / 60) * 0.7 + (amt > 2000 ? 0.3 : 0.05), 0.02),
      0.98
    );

    let riskScore = 15;
    if (reasons.length === 0) {
      reasons.push(
        'Transaction patterns match normal baseline behavior (amount, device, and timing within expected thresholds).'
      );
      anomalyFlags.push('NORMAL_PATTERN');
      riskScore = Math.min(Math.max(Math.round(amt > 1500 ? 25 : 12), 5), 28);
    } else {
      riskScore = Math.min(Math.max(Math.round(rulePenalty + mlScore * 20), 10), 99);
    }

    let riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk' | 'Critical Risk';
    let classification: 'Normal' | 'Suspicious';
    let status: 'Approved' | 'Monitored' | 'Under Review' | 'Flagged';
    let recommendedAction: string;

    if (riskScore >= 80) {
      riskLevel = 'Critical Risk';
      classification = 'Suspicious';
      status = 'Flagged';
      recommendedAction = 'Escalate for manual review and consider immediate account temporary freeze';
    } else if (riskScore >= 60) {
      riskLevel = 'High Risk';
      classification = 'Suspicious';
      status = 'Under Review';
      recommendedAction = 'Review transaction evidence and verify identity with account holder';
    } else if (riskScore >= 30) {
      riskLevel = 'Medium Risk';
      classification = 'Normal';
      status = 'Monitored';
      recommendedAction = 'Temporarily monitor account for follow-up anomalous activity';
    } else {
      riskLevel = 'Low Risk';
      classification = 'Normal';
      status = 'Approved';
      recommendedAction = 'No action required - transaction within standard profile';
    }

    scoredTransactions.push({
      ...txn,
      risk_score: riskScore,
      risk_level: riskLevel,
      classification,
      status,
      recommended_action: recommendedAction,
      reasons,
      anomaly_flags: anomalyFlags,
      ml_anomaly_score: Math.round(mlScore * 100) / 100,
      engineered_features: {
        burst_count_5m: burstCount,
        time_diff_sec: Math.round(timeDiffSec),
        shared_device_accounts: sharedCount,
        is_high_risk_cat: isHighRiskCat ? 1 : 0,
        is_night: isNight ? 1 : 0,
        is_new_device: isNewDev ? 1 : 0,
        is_new_location: isNewLoc ? 1 : 0,
      },
    });
  });

  // 4. Accounts summary
  const accountGroups: Record<string, ScoredTransaction[]> = {};
  scoredTransactions.forEach((t) => {
    if (!accountGroups[t.account_id]) accountGroups[t.account_id] = [];
    accountGroups[t.account_id].push(t);
  });

  const accountsSummary: AccountSummary[] = Object.keys(accountGroups).map((accId) => {
    const list = accountGroups[accId];
    const totalVal = list.reduce((s, t) => s + t.amount, 0);
    const count = list.length;
    const avgVal = totalVal / count;
    const maxRisk = Math.max(...list.map((t) => t.risk_score));
    const avgRisk = list.reduce((s, t) => s + t.risk_score, 0) / count;
    const accRisk = Math.min(Math.round(maxRisk * 0.7 + avgRisk * 0.3), 100);

    const devices = Array.from(new Set(list.map((t) => t.device_id))).sort();
    const merchants = Array.from(new Set(list.map((t) => t.merchant))).sort();
    const locations = Array.from(new Set(list.map((t) => t.location))).sort();

    const relatedAccounts = new Set<string>();
    devices.forEach((dev) => {
      const sharing = deviceToAccounts[dev] || new Set();
      sharing.forEach((other) => {
        if (other !== accId) relatedAccounts.add(other);
      });
    });

    let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    if (accRisk >= 80) riskLevel = 'Critical';
    else if (accRisk >= 60) riskLevel = 'High';
    else if (accRisk >= 30) riskLevel = 'Medium';
    else riskLevel = 'Low';

    return {
      account_id: accId,
      transaction_count: count,
      total_value: Math.round(totalVal * 100) / 100,
      average_value: Math.round(avgVal * 100) / 100,
      risk_score: accRisk,
      risk_level: riskLevel,
      suspicious_transaction_count: list.filter((t) => t.risk_score >= 60).length,
      devices_used: devices,
      merchants_used: merchants,
      locations_used: locations,
      related_accounts: Array.from(relatedAccounts).sort(),
    };
  });

  accountsSummary.sort((a, b) => b.risk_score - a.risk_score);

  // 5. Fraud network nodes and links
  const nodesMap: Record<string, NetworkNode> = {};
  const edges: NetworkEdge[] = [];
  const edgeKeys = new Set<string>();

  const addNode = (id: string, label: string, type: NetworkNode['type'], risk: number, meta?: any) => {
    if (!nodesMap[id]) {
      nodesMap[id] = { id, label, type, risk_score: risk, meta };
    } else {
      nodesMap[id].risk_score = Math.max(nodesMap[id].risk_score, risk);
    }
  };

  const addEdge = (source: string, target: string, relationship: string, isSuspicious: boolean) => {
    const key = [source, target].sort().join('::') + `::${relationship}`;
    if (!edgeKeys.has(key)) {
      edgeKeys.add(key);
      edges.push({
        source,
        target,
        relationship,
        weight: 1,
        is_suspicious: isSuspicious,
      });
    }
  };

  const sharedDevs = Object.keys(deviceToAccounts).filter((dev) => (deviceToAccounts[dev]?.size || 0) > 1);

  scoredTransactions.forEach((t) => {
    const isDevShared = (deviceToAccounts[t.device_id]?.size || 0) > 1;
    addNode(t.account_id, t.account_id, 'account', t.risk_score);
    addNode(
      t.device_id,
      `Dev: ${t.device_id}`,
      'device',
      isDevShared ? 85 : 20,
      { shared_count: deviceToAccounts[t.device_id]?.size || 1 }
    );
    addNode(t.merchant, t.merchant, 'merchant', Math.min(t.risk_score, 70), { category: t.merchant_category });
    addNode(t.location, t.location, 'location', Math.min(t.risk_score, 60));

    addEdge(t.account_id, t.device_id, 'USES_DEVICE', isDevShared);
    addEdge(t.account_id, t.merchant, 'TRANSACTED_AT', t.risk_score >= 60);
    addEdge(t.account_id, t.location, 'LOCATED_IN', t.risk_score >= 70);
  });

  // Detect fraud rings
  const detectedRings: DetectedRing[] = [];
  let ringIndex = 1;
  sharedDevs.forEach((dev) => {
    const accs = Array.from(deviceToAccounts[dev] || []);
    if (accs.length >= 2) {
      const merchCounts: Record<string, number> = {};
      scoredTransactions.forEach((t) => {
        if (accs.includes(t.account_id)) {
          merchCounts[t.merchant] = (merchCounts[t.merchant] || 0) + 1;
        }
      });
      const commonMerchants = Object.keys(merchCounts).filter((m) => merchCounts[m] >= 2);

      detectedRings.push({
        ring_id: `RING_${ringIndex++}`,
        shared_device: dev,
        account_count: accs.length,
        accounts: accs.sort(),
        common_merchants: commonMerchants,
        description: `Coordinated cluster: ${accs.length} accounts share device '${dev}'${
          commonMerchants.length > 0 ? ` with target merchant '${commonMerchants[0]}'` : ''
        }`,
      });
    }
  });

  // 6. Summary metrics & alerts
  const totalTxns = scoredTransactions.length;
  const suspiciousTxns = scoredTransactions.filter((t) => t.risk_score >= 60);
  const criticalAlerts = scoredTransactions.filter((t) => t.risk_score >= 80);
  const highRiskAccounts = accountsSummary.filter((a) => a.risk_score >= 60);
  const avgRisk = totalTxns > 0 ? scoredTransactions.reduce((s, t) => s + t.risk_score, 0) / totalTxns : 0;

  const alerts = suspiciousTxns
    .sort((a, b) => b.risk_score - a.risk_score)
    .map((t) => ({
      alert_id: `ALT_${t.transaction_id}`,
      transaction_id: t.transaction_id,
      account_id: t.account_id,
      amount: t.amount,
      merchant: t.merchant,
      device_id: t.device_id,
      location: t.location,
      timestamp: t.timestamp,
      risk_score: t.risk_score,
      risk_level: t.risk_level,
      reasons: t.reasons,
      anomaly_flags: t.anomaly_flags,
      recommended_action: t.recommended_action,
    }));

  return {
    summary: {
      total_transactions: totalTxns,
      suspicious_transactions: suspiciousTxns.length,
      high_risk_accounts: highRiskAccounts.length,
      critical_alerts: criticalAlerts.length,
      average_risk_score: Math.round(avgRisk * 10) / 10,
      risk_distribution: {
        low: scoredTransactions.filter((t) => t.risk_score < 30).length,
        medium: scoredTransactions.filter((t) => t.risk_score >= 30 && t.risk_score < 60).length,
        high: scoredTransactions.filter((t) => t.risk_score >= 60 && t.risk_score < 80).length,
        critical: scoredTransactions.filter((t) => t.risk_score >= 80).length,
      },
      detected_rings_count: detectedRings.length,
    },
    transactions: scoredTransactions,
    alerts,
    accounts: accountsSummary,
    network: {
      nodes: Object.values(nodesMap),
      edges,
      detected_rings: detectedRings,
    },
    engine_meta: {
      engine: 'HNX26-Hybrid-Engine',
      timestamp: new Date().toISOString(),
    },
  };
}
