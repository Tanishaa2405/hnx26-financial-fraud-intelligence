import React, { useState } from 'react';
import { X, Sparkles, ShieldAlert, Cpu, MapPin, Smartphone, Store, Clock, ExternalLink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ScoredTransaction } from '../types/fraud';
import { RiskBadge } from './RiskBadge';
import { explainTransactionWithAI } from '../api/client';

interface TransactionDetailDrawerProps {
  transaction: ScoredTransaction | null;
  onClose: () => void;
  onSelectAccount?: (accountId: string) => void;
}

export const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({
  transaction,
  onClose,
  onSelectAccount,
}) => {
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [customQuestion, setCustomQuestion] = useState<string>('Why was this transaction flagged?');

  if (!transaction) return null;

  const handleAskAI = async () => {
    try {
      setIsAiLoading(true);
      const res = await explainTransactionWithAI(transaction, customQuestion);
      setAiExplanation(res.explanation);
      setAiSource(res.source);
    } catch (err: any) {
      setAiExplanation(`Investigation query failed: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full text-slate-100 overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-950/80 border border-red-800 text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-bold text-sm text-white">{transaction.transaction_id}</h3>
                <RiskBadge score={transaction.risk_score} level={transaction.risk_level} size="sm" />
              </div>
              <p className="text-xs text-slate-400">Account: {transaction.account_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 flex-1">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
              <span className="text-[11px] font-medium text-slate-400">Transaction Amount</span>
              <p className="text-xl font-bold font-mono text-white mt-0.5">
                ${transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <span className="text-[11px] text-slate-500">{transaction.payment_channel}</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
              <span className="text-[11px] font-medium text-slate-400">ML Anomaly Depth</span>
              <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                {(transaction.ml_anomaly_score * 100).toFixed(0)}%
              </p>
              <span className="text-[11px] text-slate-500">Isolation Forest Metric</span>
            </div>
          </div>

          {/* Recommended Procedural Action */}
          <div className="bg-gradient-to-r from-red-950/50 to-amber-950/40 border border-red-900/60 rounded-lg p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Recommended Action</span>
            </div>
            <p className="text-xs text-slate-200 font-medium">{transaction.recommended_action}</p>
          </div>

          {/* Verified Evidence & Reasons */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>Deterministic Evidence / Flagged Reasons</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                {transaction.reasons.length}
              </span>
            </h4>
            <div className="space-y-2">
              {transaction.reasons.map((reason, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  <p className="leading-relaxed">{reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Anomaly Signal Tags */}
          {transaction.anomaly_flags.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 mb-1.5">Anomaly Indicators</h4>
              <div className="flex flex-wrap gap-1.5">
                {transaction.anomaly_flags.map((flag) => (
                  <span
                    key={flag}
                    className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300"
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Transaction Metadata Grid */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-lg divide-y divide-slate-800/80 text-xs">
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Store className="w-4 h-4 text-slate-500" />
                <span>Merchant</span>
              </div>
              <div className="text-right">
                <span className="font-semibold text-white">{transaction.merchant}</span>
                <span className="text-slate-500 block text-[11px]">{transaction.merchant_category}</span>
              </div>
            </div>

            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Smartphone className="w-4 h-4 text-slate-500" />
                <span>Device Signature</span>
              </div>
              <span className="font-mono text-cyan-400">{transaction.device_id}</span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span>Location</span>
              </div>
              <span className="text-slate-200">{transaction.location}</span>
            </div>

            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Timestamp (UTC)</span>
              </div>
              <span className="font-mono text-slate-300">{transaction.timestamp}</span>
            </div>
          </div>

          {/* AI Explanation Console */}
          <div className="bg-slate-950 border border-purple-900/40 rounded-xl p-4 shadow-inner space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  AI Investigation Assistant
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60">
                Grounded Explanation
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              Converts verified deterministic anomalies into natural language for compliance documentation and fraud analysts.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Ask reason or context..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleAskAI}
                disabled={isAiLoading}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                <Cpu className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                <span>{isAiLoading ? 'Explaining...' : 'Explain'}</span>
              </button>
            </div>

            {aiExplanation && (
              <div className="p-3 bg-purple-950/30 border border-purple-900/60 rounded-lg text-xs space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between text-[10px] text-purple-300 font-mono">
                  <span>ANALYSIS BRIEF</span>
                  <span>Source: {aiSource}</span>
                </div>
                <p className="text-slate-200 leading-relaxed font-sans">{aiExplanation}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          {onSelectAccount && (
            <button
              onClick={() => {
                onSelectAccount(transaction.account_id);
                onClose();
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Inspect Account {transaction.account_id}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
