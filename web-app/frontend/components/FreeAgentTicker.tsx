'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { UserMinus, ChevronRight, Star, X } from 'lucide-react';
import Link from 'next/link';

interface FreeAgent {
  id: string;
  player_name: string;
  position: string;
  classification: string;
  overall_rating: number;
  declaring_team_id: string;
  card_img?: string;
  team_short_name?: string;
}

const CLASSIFICATION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  diamond: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50' },
  gold: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/50' },
  silver: { bg: 'bg-slate-400/20', text: 'text-slate-300', border: 'border-slate-400/50' },
  bronze: { bg: 'bg-orange-700/20', text: 'text-orange-400', border: 'border-orange-700/50' },
  common: { bg: 'bg-slate-600/20', text: 'text-slate-400', border: 'border-slate-600/50' },
};

export function FreeAgentTicker() {
  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<FreeAgent | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const loadFreeAgents = async () => {
      try {
        const { getMasterFreeAgentList } = await import('@/lib/supabase');
        const agents = await getMasterFreeAgentList(4); // Season 4
        setFreeAgents(agents.filter(a => !a.is_claimed));
      } catch (err) {
        console.error('Failed to load free agents:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadFreeAgents();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 mb-6">
        <div className="flex items-center gap-2 text-slate-400">
          <UserMinus className="w-4 h-4 animate-pulse" />
          <span className="text-sm">Loading free agents...</span>
        </div>
      </div>
    );
  }

  if (freeAgents.length === 0) {
    return null; // Don't show if no free agents
  }

  const colors = (classification: string) => CLASSIFICATION_COLORS[classification] || CLASSIFICATION_COLORS.common;

  return (
    <>
      {/* Ticker Container */}
      <div 
        className="bg-gradient-to-r from-orange-500/10 via-slate-800/50 to-orange-500/10 border border-orange-500/30 rounded-xl p-3 mb-6 overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="flex items-center gap-3">
          {/* Label */}
          <div className="flex items-center gap-2 flex-shrink-0 pr-3 border-r border-orange-500/30">
            <UserMinus className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 font-medium text-sm whitespace-nowrap">FREE AGENTS</span>
            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
              {freeAgents.length}
            </Badge>
          </div>

          {/* Scrolling Ticker */}
          <div className="overflow-hidden flex-1 relative">
            <div 
              className={`flex gap-3 ${isPaused ? '' : 'animate-ticker'}`}
              style={{
                animation: isPaused ? 'none' : `ticker ${Math.max(20, freeAgents.length * 3)}s linear infinite`,
              }}
            >
              {/* Duplicate for seamless loop */}
              {[...freeAgents, ...freeAgents].map((agent, idx) => (
                <button
                  key={`${agent.id}-${idx}`}
                  onClick={() => setSelectedPlayer(agent)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:scale-105 flex-shrink-0 ${colors(agent.classification).bg} ${colors(agent.classification).border}`}
                >
                  <span className={`font-bold text-sm ${colors(agent.classification).text}`}>
                    {agent.overall_rating}
                  </span>
                  <span className="text-white text-sm font-medium whitespace-nowrap">
                    {agent.player_name}
                  </span>
                  <span className="text-slate-400 text-xs">
                    {agent.position}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* View All Link */}
          <Link 
            href="/offseason?tab=free-agents"
            className="flex items-center gap-1 text-orange-400 hover:text-orange-300 transition-colors flex-shrink-0 pl-3 border-l border-orange-500/30"
          >
            <span className="text-sm font-medium whitespace-nowrap">View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPlayer(null)}
        >
          <div 
            className={`bg-slate-800 border-2 rounded-2xl p-6 max-w-md w-full ${colors(selectedPlayer.classification).border}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold ${colors(selectedPlayer.classification).bg} ${colors(selectedPlayer.classification).text}`}>
                  {selectedPlayer.overall_rating}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedPlayer.player_name}</h3>
                  <p className="text-slate-400">{selectedPlayer.position}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50">
                <span className="text-slate-400">Classification</span>
                <Badge className={`${colors(selectedPlayer.classification).bg} ${colors(selectedPlayer.classification).text} ${colors(selectedPlayer.classification).border} capitalize`}>
                  {selectedPlayer.classification}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50">
                <span className="text-slate-400">Former Team</span>
                <span className="text-white font-medium">{selectedPlayer.declaring_team_id}</span>
              </div>
              {selectedPlayer.team_short_name && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50">
                  <span className="text-slate-400">MLB Team</span>
                  <span className="text-white font-medium">{selectedPlayer.team_short_name}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <Link
                href="/offseason?tab=claims"
                className="flex-1 bg-orange-500 hover:bg-orange-400 text-white font-medium py-3 px-4 rounded-xl text-center transition-colors"
                onClick={() => setSelectedPlayer(null)}
              >
                Submit Claim
              </Link>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticker Animation Styles */}
      <style jsx global>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          display: flex;
          width: max-content;
        }
      `}</style>
    </>
  );
}
