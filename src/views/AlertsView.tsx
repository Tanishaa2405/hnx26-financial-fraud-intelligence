import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  ExternalLink, 
  Clock, 
  Smartphone, 
  Store, 
  MapPin, 
  CheckCircle,
  FileSearch,
  Filter
} from 'lucide-react';
import { FraudAlert, ScoredTransaction } from '../types/fraud';
import { RiskBadge } from '../components/RiskBadge';

interface AlertsViewProps {
  alerts: FraudAlert[];
  transactions: ScoredTransaction[];
  onSelectTransaction: (txn: ScoredTransaction) => void;
  onSelectAccount: (accountId: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  transactions,
  onSelectTransaction,
  onSelectAccount,
  onNavigateTab,
}) => {
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high'>('all');
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Set<string>>(new Set());

  const filteredAlerts = alerts.filter((a) => {
    if (severityFilter === 'critical') return a.risk_score >= 80;
    if (severityFilter === 'high') return a.risk_score < 80;
    return true;
  });

  const toggleAcknowledge = (alertId: string) => {
    setAcknowledgedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(alertId)) next.delete(alertId);
      else next.add(alertId);
      return next;
    });
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header & Triage Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-950/80 border border-red-800 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Active Fraud Alerts & Incidents</h2>
              <p className="text-xs text-slate-400">
                Prioritized queue of transactions meeting anomaly detection threshold (Risk Score ≥ 60)
              </p>
            </div>
          </div>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs self-start sm:self-center">
          <button
            onClick={() => setSeverityFilter('all')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              severityFilter === 'all'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setSeverityFilter('critical')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              severityFilter === 'critical'
                ? 'bg-red-950 text-red-300 font-semibold border border-red-800/80'
                : 'text-slate-400 hover:text-red-300'
            }`}
          >
            Critical (Score ≥ 80)
          </button>
          <button
            onClick={() => setSeverityFilter('high')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              severityFilter === 'high'
                ? 'bg-amber-950 text-amber-300 font-semibold border border-amber-800/80'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            High Risk (60–79)
          </button>
        </div>
      </div>

      {/* Alert Feed Cards */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
          <CheckCircle className="w-10 h-10 mx-auto text-emerald-500/50 mb-3" />
          <p className="text-sm font-semibold text-slate-300">No active alerts in this severity category</p>
          <p className="text-xs text-slate-500 mt-1">All processed transactions conform to typical baseline limits.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredAlerts.map((alert) => {
            const isAck = acknowledgedAlerts.has(alert.alert_id);
            const fullTxn = transactions.find((t) => t.transaction_id === alert.transaction_id);

            return (
              <div
                key={alert.alert_id}
                className={`bg-slate-900 border rounded-xl p-5 transition-all shadow-sm ${
                  isAck
                    ? 'border-slate-800 opacity-70'
                    : alert.risk_score >= 80
                    ? 'border-red-900/80 hover:border-red-700 bg-gradient-to-r from-red-950/20 via-slate-900 to-slate-900'
                    : 'border-amber-900/60 hover:border-amber-700'
                }`}
              >
                {/* Alert Top Line */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-white">{alert.transaction_id}</span>
                    <RiskBadge score={alert.risk_score} level={alert.risk_level} size="sm" />
                    <button
                      type="button"
                      onClick={() => onSelectAccount(alert.account_id)}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
                    >
                      <span>Acc: {alert.account_id}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400 text-xs">
                      {alert.timestamp.replace('T', ' ').replace('Z', ' UTC')}
                    </span>
                    <span className="text-base font-bold font-mono text-white pl-2">
                      ${alert.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Reasons / Confirmed Evidence */}
                <div className="py-3 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Confirmed Anomaly Evidence:
                  </div>
                  {alert.reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                </div>

                {/* Context Entity Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 text-xs text-slate-400 bg-slate-950/50 rounded-lg p-2.5 my-2">
                  <div className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">Merchant: <strong className="text-slate-200">{alert.merchant}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate font-mono">Dev: <strong className="text-cyan-300">{alert.device_id}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">Origin: <strong className="text-slate-200">{alert.location}</strong></span>
                  </div>
                </div>

                {/* Recommended Procedural Action & Investigative Trigger */}
                <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
                      Recommended Action:
                    </span>
                    <span className="text-xs text-slate-200 font-medium">
                      {alert.recommended_action}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {fullTxn && (
                      <button
                        onClick={() => onSelectTransaction(fullTxn)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-purple-300 hover:text-white flex items-center gap-1.5 transition border border-slate-700"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Ask AI Explanation</span>
                      </button>
                    )}

                    <button
                      onClick={() => toggleAcknowledge(alert.alert_id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        isAck
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-red-950/80 text-red-300 border border-red-800 hover:bg-red-900/60'
                      }`}
                    >
                      {isAck ? 'Marked Taged' : 'Acknowledge Alert'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
