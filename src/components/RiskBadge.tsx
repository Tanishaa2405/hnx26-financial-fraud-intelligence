import React from 'react';
import { RiskLevel } from '../types/fraud';

interface RiskBadgeProps {
  score?: number;
  level?: RiskLevel | string;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ score, level, size = 'md', showScore = true }) => {
  // Determine risk category if level is string or score provided
  let calculatedLevel = level || 'Low Risk';
  if (score !== undefined) {
    if (score >= 80) calculatedLevel = 'Critical Risk';
    else if (score >= 60) calculatedLevel = 'High Risk';
    else if (score >= 30) calculatedLevel = 'Medium Risk';
    else calculatedLevel = 'Low Risk';
  }

  const getStyle = () => {
    switch (calculatedLevel) {
      case 'Critical Risk':
      case 'Critical':
        return 'bg-red-950/80 text-red-400 border-red-700/60 ring-red-500/20';
      case 'High Risk':
      case 'High':
        return 'bg-amber-950/80 text-amber-400 border-amber-700/60 ring-amber-500/20';
      case 'Medium Risk':
      case 'Medium':
        return 'bg-yellow-950/70 text-yellow-300 border-yellow-700/50 ring-yellow-500/20';
      default:
        return 'bg-emerald-950/70 text-emerald-400 border-emerald-700/50 ring-emerald-500/20';
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3.5 py-1.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md font-medium border ring-1 ${sizeClasses[size]} ${getStyle()}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          calculatedLevel.includes('Critical')
            ? 'bg-red-400 animate-pulse'
            : calculatedLevel.includes('High')
            ? 'bg-amber-400'
            : calculatedLevel.includes('Medium')
            ? 'bg-yellow-400'
            : 'bg-emerald-400'
        }`}
      />
      <span>{calculatedLevel}</span>
      {showScore && score !== undefined && (
        <span className="font-mono opacity-80 pl-1 border-l border-current/30">
          {score}
        </span>
      )}
    </span>
  );
};
