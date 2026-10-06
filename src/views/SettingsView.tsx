import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Database, 
  ShieldCheck, 
  Key, 
  ExternalLink, 
  RefreshCw, 
  Download, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  Cpu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPlaidStatus, simulatePlaidSync } from '../api/client';
import { FraudAnalysisResult } from '../types/fraud';

interface SettingsViewProps {
  engineMeta?: { engine: string; timestamp: string };
  onReloadDemo: () => void;
  onDataSetUpdate: (data: FraudAnalysisResult) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  engineMeta,
  onReloadDemo,
  onDataSetUpdate,
}) => {
  const { isSupabaseLive, user } = useAuth();
  const [plaidStatus, setPlaidStatus] = useState<any>(null);
  const [isPlaidSyncing, setIsPlaidSyncing] = useState<boolean>(false);
  const [plaidSyncSuccess, setPlaidSyncSuccess] = useState<boolean>(false);

  useEffect(() => {
    getPlaidStatus().then((res) => setPlaidStatus(res)).catch(() => {});
  }, []);

  const handleSimulatePlaid = async () => {
    try {
      setIsPlaidSyncing(true);
      setPlaidSyncSuccess(false);
      const res = await simulatePlaidSync();
      onDataSetUpdate(res);
      setPlaidSyncSuccess(true);
    } catch (err: any) {
      alert(`Plaid Sandbox error: ${err.message}`);
    } finally {
      setIsPlaidSyncing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Platform Settings & Architecture Health</h2>
            <p className="text-xs text-slate-400">
              Integrations, ML pipeline diagnostics, Supabase configuration, and Plaid Sandbox readiness
            </p>
          </div>
        </div>
      </div>

      {/* 4 Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Supabase Auth & PostgreSQL */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Supabase Authentication</h3>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isSupabaseLive
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-cyan-950 text-cyan-300 border-cyan-800'
              }`}
            >
              {isSupabaseLive ? 'Connected & Live' : 'Local / Demo Mode Active'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {isSupabaseLive
              ? 'Supabase project credentials detected via environment variables. User sessions and authentication tokens are validated through Supabase Auth.'
              : 'Operating in self-contained Local Demo Auth mode. All roles and sessions function with zero configuration so the hackathon project runs immediately out-of-the-box.'}
          </p>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div>VITE_SUPABASE_URL: {isSupabaseLive ? 'CONFIGURED' : 'UNCONFIGURED (FALLBACK ACTIVE)'}</div>
            <div>VITE_SUPABASE_PUBLISHABLE_KEY: {isSupabaseLive ? 'CONFIGURED' : 'UNCONFIGURED (FALLBACK ACTIVE)'}</div>
          </div>
        </div>

        {/* Plaid Sandbox Service Layer */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Plaid Sandbox Readiness</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
              Service Layer Ready
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Architected in <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">services/plaid/plaidService.ts</code>. The application is completely functional without Plaid, but allows bank sandbox simulation on demand.
          </p>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400">
              Status: {plaidStatus?.isConfigured ? 'Live Credentials' : 'Sandbox Simulated Stream'}
            </span>
            <button
              onClick={handleSimulatePlaid}
              disabled={isPlaidSyncing}
              className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-xs font-semibold text-white transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPlaidSyncing ? 'animate-spin' : ''}`} />
              <span>{isPlaidSyncing ? 'Linking...' : 'Test Plaid Sandbox Stream'}</span>
            </button>
          </div>

          {plaidSyncSuccess && (
            <div className="p-2 rounded bg-emerald-950/60 border border-emerald-800 text-[11px] text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Plaid Sandbox transaction stream ingested and analyzed successfully!</span>
            </div>
          )}
        </div>

        {/* Python Fraud Engine Pipeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Python ML Anomaly Pipeline</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              Pipeline Active
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Executes <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">python/fraud_engine.py</code> and <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">python/feature_engineering.py</code> with Isolation Forest anomaly detection, statistical baselines, and graph clustering.
          </p>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div>Engine: {engineMeta?.engine || 'Python 3 / Native Twin'}</div>
            <div>Scoring: 0-100 Calibrated Risk Spectrum</div>
          </div>
        </div>

        {/* Gemini AI Findings Assistant */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Gemini 3.8 Flash Findings Explainer</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
              Server-Side Active
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Strictly dedicated to explaining pre-computed ML and heuristic anomalies in human language. Gemini does NOT compute risk scores; deterministic evidence is forwarded securely server-side.
          </p>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div>Model: gemini-3.8-flash</div>
            <div>Endpoint: POST /api/ai/explain</div>
          </div>
        </div>
      </div>

      {/* Dataset & Reset Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-white">Reset & Generate Fresh Dataset</h3>
          <p className="text-xs text-slate-400">
            Regenerates the complete synthetic transaction set with clean normal baselines, fraud rings, and velocity attacks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/sample-csv"
            download="transactions_sample.csv"
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV</span>
          </a>

          <button
            onClick={onReloadDemo}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-xs font-semibold text-white shadow transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Synthetic Data</span>
          </button>
        </div>
      </div>
    </div>
  );
};
