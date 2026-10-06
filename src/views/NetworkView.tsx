import React, { useState, useMemo } from 'react';
import { 
  Share2, 
  ShieldAlert, 
  Smartphone, 
  Users, 
  Store, 
  MapPin, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { NetworkNode, NetworkEdge, DetectedRing } from '../types/fraud';
import { RiskBadge } from '../components/RiskBadge';

interface NetworkViewProps {
  network: {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
    detected_rings: DetectedRing[];
  };
  onSelectAccount: (accountId: string) => void;
}

export const NetworkView: React.FC<NetworkViewProps> = ({ network, onSelectAccount }) => {
  const [selectedRingId, setSelectedRingId] = useState<string | null>(
    network.detected_rings[0]?.ring_id || null
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'rings_only' | 'devices' | 'accounts'>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const activeRing = network.detected_rings.find((r) => r.ring_id === selectedRingId);

  // Compute graph coordinates for visual layout
  const layout = useMemo(() => {
    const nodes = network.nodes;
    const edges = network.edges;

    // Filter nodes if rings_only
    const ringAccountSet = new Set<string>();
    const ringDeviceSet = new Set<string>();
    network.detected_rings.forEach((r) => {
      ringDeviceSet.add(r.shared_device);
      r.accounts.forEach((a) => ringAccountSet.add(a));
    });

    const activeNodes = nodes.filter((n) => {
      if (filterType === 'rings_only') {
        return ringAccountSet.has(n.id) || ringDeviceSet.has(n.id);
      }
      if (filterType === 'devices') return n.type === 'device';
      if (filterType === 'accounts') return n.type === 'account';
      return true;
    });

    const nodeIds = new Set(activeNodes.map((n) => n.id));
    const activeEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

    // Arrange in circular or layered clusters
    const width = 800;
    const height = 520;
    const centerX = width / 2;
    const centerY = height / 2;

    const positions: Record<string, { x: number; y: number }> = {};

    // Put shared devices in center rings
    const sharedDevices = activeNodes.filter((n) => n.type === 'device' && ringDeviceSet.has(n.id));
    sharedDevices.forEach((dev, idx) => {
      const angle = (idx / Math.max(sharedDevices.length, 1)) * 2 * Math.PI;
      const r = 90;
      positions[dev.id] = {
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
      };
    });

    // Accounts on middle ring
    const accounts = activeNodes.filter((n) => n.type === 'account');
    accounts.forEach((acc, idx) => {
      const angle = (idx / Math.max(accounts.length, 1)) * 2 * Math.PI;
      const r = 210;
      positions[acc.id] = {
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
      };
    });

    // Other devices, merchants, locations on outer ring
    const others = activeNodes.filter(
      (n) => n.type !== 'account' && !(n.type === 'device' && ringDeviceSet.has(n.id))
    );
    others.forEach((node, idx) => {
      const angle = (idx / Math.max(others.length, 1)) * 2 * Math.PI;
      const r = 290;
      positions[node.id] = {
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
      };
    });

    return {
      nodes: activeNodes,
      edges: activeEdges,
      positions,
      width,
      height,
    };
  }, [network, filterType]);

  const selectedNode = network.nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-950/80 border border-red-800 text-red-400">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Fraud Ring & Relationship Graph</h2>
              <p className="text-xs text-slate-400">
                Visualizing entity connections across Accounts, Devices, Merchants, and Geographic Origins
              </p>
            </div>
          </div>
        </div>

        {/* Filter & View Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            {[
              { id: 'all', label: 'All Entities' },
              { id: 'rings_only', label: 'Fraud Rings Only' },
              { id: 'devices', label: 'Devices' },
              { id: 'accounts', label: 'Accounts' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={`px-2.5 py-1 rounded text-xs transition ${
                  filterType === f.id
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.6, z + 0.15))}
              className="p-1 text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
              className="p-1 text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 text-slate-400 hover:text-white"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Detected Fraud Rings Cards */}
      {network.detected_rings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {network.detected_rings.map((ring) => {
            const isSelected = selectedRingId === ring.ring_id;
            return (
              <div
                key={ring.ring_id}
                onClick={() => setSelectedRingId(ring.ring_id)}
                className={`p-4 rounded-xl border cursor-pointer transition shadow-sm ${
                  isSelected
                    ? 'bg-red-950/40 border-red-600 ring-1 ring-red-500/30'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-red-400">{ring.ring_id}</span>
                    <span className="text-[11px] font-semibold text-white">{ring.description}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-red-950 text-red-300 font-mono border border-red-800">
                    {ring.account_count} accounts
                  </span>
                </div>

                <div className="text-xs text-slate-400 space-y-1">
                  <p>
                    <span className="text-slate-500 font-medium">Shared Device:</span>{' '}
                    <strong className="text-cyan-400 font-mono">{ring.shared_device}</strong>
                  </p>
                  <p className="truncate">
                    <span className="text-slate-500 font-medium">Syndicate Accounts:</span>{' '}
                    <span className="text-slate-200 font-mono">{ring.accounts.join(', ')}</span>
                  </p>
                  {ring.common_merchants.length > 0 && (
                    <p>
                      <span className="text-slate-500 font-medium">Target Merchant:</span>{' '}
                      <span className="text-amber-300">{ring.common_merchants.join(', ')}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Interactive Graph & Inspector Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SVG Graph Canvas */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-hidden relative min-h-[540px] flex items-center justify-center">
          {/* Legend */}
          <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-lg p-2.5 text-[11px] space-y-1.5 shadow">
            <span className="font-bold text-slate-300 block uppercase tracking-wider text-[10px]">
              Entity Key
            </span>
            <div className="flex items-center gap-2 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <span>Account</span>
            </div>
            <div className="flex items-center gap-2 text-purple-400">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span>Shared Device (Ring)</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Merchant</span>
            </div>
            <div className="flex items-center gap-2 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Location</span>
            </div>
            <div className="flex items-center gap-2 text-red-400 border-t border-slate-800 pt-1">
              <span className="w-3 h-0.5 bg-red-500" />
              <span>Suspicious Link</span>
            </div>
          </div>

          {/* Graph SVG */}
          <div
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease-out',
            }}
            className="w-full flex justify-center"
          >
            <svg
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              className="w-full h-[520px] select-none"
            >
              {/* Edges */}
              <g className="edges">
                {layout.edges.map((e, idx) => {
                  const p1 = layout.positions[e.source];
                  const p2 = layout.positions[e.target];
                  if (!p1 || !p2) return null;

                  return (
                    <line
                      key={idx}
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={e.is_suspicious ? '#ef4444' : '#334155'}
                      strokeWidth={e.is_suspicious ? 2 : 1}
                      strokeDasharray={e.is_suspicious ? '4,4' : undefined}
                      opacity={e.is_suspicious ? 0.9 : 0.4}
                    />
                  );
                })}
              </g>

              {/* Nodes */}
              <g className="nodes">
                {layout.nodes.map((n) => {
                  const pos = layout.positions[n.id];
                  if (!pos) return null;

                  const isSelected = selectedNodeId === n.id;
                  const isAccount = n.type === 'account';
                  const isDevice = n.type === 'device';
                  const isMerchant = n.type === 'merchant';
                  const isLocation = n.type === 'location';

                  let fill = '#06b6d4'; // cyan account
                  if (isDevice) fill = n.risk_score >= 60 ? '#ef4444' : '#a855f7';
                  else if (isMerchant) fill = '#10b981';
                  else if (isLocation) fill = '#f59e0b';

                  return (
                    <g
                      key={n.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onClick={() => setSelectedNodeId(n.id)}
                      className="cursor-pointer group"
                    >
                      <circle
                        r={isSelected ? 16 : isAccount ? 12 : 10}
                        fill={fill}
                        stroke={isSelected ? '#ffffff' : '#0f172a'}
                        strokeWidth={isSelected ? 3 : 1.5}
                        className="transition-all"
                      />
                      <text
                        y={22}
                        textAnchor="middle"
                        fill="#cbd5e1"
                        fontSize={9}
                        fontFamily="monospace"
                        className="pointer-events-none drop-shadow"
                      >
                        {n.label.length > 15 ? n.label.slice(0, 14) + '…' : n.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>

        {/* Selected Entity Inspector Panel */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Network Node Inspector
            </h3>
          </div>

          {selectedNode ? (
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Entity Label</span>
                <p className="font-mono font-bold text-sm text-white break-all">{selectedNode.label}</p>
                <span className="text-[10px] uppercase font-bold text-cyan-400">{selectedNode.type}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Node Risk Score</span>
                <RiskBadge score={selectedNode.risk_score} size="sm" />
              </div>

              {selectedNode.type === 'account' && (
                <button
                  onClick={() => onSelectAccount(selectedNode.id)}
                  className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 font-semibold text-xs text-white flex items-center justify-center gap-1.5 transition shadow"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Open Account Investigation</span>
                </button>
              )}

              {/* Connected Edges */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Relationships
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {network.edges
                    .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((e, idx) => {
                      const other = e.source === selectedNode.id ? e.target : e.source;
                      return (
                        <div
                          key={idx}
                          className="p-2 rounded bg-slate-950/70 border border-slate-800 text-[11px] flex items-center justify-between"
                        >
                          <span className="font-mono text-slate-300 truncate max-w-[150px]">{other}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{e.relationship}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500 text-xs">
              Click on any node in the relationship network to inspect connected accounts, shared devices, and fraud indicators.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
