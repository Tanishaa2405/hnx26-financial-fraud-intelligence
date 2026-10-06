import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Activity, 
  ArrowUpRight, 
  Clock, 
  DollarSign, 
  Network,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { FraudAnalysisResult, ScoredTransaction } from '../types/fraud';
import { RiskBadge } from '../components/RiskBadge';

interface OverviewViewProps {
  data: FraudAnalysisResult;
  onNavigateTab: (tab: any) => void;
  onSelectTransaction: (txn: ScoredTransaction) => void;
  onSelectAccount: (accountId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  data,
  onNavigateTab,
  onSelectTransaction,
  onSelectAccount,
}) => {
  const { summary, transactions, accounts, network } = data;
  const criticalList = transactions.filter((t) => t.risk_score >= 80);
  const suspiciousList = transactions.filter((t) => t.risk_score >= 60 && t.risk_score < 80);

  // Calculate volume & amounts
  const totalDollarVolume = transactions.reduce((s, t) => s + t.amount, 0);
  const suspiciousDollarVolume = transactions
    .filter((t) => t.risk_score >= 60)
    .reduce((s, t) => s + t.amount, 0);

  // Group by risk distribution percentages
  const totalCount = summary.total_transactions || 1;
  const dist = summary.risk_distribution || { low: 0, medium: 0, high: 0, critical: 0 };
  const lowPct = Math.round((dist.low / totalCount) * 100);
  const medPct = Math.round((dist.medium / totalCount) * 100);
  const highPct = Math.round((dist.high / totalCount) * 100);
  const critPct = Math.round((dist.critical / totalCount) * 100);

  // Timeline bucketing (chronological)
  const timeBuckets: Record<string, { total: number; suspicious: number; volume: number }> = {};
  transactions.forEach((t) => {
    const dateStr = t.timestamp ? t.timestamp.substring(0, 10) : '2026-10-04';
    if (!timeBuckets[dateStr]) {
      timeBuckets[dateStr] = { total: 0, suspicious: 0, volume: 0 };
    }
    timeBuckets[dateStr].total += 1;
    timeBuckets[dateStr].volume += t.amount;
    if (t.risk_score >= 60) {
      timeBuckets[dateStr].suspicious += 1;
    }
  });
  const bucketKeys = Object.keys(timeBuckets).sort();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Welcome & Coordinated Ring Alert Banner if rings exist */}
      {network.detected_rings.length > 0 && (
        <div className="bg-gradient-to-r from-red-950/80 via-slate-900 to-amber-950/70 border border-red-800/80 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-red-900/60 border border-red-700 text-red-300 shrink-0">
              <Network className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-red-200">
                  {network.detected_rings.length} CO-ORDINATED FRAUD RINGS DETECTED
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-800/80 text-red-100 font-mono font-bold">
                  HIGH SEVERITY
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {network.detected_rings[0]?.description}. Multi-account device reuse patterns identified across active transactions.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('network')}
            className="self-start sm:self-center px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-600 rounded-lg shadow transition flex items-center gap-1.5 shrink-0"
          >
            <span>Inspect Fraud Rings</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5 Core Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Transactions</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">{summary.total_transactions}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            ${totalDollarVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })} evaluated
          </p>
        </div>

        <div className="bg-slate-900 border border-amber-900/40 rounded-xl p-4 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Suspicious Txns</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400">{summary.suspicious_transactions}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            ${suspiciousDollarVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })} at risk
          </p>
        </div>

        <div className="bg-slate-900 border border-red-900/50 rounded-xl p-4 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Critical Alerts</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-red-400">{summary.critical_alerts}</p>
          <p className="text-[11px] text-slate-400 mt-1">Score ≥ 80 / 100</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">High-Risk Accounts</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white">{summary.high_risk_accounts}</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Of {accounts.length} total accounts
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Average Risk Score</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold font-mono text-white">{summary.average_risk_score}</p>
            <span className="text-xs text-slate-500 font-mono">/100</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Deterministic Model</p>
        </div>
      </div>

      {/* Charts Grid: Risk Distribution & Timeline Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Risk Distribution Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Risk Tier Distribution</h3>
              <p className="text-xs text-slate-400">Classified by calibrated anomaly risk thresholds</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{summary.total_transactions} txns</span>
          </div>

          {/* Stacked Progress Bar */}
          <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex ring-1 ring-slate-800 mb-4">
            <div
              style={{ width: `${lowPct}%` }}
              title={`Low Risk (0-29): ${dist.low} (${lowPct}%)`}
              className="bg-emerald-500 transition-all duration-500"
            />
            <div
              style={{ width: `${medPct}%` }}
              title={`Medium Risk (30-59): ${dist.medium} (${medPct}%)`}
              className="bg-yellow-500 transition-all duration-500"
            />
            <div
              style={{ width: `${highPct}%` }}
              title={`High Risk (60-79): ${dist.high} (${highPct}%)`}
              className="bg-amber-500 transition-all duration-500"
            />
            <div
              style={{ width: `${critPct}%` }}
              title={`Critical Risk (80-100): ${dist.critical} (${critPct}%)`}
              className="bg-red-500 transition-all duration-500"
            />
          </div>

          {/* Breakdown Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-emerald-900/40">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Low Risk</span>
              </div>
              <p className="text-lg font-bold font-mono text-white mt-1">{dist.low}</p>
              <span className="text-[10px] text-slate-500">0–29 score ({lowPct}%)</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-yellow-900/40">
              <div className="flex items-center gap-1.5 text-yellow-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span>Medium</span>
              </div>
              <p className="text-lg font-bold font-mono text-white mt-1">{dist.medium}</p>
              <span className="text-[10px] text-slate-500">30–59 score ({medPct}%)</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-amber-900/40">
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>High</span>
              </div>
              <p className="text-lg font-bold font-mono text-white mt-1">{dist.high}</p>
              <span className="text-[10px] text-slate-500">60–79 score ({highPct}%)</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-red-900/40">
              <div className="flex items-center gap-1.5 text-red-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span>Critical</span>
              </div>
              <p className="text-lg font-bold font-mono text-white mt-1">{dist.critical}</p>
              <span className="text-[10px] text-slate-500">80–100 score ({critPct}%)</span>
            </div>
          </div>
        </div>

        {/* Suspicious Activity & Volume Timeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Daily Volume & Incident Frequency</h3>
              <p className="text-xs text-slate-400">Chronological transaction velocity and flagged spikes</p>
            </div>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>

          <div className="space-y-3">
            {bucketKeys.map((date) => {
              const bucket = timeBuckets[date];
              const maxDayTxns = Math.max(...Object.values(timeBuckets).map((b) => b.total), 1);
              const barWidth = Math.round((bucket.total / maxDayTxns) * 100);

              return (
                <div key={date} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-300 font-medium">{date}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{bucket.total} txns</span>
                      {bucket.suspicious > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/60 font-mono text-[10px]">
                          {bucket.suspicious} flagged
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex">
                    <div
                      style={{ width: `${barWidth}%` }}
                      className={`h-full rounded-full ${
                        bucket.suspicious > 0 ? 'bg-gradient-to-r from-cyan-500 to-red-500' : 'bg-cyan-600'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Columns: Top Critical Alerts & High Risk Accounts Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Critical Incidents */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-white">Priority Fraud Incidents</h3>
            </div>
            <button
              onClick={() => onNavigateTab('alerts')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              <span>View all ({data.alerts.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {criticalList.slice(0, 4).map((txn) => (
              <div
                key={txn.transaction_id}
                onClick={() => onSelectTransaction(txn)}
                className="py-3 cursor-pointer hover:bg-slate-800/40 px-2 -mx-2 rounded-lg transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-white">{txn.transaction_id}</span>
                    <span className="text-xs text-slate-400">({txn.account_id})</span>
                  </div>
                  <RiskBadge score={txn.risk_score} level={txn.risk_level} size="sm" />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>{txn.merchant}</span>
                  <span className="font-mono font-bold text-slate-200">
                    ${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <p className="text-[11px] text-red-300/90 line-clamp-1">
                  {txn.reasons[0] || 'Unusual anomaly pattern detected.'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* High Risk Accounts Dossier Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">High-Risk Account Profiles</h3>
            </div>
            <button
              onClick={() => onNavigateTab('accounts')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
            >
              <span>Inspect accounts</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {accounts.slice(0, 4).map((acc) => (
              <div
                key={acc.account_id}
                onClick={() => onSelectAccount(acc.account_id)}
                className="py-3 cursor-pointer hover:bg-slate-800/40 px-2 -mx-2 rounded-lg transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-white">{acc.account_id}</span>
                  <RiskBadge score={acc.risk_score} level={acc.risk_level} size="sm" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500">Txns:</span> {acc.transaction_count}
                  </div>
                  <div>
                    <span className="text-slate-500">Flagged:</span>{' '}
                    <span className={acc.suspicious_transaction_count > 0 ? 'text-red-400 font-bold' : ''}>
                      {acc.suspicious_transaction_count}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total:</span> ${acc.total_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                {acc.related_accounts.length > 0 && (
                  <p className="text-[10px] text-amber-300 mt-1 flex items-center gap-1 font-mono">
                    <span>Linked via shared device with: {acc.related_accounts.slice(0, 3).join(', ')}</span>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
