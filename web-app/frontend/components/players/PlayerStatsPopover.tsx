'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/Badge';
import {
  fetchPlayerByUUID,
  searchPlayers,
  findPlayerByName,
  getRarityBadgeColor,
  calculateTrueOverall,
  MLBTheShowPlayer,
  PlayerSearchResult,
} from '@/lib/mlb-theshow-api';
import {
  User,
  Loader2,
  Star,
  Target,
  Zap,
  TrendingUp,
  X,
} from 'lucide-react';

interface PlayerStatsPopoverProps {
  playerName: string;
  playerUUID?: string;
  position?: string;
  children?: React.ReactNode;
  trigger?: 'hover' | 'click';
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export function PlayerStatsPopover({
  playerName,
  playerUUID,
  position,
  children,
  trigger = 'click',
  placement = 'bottom',
}: PlayerStatsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [player, setPlayer] = useState<MLBTheShowPlayer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const loadPlayer = async () => {
    if (player) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Try UUID first if available
      if (playerUUID) {
        const data = await fetchPlayerByUUID(playerUUID);
        if (data) {
          setPlayer(data);
          return;
        }
      }
      
      // Use fuzzy name search as fallback
      const bestMatch = await findPlayerByName(playerName, {
        position: position,
      });
      
      if (bestMatch) {
        // Fetch full player data using the UUID from the match
        const fullData = await fetchPlayerByUUID(bestMatch.uuid);
        if (fullData) {
          setPlayer(fullData);
          return;
        }
      }
      
      // Last resort: try basic search
      const results = await searchPlayers(playerName, {
        position: position,
      });
      
      if (results.length > 0) {
        const fullData = await fetchPlayerByUUID(results[0].uuid);
        if (fullData) {
          setPlayer(fullData);
          return;
        }
      }
      
      setError('Player not found in database');
    } catch (err) {
      console.error('Failed to load player:', err);
      setError('Failed to load player');
    } finally {
      setLoading(false);
    }
  };

  const handleTrigger = () => {
    if (trigger === 'click') {
      const newState = !isOpen;
      setIsOpen(newState);
      if (newState && !player) {
        loadPlayer();
      }
    }
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsOpen(true);
      if (!player) {
        loadPlayer();
      }
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsOpen(false);
    }
  };

  const getRarityColorClass = (r: string) => {
    switch (r) {
      case 'Diamond': return 'text-cyan-400';
      case 'Gold': return 'text-yellow-400';
      case 'Silver': return 'text-slate-300';
      case 'Bronze': return 'text-orange-400';
      default: return 'text-zinc-400';
    }
  };

  const getRarityBgClass = (r: string) => {
    switch (r) {
      case 'Diamond': return 'bg-cyan-500/20 border-cyan-500/40';
      case 'Gold': return 'bg-yellow-500/20 border-yellow-500/40';
      case 'Silver': return 'bg-slate-400/20 border-slate-400/40';
      case 'Bronze': return 'bg-orange-500/20 border-orange-500/40';
      default: return 'bg-zinc-500/20 border-zinc-500/40';
    }
  };

  const trueOverall = player ? calculateTrueOverall(player) : null;

  const getPopoverPosition = () => {
    switch (placement) {
      case 'top': return 'bottom-full mb-2 left-1/2 -translate-x-1/2';
      case 'bottom': return 'top-full mt-2 left-1/2 -translate-x-1/2';
      case 'left': return 'right-full mr-2 top-1/2 -translate-y-1/2';
      case 'right': return 'left-full ml-2 top-1/2 -translate-y-1/2';
      default: return 'top-full mt-2 left-1/2 -translate-x-1/2';
    }
  };

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onClick={handleTrigger}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={trigger === 'click' ? 'cursor-pointer' : ''}
      >
        {children || (
          <span className="text-cyan-400 hover:text-cyan-300 underline decoration-dotted underline-offset-2">
            {playerName}
          </span>
        )}
      </div>

      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-50 w-80 ${getPopoverPosition()}`}
          onMouseEnter={() => trigger === 'hover' && setIsOpen(true)}
          onMouseLeave={() => trigger === 'hover' && setIsOpen(false)}
        >
          <div className={`rounded-xl border shadow-xl backdrop-blur-sm ${
            player ? getRarityBgClass(player.rarity) : 'bg-slate-800/95 border-slate-700'
          }`}>
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-red-400 text-sm">{error}</p>
                <p className="text-slate-500 text-xs mt-1">Try searching in Player Database</p>
              </div>
            ) : player ? (
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-700/50 flex-shrink-0">
                    {player.baked_img ? (
                      <img 
                        src={player.baked_img} 
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-8 h-8 text-slate-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-2xl font-bold ${getRarityColorClass(player.rarity)}`}>
                        {player.ovr}
                      </span>
                      <Badge className={`${getRarityBgClass(player.rarity)} text-xs`}>
                        {player.rarity}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-white truncate">{player.name}</h3>
                    <p className="text-sm text-slate-400">
                      {player.display_position} | {player.team_short_name}
                    </p>
                    {trueOverall && (
                      <p className="text-xs text-purple-400 flex items-center gap-1 mt-1">
                        <Star className="w-3 h-3" />
                        True Overall: {trueOverall.toFixed(1)}
                      </p>
                    )}
                  </div>
                  {trigger === 'click' && (
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded hover:bg-white/10 transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>

                {/* Key Stats */}
                <div className="space-y-3">
                  {player.is_hitter ? (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-slate-800/50">
                        <p className="text-xs text-slate-400">Con L/R</p>
                        <p className="text-sm font-medium text-white">
                          {player.contact_left}/{player.contact_right}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/50">
                        <p className="text-xs text-slate-400">Pwr L/R</p>
                        <p className="text-sm font-medium text-white">
                          {player.power_left}/{player.power_right}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/50">
                        <p className="text-xs text-slate-400">Speed</p>
                        <p className="text-sm font-medium text-white">{player.speed}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/50">
                        <p className="text-xs text-slate-400">Vision</p>
                        <p className="text-sm font-medium text-white">{player.plate_vision}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/50">
                        <p className="text-xs text-slate-400">Disc</p>
                        <p className="text-sm font-medium text-white">{player.plate_discipline}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/50">
                        <p className="text-xs text-slate-400">Field</p>
                        <p className="text-sm font-medium text-white">{player.fielding_ability}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-slate-800/50">
                        <p className="text-xs text-slate-400">Velo</p>
                        <p className="text-sm font-medium text-white">{player.pitch_velocity}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/50">
                        <p className="text-xs text-slate-400">Ctrl</p>
                        <p className="text-sm font-medium text-white">{player.pitch_control}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/50">
                        <p className="text-xs text-slate-400">Break</p>
                        <p className="text-sm font-medium text-white">{player.pitch_movement}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/50">
                        <p className="text-xs text-slate-400">H/9</p>
                        <p className="text-sm font-medium text-white">{player.hits_per_bf}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/50">
                        <p className="text-xs text-slate-400">K/9</p>
                        <p className="text-sm font-medium text-white">{player.k_per_bf}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/50">
                        <p className="text-xs text-slate-400">BB/9</p>
                        <p className="text-sm font-medium text-white">{player.bb_per_bf}</p>
                      </div>
                    </div>
                  )}

                  {/* Quirks preview */}
                  {player.quirks && player.quirks.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {player.quirks.slice(0, 3).map((quirk, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                          {quirk.name}
                        </Badge>
                      ))}
                      {player.quirks.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{player.quirks.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Loading player...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlayerStatsPopover;
