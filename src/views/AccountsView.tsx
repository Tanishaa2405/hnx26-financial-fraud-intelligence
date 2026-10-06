import React, { useState } from 'react';
import { 
  Users, 
  Smartphone, 
  Store, 
  MapPin, 
  AlertTriangle, 
  Share2, 
  ExternalLink, 
  Search, 
  Activity, 
  Sparkles,
  DollarSign
} from 'lucide-react';
import { AccountSummary, ScoredTransaction } from '../types/fraud';
import { RiskBadge } from '../components/RiskBadge';

interface AccountsViewProps {
  accounts: AccountSummary[];
  transactions: ScoredTransaction[];
  selectedAccountId?: string | null;
  onSelectAccount: (accountId: string) => void;
  onSelectTransaction: (txn: ScoredTransaction) => void;
  onNavigateTab: (tab: any) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  transactions,
  selectedAccountId,
  onSelectAccount,
  onSelectTransaction,
  onNavigateTab,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Active account selection
  const activeAccount = accounts.find((a) => a.account_id === selectedAccountId) || accounts[0] || null;

  // Filter accounts list
  const filteredAccounts = accounts.filter((a) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      a.account_id.toLowerCase().includes(q) ||
      a.devices_used.some((d) => d.toLowerCase().includes(q)) ||
      a.merchants_used.some((m) => m.toLowerCase().includes(q))
    );
  });

  // Active account transactions
  const accountTxns = activeAccount
    ? transactions.filter((t) => t.account_id === activeAccount.account_id)
    : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in">
      {/* Left Column: Account Directory */}
      <div className="lg:col-span-4 space-y-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Account Dossiers ({accounts.length})</h3>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search account, device..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredAccounts.map((acc) => {
              const isSelected = activeAccount?.account_id === acc.account_id;
              const hasSharedDevices = acc.related_accounts.length > 0;

              return (
                <div
                  key={acc.account_id}
                  onClick={() => onSelectAccount(acc.account_id)}
                  className={`p-3 rounded-lg cursor-pointer transition border text-xs ${
                    isSelected
                      ? 'bg-slate-800 border-purple-500/80 shadow-sm ring-1 ring-purple-500/20'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold text-white">{acc.account_id}</span>
                    <RiskBadge score={acc.risk_score} level={acc.risk_level} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{acc.transaction_count} txns</span>
                    <span className="font-mono text-slate-300">
                      ${acc.total_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>

                  {hasSharedDevices && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                      <Share2 className="w-3 h-3 shrink-0" />
                      <span>Linked with {acc.related_accounts.length} other account(s)</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Active Account Investigation Dossier */}
      <div className="lg:col-span-8 space-y-4">
        {activeAccount ? (
          <>
            {/* Account Header Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold font-mono text-white">{activeAccount.account_id}</h2>
                    <RiskBadge score={activeAccount.risk_score} level={activeAccount.risk_level} size="md" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Entity profile under active anomaly surveillance & risk scoring
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigateTab('network')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-cyan-300 flex items-center gap-1.5 transition border border-slate-700"
                  >
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View in Network</span>
                  </button>
                </div>
              </div>

              {/* Required Account Investigation Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                  <span className="text-[11px] text-slate-400">Transaction Count</span>
                  <p className="text-xl font-bold font-mono text-white mt-0.5">
                    {activeAccount.transaction_count}
                  </p>
                  <span className="text-[10px] text-slate-500">Total ledger events</span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                  <span className="text-[11px] text-slate-400">Total Value</span>
                  <p className="text-xl font-bold font-mono text-white mt-0.5">
                    ${activeAccount.total_value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-slate-500">Gross expenditure</span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                  <span className="text-[11px] text-slate-400">Average Value</span>
                  <p className="text-xl font-bold font-mono text-white mt-0.5">
                    ${activeAccount.average_value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-slate-500">Per transaction</span>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                  <span className="text-[11px] text-slate-400">Suspicious Count</span>
                  <p
                    className={`text-xl font-bold font-mono mt-0.5 ${
                      activeAccount.suspicious_transaction_count > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {activeAccount.suspicious_transaction_count}
                  </p>
                  <span className="text-[10px] text-slate-500">Score ≥ 60 flagged</span>
                </div>
              </div>
            </div>

            {/* Entity Fingerprints (Devices, Merchants, Locations, Related Accounts) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Entity Footprint & Environmental Context
              </h3>

              {/* Related Accounts (FRAUD RING LINK) */}
              {activeAccount.related_accounts.length > 0 && (
                <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-900/60">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-red-300 mb-2">
                    <Share2 className="w-4 h-4 text-red-400" />
                    <span>Linked Accounts via Shared Hardware Signatures ({activeAccount.related_accounts.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {activeAccount.related_accounts.map((relId) => (
                      <button
                        key={relId}
                        type="button"
                        onClick={() => onSelectAccount(relId)}
                        className="px-2.5 py-1 rounded bg-slate-900 border border-red-800 hover:border-red-600 font-mono text-xs text-red-200 flex items-center gap-1.5 transition"
                      >
                        <span>{relId}</span>
                        <ExternalLink className="w-3 h-3 text-red-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Devices Used */}
              <div>
                <span className="text-xs font-medium text-slate-400 block mb-1.5 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Devices Used ({activeAccount.devices_used.length})</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeAccount.devices_used.map((dev) => (
                    <span
                      key={dev}
                      className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-300"
                    >
                      {dev}
                    </span>
                  ))}
                </div>
              </div>

              {/* Merchants Used */}
              <div>
                <span className="text-xs font-medium text-slate-400 block mb-1.5 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-slate-500" />
                  <span>Merchants Transacted With ({activeAccount.merchants_used.length})</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeAccount.merchants_used.map((m) => (
                    <span
                      key={m}
                      className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Locations Used */}
              <div>
                <span className="text-xs font-medium text-slate-400 block mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>Geographic Locations ({activeAccount.locations_used.length})</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activeAccount.locations_used.map((l) => (
                    <span
                      key={l}
                      className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Account Transaction History Ledger */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Transaction Ledger ({accountTxns.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                      <th className="py-2.5 px-4">Transaction ID</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Merchant</th>
                      <th className="py-2.5 px-4">Device</th>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Risk Score</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {accountTxns.map((t) => (
                      <tr
                        key={t.transaction_id}
                        onClick={() => onSelectTransaction(t)}
                        className="cursor-pointer hover:bg-slate-800/40 transition"
                      >
                        <td className="py-2.5 px-4 font-mono font-medium text-white">{t.transaction_id}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-200">
                          ${t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-4 text-slate-300">{t.merchant}</td>
                        <td className="py-2.5 px-4 font-mono text-cyan-400 text-[11px]">{t.device_id}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                          {t.timestamp.replace('T', ' ').replace('Z', '')}
                        </td>
                        <td className="py-2.5 px-4">
                          <RiskBadge score={t.risk_score} level={t.risk_level} size="sm" />
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectTransaction(t);
                            }}
                            className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-500">
            Select an account on the left to view the investigative dossier.
          </div>
        )}
      </div>
    </div>
  );
};
