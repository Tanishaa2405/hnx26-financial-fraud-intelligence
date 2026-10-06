import React from 'react';
import { 
  ShieldAlert, 
  BarChart3, 
  ListFilter, 
  AlertTriangle, 
  Users, 
  Share2, 
  Sparkles, 
  Settings, 
  Upload, 
  Download, 
  RefreshCw, 
  LogOut, 
  UserCircle,
  Database
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab = 
  | 'overview' 
  | 'transactions' 
  | 'alerts' 
  | 'accounts' 
  | 'network' 
  | 'ai-explain' 
  | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenUpload: () => void;
  onGenerateDemo: () => void;
  isGenerating: boolean;
  alertCount: number;
  engineName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenUpload,
  onGenerateDemo,
  isGenerating,
  alertCount,
  engineName,
}) => {
  const { user, signOut, isSupabaseLive } = useAuth();

  const handleDownloadSample = () => {
    window.location.href = '/api/sample-csv';
  };

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'transactions', label: 'Transactions', icon: <ListFilter className="w-4 h-4" /> },
    { id: 'alerts', label: 'Fraud Alerts', icon: <AlertTriangle className="w-4 h-4" />, badge: alertCount },
    { id: 'accounts', label: 'Accounts', icon: <Users className="w-4 h-4" /> },
    { id: 'network', label: 'Fraud Network', icon: <Share2 className="w-4 h-4" /> },
    { id: 'ai-explain', label: 'AI Explanation', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-slate-100">
      {/* Top Banner & Control Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 border-b border-slate-800/80">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-amber-600 flex items-center justify-center shadow-lg shadow-red-950/40 ring-1 ring-red-400/30">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">HNX26 FRAUD INTEL</span>
                <span className="text-xs px-2 py-0.5 rounded bg-red-950/80 border border-red-700/60 text-red-400 font-mono font-medium">
                  HNX26PSI04
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>Real-Time Anomaly & Syndicate Detection</span>
                <span className="inline-block w-1 h-1 rounded-full bg-slate-600"></span>
                <span className="text-emerald-400 font-mono text-[11px] truncate max-w-xs">
                  {engineName || 'Python Isolation Forest + Heuristics'}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Actions & Auth */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadSample}
              title="Download sample CSV template"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-2 rounded-md border border-slate-700 transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Sample CSV</span>
            </button>

            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-md border border-slate-700 shadow-sm transition"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Upload CSV</span>
            </button>

            <button
              onClick={onGenerateDemo}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 px-3.5 py-2 rounded-md shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Analyzing...' : 'Generate Demo Data'}</span>
            </button>

            {/* User Session Info */}
            <div className="h-6 w-px bg-slate-800 mx-1 hidden md:block" />

            <div className="flex items-center gap-2 pl-1">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-medium text-slate-200">{user?.name || user?.email}</span>
                <div className="flex items-center justify-end gap-1 text-[11px] text-slate-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseLive ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
                  <span>{isSupabaseLive ? 'Supabase Live' : 'Demo Auth'}</span>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                title="Sign out"
                className="p-2 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-inner border border-slate-700/60 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                      isActive
                        ? 'bg-red-500 text-white'
                        : 'bg-red-950 text-red-400 border border-red-800/60'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
