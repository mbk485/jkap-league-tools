'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import {
  fetchPlayerByUUID,
  findPlayerByName,
  getRarityColor,
  getRarityBadgeColor,
  calculateTrueOverall,
  MLBTheShowPlayer,
} from '@/lib/mlb-theshow-api';
import {
  User,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  TrendingUp,
  Star,
} from 'lucide-react';

interface PlayerStatsCardProps {
  playerUUID?: string;
  playerName?: string;
  position?: string;
  team?: string;
  ovr?: number;
  rarity?: string;
  cardImg?: string;
  showExpandedStats?: boolean;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

function AttributeBar({ 
  label, 
  value, 
  maxValue = 125,
  compact = false,
}: { 
  label: string; 
  value: number;
  maxValue?: number;
  compact?: boolean;
}) {
  const percentage = (value / maxValue) * 100;
  const getColor = () => {
    if (value >= 90) return 'bg-cyan-500';
    if (value >= 80) return 'bg-yellow-500';
    if (value >= 70) return 'bg-emerald-500';
    if (value >= 60) return 'bg-blue-500';
    return 'bg-zinc-500';
  };
  
  return (
    <div className={`flex items-center gap-2 ${compact ? 'text-xs' : ''}`}>
      <span className={`text-muted-foreground ${compact ? 'w-12' : 'w-16'} truncate`}>{label}</span>
      <div className={`flex-1 ${compact ? 'h-1.5' : 'h-2'} bg-muted rounded-full overflow-hidden`}>
        <div 
          className={`h-full ${getColor()} transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className={`font-medium ${compact ? 'w-6' : 'w-8'} text-right ${
        value >= 90 ? 'text-cyan-400' :
        value >= 80 ? 'text-yellow-400' :
        'text-foreground'
      }`}>
        {value}
      </span>
    </div>
  );
}

export function PlayerStatsCard({
  playerUUID,
  playerName,
  position,
  team,
  ovr,
  rarity,
  cardImg,
  showExpandedStats = false,
  compact = false,
  onClick,
  className = '',
}: PlayerStatsCardProps) {
  const [player, setPlayer] = useState<MLBTheShowPlayer | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(showExpandedStats);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ((playerUUID || playerName) && (expanded || showExpandedStats)) {
      loadPlayerData();
    }
  }, [playerUUID, playerName, expanded, showExpandedStats]);

  const loadPlayerData = async () => {
    if (player) return;
    if (!playerUUID && !playerName) return;
    
    setLoading(true);
    setError(null);
    try {
      // Try UUID first
      if (playerUUID) {
        const data = await fetchPlayerByUUID(playerUUID);
        if (data) {
          setPlayer(data);
          return;
        }
      }
      
      // Fallback to fuzzy name search
      if (playerName) {
        const match = await findPlayerByName(playerName, { position });
        if (match) {
          const data = await fetchPlayerByUUID(match.uuid);
          if (data) {
            setPlayer(data);
            return;
          }
        }
      }
      
      setError('Player not found');
    } catch (err) {
      console.error('Failed to load player:', err);
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const displayName = player?.name || playerName || 'Unknown Player';
  const displayPosition = player?.display_position || position || '?';
  const displayTeam = player?.team || team || 'Unknown Team';
  const displayOvr = player?.ovr || ovr || 0;
  const displayRarity = player?.rarity || rarity || 'Common';
  const displayImg = player?.baked_img || cardImg;
  const trueOverall = player ? calculateTrueOverall(player) : null;

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
      case 'Diamond': return 'bg-cyan-500/10 border-cyan-500/30';
      case 'Gold': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'Silver': return 'bg-slate-400/10 border-slate-400/30';
      case 'Bronze': return 'bg-orange-500/10 border-orange-500/30';
      default: return 'bg-zinc-500/10 border-zinc-500/30';
    }
  };

  return (
    <div 
      className={`rounded-xl border transition-all ${getRarityBgClass(displayRarity)} ${
        onClick ? 'cursor-pointer hover:border-opacity-50' : ''
      } ${className}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className={`flex items-center gap-3 ${compact ? 'p-3' : 'p-4'}`}>
        {/* Player Image */}
        <div className={`relative ${compact ? 'w-12 h-12' : 'w-16 h-16'} rounded-lg overflow-hidden bg-muted flex-shrink-0`}>
          {displayImg ? (
            <img 
              src={displayImg} 
              alt={displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} text-muted-foreground`} />
            </div>
          )}
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${getRarityBadgeColor(displayRarity)}`} />
        </div>
        
        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`${compact ? 'text-lg' : 'text-xl'} font-bold ${getRarityColorClass(displayRarity)}`}>
              {displayOvr}
            </span>
            <span className="text-sm text-muted-foreground">{displayPosition}</span>
            {trueOverall && (
              <span className="text-xs text-purple-400 flex items-center gap-1">
                <Star className="w-3 h-3" />
                {trueOverall.toFixed(1)}
              </span>
            )}
          </div>
          <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-foreground truncate`}>
            {displayName}
          </h3>
          <p className="text-sm text-muted-foreground truncate">{displayTeam}</p>
        </div>

        {/* Expand Button */}
        {playerUUID && !showExpandedStats && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
              if (!expanded && !player) {
                loadPlayerData();
              }
            }}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Expanded Stats */}
      {(expanded || showExpandedStats) && (
        <div className={`border-t border-current/10 ${compact ? 'p-3' : 'p-4'}`}>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-4 text-red-400 text-sm">{error}</div>
          ) : player ? (
            <div className="space-y-4">
              {/* Key Attributes */}
              {player.is_hitter ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Target className="w-3 h-3" /> Hitting
                  </h4>
                  <div className="space-y-1.5">
                    <AttributeBar label="Con L" value={player.contact_left} compact={compact} />
                    <AttributeBar label="Con R" value={player.contact_right} compact={compact} />
                    <AttributeBar label="Pwr L" value={player.power_left} compact={compact} />
                    <AttributeBar label="Pwr R" value={player.power_right} compact={compact} />
                    <AttributeBar label="Vision" value={player.plate_vision} compact={compact} />
                    <AttributeBar label="Disc" value={player.plate_discipline} compact={compact} />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Pitching
                  </h4>
                  <div className="space-y-1.5">
                    <AttributeBar label="Velo" value={player.pitch_velocity} compact={compact} />
                    <AttributeBar label="Ctrl" value={player.pitch_control} compact={compact} />
                    <AttributeBar label="Brk" value={player.pitch_movement} compact={compact} />
                    <AttributeBar label="H/9" value={player.hits_per_bf} compact={compact} />
                    <AttributeBar label="K/9" value={player.k_per_bf} compact={compact} />
                    <AttributeBar label="BB/9" value={player.bb_per_bf} compact={compact} />
                  </div>
                </div>
              )}

              {/* Speed/Fielding for hitters */}
              {player.is_hitter && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Speed & Defense
                  </h4>
                  <div className="space-y-1.5">
                    <AttributeBar label="Speed" value={player.speed} compact={compact} />
                    <AttributeBar label="Field" value={player.fielding_ability} compact={compact} />
                    <AttributeBar label="Arm" value={player.arm_strength} compact={compact} />
                  </div>
                </div>
              )}

              {/* Quirks */}
              {player.quirks && player.quirks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground">Quirks</h4>
                  <div className="flex flex-wrap gap-1">
                    {player.quirks.slice(0, 5).map((quirk, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                        {quirk.name}
                      </Badge>
                    ))}
                    {player.quirks.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{player.quirks.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No detailed stats available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PlayerStatsCard;
