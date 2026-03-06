'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  searchShowZonePlayers,
  getShowZoneRarityColor,
  formatPlayerForDeclaration,
  MLB_TEAMS,
  POSITIONS,
  ShowZonePlayer,
} from '@/lib/showzone-api';
import {
  searchPlayers,
  getRarityColor,
  MLBTheShowPlayer,
  PlayerSearchResult,
} from '@/lib/mlb-theshow-api';
import {
  Search,
  X,
  User,
  ChevronDown,
  Loader2,
  Star,
  CheckCircle,
} from 'lucide-react';

interface PlayerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlayer: (player: {
    player_name: string;
    position: string;
    classification: 'common' | 'bronze' | 'silver' | 'gold' | 'diamond';
    overall_rating: number;
    card_img?: string;
    player_uuid?: string;
    team_short_name?: string;
  }) => void;
  title?: string;
}

export function PlayerSearchModal({
  isOpen,
  onClose,
  onSelectPlayer,
  title = 'Search Players',
}: PlayerSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [positionFilter, setPositionFilter] = useState<string>('');
  const [rarityFilter, setRarityFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  const searchTimeout = React.useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async () => {
    if (!searchQuery && !teamFilter && !positionFilter && !rarityFilter) {
      setPlayers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use MLB The Show API for search (more reliable)
      const results = await searchPlayers(searchQuery, {
        team: teamFilter || undefined,
        position: positionFilter || undefined,
        rarity: rarityFilter || undefined,
      });

      setPlayers(results.slice(0, 50)); // Limit to 50 results
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search players. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, teamFilter, positionFilter, rarityFilter]);

  // Debounce search
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      performSearch();
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [performSearch]);

  // Handle player selection
  const handleSelectPlayer = (player: PlayerSearchResult) => {
    onSelectPlayer({
      player_name: player.name,
      position: player.display_position,
      classification: player.rarity.toLowerCase() as any,
      overall_rating: player.ovr,
      card_img: player.baked_img || player.img,
      player_uuid: player.uuid,
      team_short_name: player.team_short_name,
    });
    onClose();
  };

  // Get rarity badge color
  const getRarityBadgeClass = (rarity: string) => {
    switch (rarity) {
      case 'Diamond': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'Gold': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Silver': return 'bg-slate-400/20 text-slate-300 border-slate-400/30';
      case 'Bronze': return 'bg-orange-600/20 text-orange-400 border-orange-600/30';
      default: return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="bg-slate-800 border-slate-700 w-full max-w-2xl max-h-[85vh] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan-400" />
              {title}
            </CardTitle>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="space-y-3 mb-4 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by player name..."
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-3 gap-2">
              {/* Team Filter */}
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Teams</option>
                {MLB_TEAMS.map(team => (
                  <option key={team.abbr} value={team.abbr}>{team.abbr}</option>
                ))}
              </select>

              {/* Position Filter */}
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Positions</option>
                {POSITIONS.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>

              {/* Rarity Filter */}
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Rarities</option>
                <option value="Diamond">Diamond</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Bronze">Bronze</option>
                <option value="Common">Common</option>
              </select>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-400">
                <p>{error}</p>
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <User className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Search for Live Series players</p>
                <p className="text-sm mt-1">Type a name or use filters above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {players.map((player) => (
                  <button
                    key={player.uuid}
                    onClick={() => handleSelectPlayer(player)}
                    className="w-full p-3 rounded-xl bg-slate-700/30 border border-slate-600 hover:bg-slate-700/50 hover:border-cyan-500/50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Player Image */}
                      <div className="w-14 h-14 rounded-lg bg-slate-700/50 overflow-hidden flex-shrink-0">
                        {player.img ? (
                          <img
                            src={player.img}
                            alt={player.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <User className="w-6 h-6 text-slate-500" />
                          </div>
                        )}
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium truncate">{player.name}</span>
                          <Badge className={getRarityBadgeClass(player.rarity)}>
                            {player.rarity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <span>{player.team_short_name}</span>
                          <span>•</span>
                          <span>{player.display_position}</span>
                        </div>
                      </div>

                      {/* OVR */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <span className={`text-2xl font-bold ${
                          player.rarity === 'Diamond' ? 'text-cyan-400' :
                          player.rarity === 'Gold' ? 'text-yellow-400' :
                          player.rarity === 'Silver' ? 'text-slate-300' :
                          player.rarity === 'Bronze' ? 'text-orange-400' :
                          'text-zinc-400'
                        }`}>
                          {player.ovr}
                        </span>
                        <span className="text-xs text-slate-500">OVR</span>
                      </div>

                      {/* Select indicator */}
                      <CheckCircle className="w-5 h-5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PlayerSearchModal;
