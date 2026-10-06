import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, NavTab } from './components/Navbar';
import { CsvUploadModal } from './components/CsvUploadModal';
import { TransactionDetailDrawer } from './components/TransactionDetailDrawer';
import { AuthModal } from './components/AuthModal';
import { OverviewView } from './views/OverviewView';
import { TransactionsView } from './views/TransactionsView';
import { AlertsView } from './views/AlertsView';
import { AccountsView } from './views/AccountsView';
import { NetworkView } from './views/NetworkView';
import { AiExplanationView } from './views/AiExplanationView';
import { SettingsView } from './views/SettingsView';
import { FraudAnalysisResult, ScoredTransaction } from './types/fraud';
import { getTransactions, generateDemoData, analyzeCsv } from './api/client';
import { ShieldAlert, RefreshCw, AlertCircle, Sparkles, Lock, ArrowRight } from 'lucide-react';

function DashboardContent() {
  const { user, loading: authLoading, demoLogin } = useAuth();
  const [data, setData] = useState<FraudAnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedTxn, setSelectedTxn] = useState<ScoredTransaction | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Fetch initial dataset on load
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch currently loaded data from server
      const res = await fetch('/api/network').then((r) => r.json());
      const txnsRes = await getTransactions();
      const alertsRes = await fetch('/api/alerts').then((r) => r.json());
      const accountsRes = await fetch('/api/accounts/ACC_VICTIM_707').catch(() => null);

      // Or simply trigger demo generation if server had no prior cache
      if (!txnsRes || !txnsRes.transactions || txnsRes.transactions.length === 0) {
        const demoRes = await generateDemoData();
        setData(demoRes);
      } else {
        // Construct composite or fetch full analysis
        const fullDemo = await generateDemoData();
        setData(fullDemo);
      }
    } catch (err: any) {
      console.warn('Initial data fetch failed, generating demo set:', err);
      try {
        const demoRes = await generateDemoData();
        setData(demoRes);
      } catch (genErr: any) {
        setError(`Failed to initialize data pipeline: ${genErr.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleGenerateDemo = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const res = await generateDemoData();
      setData(res);
    } catch (err: any) {
      setError(`Failed to generate demo data: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCsvUpload = async (csvText: string) => {
    const res = await analyzeCsv(csvText);
    setData(res);
  };

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    setCurrentTab('accounts');
  };

  // If user is not authenticated, show sign-in prompt
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center mx-auto shadow-xl shadow-red-950/60 ring-1 ring-red-400/40">
            <ShieldAlert className="w-8 h-8 text-white" />
          </div>

          <div>
            <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
              HNX26PSI04
            </span>
            <h1 className="text-xl font-extrabold text-white mt-1">
              Real-Time Financial Fraud Intelligence
            </h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Anomaly detection engine, coordinated fraud ring graph visualizer, and deterministic evidence explanation.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => demoLogin('lead_investigator')}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 font-semibold text-xs text-white rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <span>Instant Enter as Lead Investigator</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 font-medium text-xs text-slate-200 rounded-xl transition border border-slate-700"
            >
              Sign In with Supabase Credentials
            </button>
          </div>

          <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-4">
            Protected Dashboard • Supabase Auth • Python ML Engine • Plaid Sandbox Ready
          </div>
        </div>

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenUpload={() => setIsUploadOpen(true)}
        onGenerateDemo={handleGenerateDemo}
        isGenerating={isGenerating}
        alertCount={data?.summary.critical_alerts || 0}
        engineName={data?.engine_meta?.engine}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={handleGenerateDemo}
              className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-xs font-semibold text-white transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">
              Running Fraud Detection Engine & Building Relationship Graph...
            </h3>
            <p className="text-xs text-slate-500">
              Computing Isolation Forest anomaly scores, multi-account device sharing, and velocity features.
            </p>
          </div>
        ) : !data ? (
          <div className="py-20 text-center space-y-4">
            <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400">No transaction dataset currently analyzed.</p>
            <button
              onClick={handleGenerateDemo}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white"
            >
              Generate Demo Data
            </button>
          </div>
        ) : (
          <>
            {currentTab === 'overview' && (
              <OverviewView
                data={data}
                onNavigateTab={setCurrentTab}
                onSelectTransaction={setSelectedTxn}
                onSelectAccount={handleSelectAccount}
              />
            )}

            {currentTab === 'transactions' && (
              <TransactionsView
                transactions={data.transactions}
                onSelectTransaction={setSelectedTxn}
                onSelectAccount={handleSelectAccount}
              />
            )}

            {currentTab === 'alerts' && (
              <AlertsView
                alerts={data.alerts}
                transactions={data.transactions}
                onSelectTransaction={setSelectedTxn}
                onSelectAccount={handleSelectAccount}
                onNavigateTab={setCurrentTab}
              />
            )}

            {currentTab === 'accounts' && (
              <AccountsView
                accounts={data.accounts}
                transactions={data.transactions}
                selectedAccountId={selectedAccountId}
                onSelectAccount={setSelectedAccountId}
                onSelectTransaction={setSelectedTxn}
                onNavigateTab={setCurrentTab}
              />
            )}

            {currentTab === 'network' && (
              <NetworkView network={data.network} onSelectAccount={handleSelectAccount} />
            )}

            {currentTab === 'ai-explain' && (
              <AiExplanationView
                transactions={data.transactions}
                selectedTxn={selectedTxn}
                onSelectTxn={setSelectedTxn}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                engineMeta={data.engine_meta}
                onReloadDemo={handleGenerateDemo}
                onDataSetUpdate={setData}
              />
            )}
          </>
        )}
      </main>

      {/* Slide-out Transaction Investigation Drawer */}
      <TransactionDetailDrawer
        transaction={selectedTxn}
        onClose={() => setSelectedTxn(null)}
        onSelectAccount={handleSelectAccount}
      />

      {/* CSV Ingestion Modal */}
      <CsvUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleCsvUpload}
      />

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
