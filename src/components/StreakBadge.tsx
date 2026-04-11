'use client';

import { useStreak } from '@/lib/StreakContext';
import { Flame, Trophy, TrendingUp } from 'lucide-react';

export function StreakBadge() {
  const { streak, isLoading } = useStreak();

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 animate-pulse">
        <div className="h-8 w-16 bg-white/10 rounded-lg" />
        <div className="h-8 w-16 bg-white/10 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
        <Flame className={`w-4 h-4 ${streak.currentStreak > 0 ? 'text-orange-400' : 'text-gray-500'}`} />
        <span className="text-sm font-bold text-white">{streak.currentStreak}</span>
        <span className="text-xs text-gray-400">Current</span>
      </div>
      
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30">
        <Trophy className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-bold text-white">{streak.bestStreak}</span>
        <span className="text-xs text-gray-400">Best</span>
      </div>
      
      {streak.totalPredictions > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-white">
            {Math.round((streak.totalCorrect / streak.totalPredictions) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
