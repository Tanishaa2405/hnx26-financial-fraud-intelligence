import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  AlertTriangle,
  Smartphone,
  MapPin
} from 'lucide-react';
import { ScoredTransaction } from '../types/fraud';
import { RiskBadge } from '../components/RiskBadge';

interface TransactionsViewProps {
  transactions: ScoredTransaction[];
  onSelectTransaction: (txn: ScoredTransaction) => void;
  onSelectAccount: (accountId: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  transactions,
  onSelectTransaction,
  onSelectAccount,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'risk_score' | 'amount' | 'timestamp'>('risk_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.merchant_category) set.add(t.merchant_category);
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Filter & Sort
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Risk filter
      if (selectedRiskFilter === 'critical' && t.risk_score < 80) return false;
      if (selectedRiskFilter === 'high' && (t.risk_score < 60 || t.risk_score >= 80)) return false;
      if (selectedRiskFilter === 'medium' && (t.risk_score < 30 || t.risk_score >= 60)) return false;
      if (selectedRiskFilter === 'low' && t.risk_score >= 30) return false;
      if (selectedRiskFilter === 'suspicious' && t.risk_score < 60) return false;

      // Category filter
      if (selectedCategory !== 'all' && t.merchant_category !== selectedCategory) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches =
          t.transaction_id.toLowerCase().includes(query) ||
          t.account_id.toLowerCase().includes(query) ||
          t.merchant.toLowerCase().includes(query) ||
          t.device_id.toLowerCase().includes(query) ||
          t.location.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'risk_score') {
        comparison = a.risk_score - b.risk_score;
      } else if (sortBy === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortBy === 'timestamp') {
        comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [transactions, selectedRiskFilter, selectedCategory, searchTerm, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedList = filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (field: 'risk_score' | 'amount' | 'timestamp') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const exportFilteredCsv = () => {
    const headers = [
      'transaction_id',
      'account_id',
      'amount',
      'timestamp',
      'merchant',
      'merchant_category',
      'device_id',
      'location',
      'payment_channel',
      'risk_score',
      'risk_level',
      'status',
    ];
    const rows = filteredTransactions.map((t) => [
      t.transaction_id,
      t.account_id,
      t.amount,
      t.timestamp,
      `"${t.merchant}"`,
      t.merchant_category,
      t.device_id,
      `"${t.location}"`,
      t.payment_channel,
      t.risk_score,
      t.risk_level,
      t.status,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_filtered_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Control & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search transaction ID, account, merchant, device..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Risk Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            <span className="text-[11px] text-slate-500 px-2 font-medium">Risk:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'suspicious', label: '≥ 60 (Alerts)' },
              { id: 'critical', label: 'Critical (80+)' },
              { id: 'high', label: 'High' },
              { id: 'medium', label: 'Medium' },
              { id: 'low', label: 'Low' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setSelectedRiskFilter(f.id);
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                  selectedRiskFilter === f.id
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Export CSV button */}
          <button
            onClick={exportFilteredCsv}
            title="Export filtered records"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Transactions Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold tracking-wider uppercase text-[11px]">
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Account</th>
                <th
                  className="py-3 px-4 cursor-pointer hover:text-white transition"
                  onClick={() => toggleSort('amount')}
                >
                  <div className="flex items-center gap-1">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-4">Merchant & Category</th>
                <th
                  className="py-3 px-4 cursor-pointer hover:text-white transition"
                  onClick={() => toggleSort('timestamp')}
                >
                  <div className="flex items-center gap-1">
                    <span>Timestamp</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-4">Device & Origin</th>
                <th
                  className="py-3 px-4 cursor-pointer hover:text-white transition"
                  onClick={() => toggleSort('risk_score')}
                >
                  <div className="flex items-center gap-1">
                    <span>Risk Score</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 text-xs">
                    No transactions match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedList.map((txn) => {
                  const isHighRisk = txn.risk_score >= 60;
                  return (
                    <tr
                      key={txn.transaction_id}
                      onClick={() => onSelectTransaction(txn)}
                      className={`cursor-pointer transition-colors ${
                        isHighRisk
                          ? 'hover:bg-red-950/20 bg-red-950/5'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-medium text-white whitespace-nowrap">
                        {txn.transaction_id}
                      </td>

                      <td className="py-3 px-4 font-mono text-cyan-400 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAccount(txn.account_id);
                          }}
                          className="hover:underline hover:text-cyan-300"
                        >
                          {txn.account_id}
                        </button>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-200 whitespace-nowrap">
                        ${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-200 block">{txn.merchant}</span>
                        <span className="text-[10px] text-slate-500">{txn.merchant_category}</span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                        {txn.timestamp.replace('T', ' ').replace('Z', '')}
                      </td>

                      <td className="py-3 px-4 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1 font-mono text-slate-300">
                          <Smartphone className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[120px]">{txn.device_id}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>{txn.location}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-sm whitespace-nowrap">
                        <span
                          className={
                            txn.risk_score >= 80
                              ? 'text-red-400 font-extrabold'
                              : txn.risk_score >= 60
                              ? 'text-amber-400'
                              : txn.risk_score >= 30
                              ? 'text-yellow-400'
                              : 'text-emerald-400'
                          }
                        >
                          {txn.risk_score}
                        </span>
                        <span className="text-[10px] text-slate-600">/100</span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <RiskBadge score={txn.risk_score} level={txn.risk_level} size="sm" showScore={false} />
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                            txn.status === 'Flagged'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : txn.status === 'Under Review'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : txn.status === 'Monitored'
                              ? 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {txn.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTransaction(txn);
                          }}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-400 hover:text-purple-300 transition"
                          title="Investigate with AI"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredTransactions.length)} of {filteredTransactions.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
