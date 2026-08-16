import { motion } from 'framer-motion';

interface ScoreBarProps {
  score: number; // 0..1
  animated?: boolean;
}

export function ScoreBar({ score, animated = true }: ScoreBarProps) {
  const pct = Math.min(100, Math.round(score * 100));
  const color =
    pct >= 80 ? 'var(--success)' :
    pct >= 55 ? 'var(--accent)' :
    pct >= 35 ? 'var(--warning)' :
    'var(--danger)';

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={animated ? { width: '0%' } : { width: `${pct}%` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        />
      </div>
      <span className="tabular text-[0.68rem] font-semibold text-[var(--muted)] w-8 text-right">
        {pct}%
      </span>
    </div>
  );
}
