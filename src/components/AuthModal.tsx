import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp, demoLogin, isSupabaseLive } = useAuth();
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const res = await signUp(email, password, name);
        if (res.error) throw new Error(res.error);
      } else {
        const res = await signIn(email, password);
        if (res.error) throw new Error(res.error);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (role: 'lead_investigator' | 'risk_analyst' | 'fraud_operator') => {
    demoLogin(role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-md w-full p-6 text-slate-100">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-red-600 to-amber-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-red-950/50">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">
            {isSignUp ? 'Create Fraud Investigator Account' : 'Sign In to Fraud Intel Platform'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isSupabaseLive ? 'Protected by Supabase Auth & PostgreSQL' : 'Local Sandbox Mode (Zero-Config Session)'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/70 border border-red-800 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Agent Sarah Connor"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="investigator@bank.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 font-semibold text-xs text-white rounded-lg transition shadow-md flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Authenticating...' : isSignUp ? 'Register Account' : 'Sign In'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
          >
            {isSignUp ? 'Already have an investigator account? Sign In' : 'New investigator? Create an account'}
          </button>
        </div>

        {/* Quick Demo Access Buttons */}
        <div className="mt-5 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Instant Demo Analyst Roles</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('lead_investigator')}
              className="p-2 text-left bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs transition"
            >
              <span className="font-semibold text-slate-200 block">Lead Investigator</span>
              <span className="text-[10px] text-slate-500">Sarah Chen</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('risk_analyst')}
              className="p-2 text-left bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs transition"
            >
              <span className="font-semibold text-slate-200 block">Senior Risk Analyst</span>
              <span className="text-[10px] text-slate-500">Marcus Vance</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
