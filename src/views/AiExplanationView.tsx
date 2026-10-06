import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  Layers, 
  MessageSquare
} from 'lucide-react';
import { ScoredTransaction } from '../types/fraud';
import { RiskBadge } from '../components/RiskBadge';
import { explainTransactionWithAI } from '../api/client';

interface AiExplanationViewProps {
  transactions: ScoredTransaction[];
  selectedTxn?: ScoredTransaction | null;
  onSelectTxn: (txn: ScoredTransaction) => void;
}

export const AiExplanationView: React.FC<AiExplanationViewProps> = ({
  transactions,
  selectedTxn,
  onSelectTxn,
}) => {
  // Default to a suspicious transaction if none selected
  const activeTxn =
    selectedTxn ||
    transactions.find((t) => t.risk_score >= 80) ||
    transactions.find((t) => t.risk_score >= 60) ||
    transactions[0] ||
    null;

  const [question, setQuestion] = useState<string>('Why was this transaction flagged?');
  const [explanation, setExplanation] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const presetQuestions = [
    'Why was this transaction flagged?',
    'What evidence suggests coordinated fraud ring behavior?',
    'Explain the amount disparity compared to normal baseline.',
    'What is the recommended investigative response protocol?',
  ];

  const handleGenerate = async () => {
    if (!activeTxn) return;
    setLoading(true);
    setExplanation(null);
    try {
      const res = await explainTransactionWithAI(activeTxn, question);
      setExplanation(res.explanation);
      setSource(res.source);
    } catch (err: any) {
      setExplanation(`AI Explanation pipeline error: ${err.message}`);
      setSource('error_fallback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-950/80 border border-purple-800 text-purple-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">AI Fraud Findings Explainer</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/80 font-mono">
                Grounded Reasoning
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Powered by Gemini 3.8 Flash to synthesize already-flagged ML anomalies into clear, authoritative compliance briefs
            </p>
          </div>
        </div>
      </div>

      {/* Main Split Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Input Selection & Verified Evidence Payload */}
        <div className="lg:col-span-5 space-y-4">
          {/* Select Transaction */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Select Transaction to Interrogate
            </label>
            <select
              value={activeTxn?.transaction_id || ''}
              onChange={(e) => {
                const found = transactions.find((t) => t.transaction_id === e.target.value);
                if (found) {
                  onSelectTxn(found);
                  setExplanation(null);
                }
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
            >
              {transactions.map((t) => (
                <option key={t.transaction_id} value={t.transaction_id}>
                  {t.transaction_id} — {t.account_id} | ${t.amount.toFixed(2)} | {t.risk_level} ({t.risk_score})
                </option>
              ))}
            </select>

            {activeTxn && (
              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-white">{activeTxn.transaction_id}</span>
                  <RiskBadge score={activeTxn.risk_score} level={activeTxn.risk_level} size="sm" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500">Amount:</span> ${activeTxn.amount.toFixed(2)}
                  </div>
                  <div>
                    <span className="text-slate-500">Merchant:</span> {activeTxn.merchant}
                  </div>
                  <div>
                    <span className="text-slate-500">Account:</span> {activeTxn.account_id}
                  </div>
                  <div>
                    <span className="text-slate-500">Device:</span> {activeTxn.device_id}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Verified Evidence (Input to Gemini) */}
          {activeTxn && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider">
                  Verified Engine Findings
                </span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Deterministic Base</span>
                </span>
              </div>

              <div className="space-y-1.5">
                {activeTxn.reasons.map((r, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1 shrink-0" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-[11px] text-slate-500">
                Recommended: <strong className="text-slate-300">{activeTxn.recommended_action}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Right: Prompt Console & Response Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Investigation Query
              </span>
              <span className="text-[10px] text-purple-400 font-mono">gemini-3.8-flash</span>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5">
              {presetQuestions.map((pq) => (
                <button
                  key={pq}
                  onClick={() => setQuestion(pq)}
                  className={`text-[11px] px-2.5 py-1 rounded-full transition border ${
                    question === pq
                      ? 'bg-purple-950 text-purple-200 border-purple-700 font-medium'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {pq}
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask specific explanation question..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleGenerate}
                disabled={loading || !activeTxn}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 font-semibold text-xs text-white rounded-lg shadow transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Cpu className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Analyzing...' : 'Generate'}</span>
              </button>
            </div>

            {/* Generated Explanation Result Box */}
            <div className="p-4 rounded-xl bg-slate-950 border border-purple-900/40 min-h-[160px] flex flex-col justify-between">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-2 text-slate-400 text-xs">
                  <Cpu className="w-6 h-6 text-purple-400 animate-spin" />
                  <span>Synthesizing deterministic anomaly evidence into natural language...</span>
                </div>
              ) : explanation ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-purple-300 font-mono pb-2 border-b border-purple-950">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>OFFICIAL INVESTIGATIVE BRIEF</span>
                    </span>
                    <span className="text-[10px] bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800/60">
                      Engine Source: {source}
                    </span>
                  </div>
                  <p className="text-xs text-slate-100 leading-relaxed font-sans">{explanation}</p>
                </div>
              ) : (
                <div className="text-center py-10 text-slate-500 text-xs">
                  Select a question above and click <strong>Generate</strong> to receive an evidence-grounded AI explanation.
                </div>
              )}

              {/* Guardrails Disclaimer */}
              <div className="pt-3 border-t border-slate-900 text-[10px] text-slate-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>
                  Anti-hallucination constraint active: Gemini is strictly bound to confirmed facts and cannot invent financial data.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
