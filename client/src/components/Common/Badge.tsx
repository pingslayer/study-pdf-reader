import React from 'react';
import { BlockType } from '../../types/pdf';

interface BadgeProps {
  type: BlockType;
  className?: string;
}

const typeStyles: Record<BlockType, { bg: string; text: string; label: string }> = {
  heading: { bg: 'bg-purple-900/60 border-purple-500/50', text: 'text-purple-300', label: 'Heading' },
  paragraph: { bg: 'bg-blue-900/60 border-blue-500/50', text: 'text-blue-300', label: 'Prose' },
  code: { bg: 'bg-emerald-900/60 border-emerald-500/50', text: 'text-emerald-300', label: 'Code' },
  caption: { bg: 'bg-amber-900/60 border-amber-500/50', text: 'text-amber-300', label: 'Caption' },
  figure: { bg: 'bg-cyan-900/60 border-cyan-500/50', text: 'text-cyan-300', label: 'Figure' },
  equation: { bg: 'bg-rose-900/60 border-rose-500/50', text: 'text-rose-300', label: 'Equation' },
  header: { bg: 'bg-slate-800/70 border-slate-600', text: 'text-slate-400', label: 'Header' },
  footer: { bg: 'bg-slate-800/70 border-slate-600', text: 'text-slate-400', label: 'Footer' },
  list: { bg: 'bg-indigo-900/60 border-indigo-500/50', text: 'text-indigo-300', label: 'List' },
};

export const Badge: React.FC<BadgeProps> = ({ type, className = '' }) => {
  const style = typeStyles[type] || typeStyles.paragraph;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider ${style.bg} ${style.text} ${className}`}
    >
      {style.label}
    </span>
  );
};
