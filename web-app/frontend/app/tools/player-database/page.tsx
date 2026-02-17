'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search,
  Database,
  Filter,
  X,
  ChevronDown,
  ArrowLeft,
  User,
  TrendingUp,
  Zap,
  Target,
  Eye,
  Shield,
  Star,
  Plus,
  Scale,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import {
  searchPlayers,
  fetchPlayerByUUID,
  getRarityColor,
  getRarityBadgeColor,
  calculateTrueOverall,
  comparePlayersAttributes,
  type MLBTheShowPlayer,
  type PlayerSearchResult,
} from '@/lib/mlb-theshow-api';

// MLB Teams for filter
const MLB_TEAMS = [
  { value: '', label: 'All Teams' },
  { value: 'ARI', label: 'Arizona Diamondbacks' },
  { value: 'ATL', label: 'Atlanta Braves' },
  { value: 'BAL', label: 'Baltimore Orioles' },
  { value: 'BOS', label: 'Boston Red Sox' },
  { value: 'CHC', label: 'Chicago Cubs' },
  { value: 'CWS', label: 'Chicago White Sox' },
  { value: 'CIN', label: 'Cincinnati Reds' },
  { value: 'CLE', label: 'Cleveland Guardians' },
  { value: 'COL', label: 'Colorado Rockies' },
  { value: 'DET', label: 'Detroit Tigers' },
  { value: 'HOU', label: 'Houston Astros' },
  { value: 'KC', label: 'Kansas City Royals' },
  { value: 'LAA', label: 'Los Angeles Angels' },
  { value: 'LAD', label: 'Los Angeles Dodgers' },
  { value: 'MIA', label: 'Miami Marlins' },
  { value: 'MIL', label: 'Milwaukee Brewers' },
  { value: 'MIN', label: 'Minnesota Twins' },
  { value: 'NYM', label: 'New York Mets' },
  { value: 'NYY', label: 'New York Yankees' },
  { value: 'OAK', label: 'Oakland Athletics' },
  { value: 'PHI', label: 'Philadelphia Phillies' },
  { value: 'PIT', label: 'Pittsburgh Pirates' },
  { value: 'SD', label: 'San Diego Padres' },
  { value: 'SF', label: 'San Francisco Giants' },
  { value: 'SEA', label: 'Seattle Mariners' },
  { value: 'STL', label: 'St. Louis Cardinals' },
  { value: 'TB', label: 'Tampa Bay Rays' },
  { value: 'TEX', label: 'Texas Rangers' },
  { value: 'TOR', label: 'Toronto Blue Jays' },
  { value: 'WSH', label: 'Washington Nationals' },
];

const POSITIONS = [
  { value: '', label: 'All Positions' },
  { value: 'C', label: 'Catcher' },
  { value: '1B', label: 'First Base' },
  { value: '2B', label: 'Second Base' },
  { value: '3B', label: 'Third Base' },
  { value: 'SS', label: 'Shortstop' },
  { value: 'LF', label: 'Left Field' },
  { value: 'CF', label: 'Center Field' },
  { value: 'RF', label: 'Right Field' },
  { value: 'SP', label: 'Starting Pitcher' },
  { value: 'RP', label: 'Relief Pitcher' },
  { value: 'CP', label: 'Closer' },
];

const RARITIES = [
  { value: '', label: 'All Rarities' },
  { value: 'Diamond', label: 'Diamond' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Silver', label: 'Silver' },
  { value: 'Bronze', label: 'Bronze' },
  { value: 'Common', label: 'Common' },
];

// Player Card Component
function PlayerCard({ 
  player, 
  onClick,
  onCompare,
  isComparing,
}: { 
  player: PlayerSearchResult;
  onClick: () => void;
  onCompare?: () => void;
  isComparing?: boolean;
}) {
  return (
    <Card 
      className={`group cursor-pointer hover:border-jkap-red-500/50 transition-all ${
        isComparing ? 'ring-2 ring-cyan-500' : ''
      }`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Player Image */}
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {player.baked_img ? (
              <img 
                src={player.baked_img} 
                alt={player.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-player.png';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            {/* Rarity indicator */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${getRarityBadgeColor(player.rarity)}`} />
          </div>
          
          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-lg font-bold ${
                player.rarity === 'Diamond' ? 'text-cyan-400' :
                player.rarity === 'Gold' ? 'text-yellow-400' :
                'text-foreground'
              }`}>
                {player.ovr}
              </span>
              <span className="text-sm text-muted-foreground">
                {player.display_position}
              </span>
            </div>
            <h3 className="font-semibold text-foreground truncate">
              {player.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {player.team}
            </p>
          </div>
          
          {/* Compare Button */}
          {onCompare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCompare();
              }}
              className={`p-2 rounded-lg transition-colors ${
                isComparing 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
              }`}
              title={isComparing ? 'Remove from comparison' : 'Add to comparison'}
            >
              <Scale className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

// Attribute Bar Component
function AttributeBar({ 
  label, 
  value, 
  maxValue = 125,
}: { 
  label: string; 
  value: number;
  maxValue?: number;
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
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-20 truncate">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className={`text-sm font-medium w-8 text-right ${
        value >= 90 ? 'text-cyan-400' :
        value >= 80 ? 'text-yellow-400' :
        'text-foreground'
      }`}>
        {value}
      </span>
    </div>
  );
}

// Player Detail Modal
function PlayerDetailModal({ 
  player, 
  onClose,
  onAddToRoster,
}: { 
  player: MLBTheShowPlayer;
  onClose: () => void;
  onAddToRoster?: () => void;
}) {
  const trueOverall = calculateTrueOverall(player);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-border bg-gradient-to-r from-muted/50 to-transparent">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-start gap-6">
            {/* Player Image */}
            <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-muted flex-shrink-0">
              {player.baked_img ? (
                <img 
                  src={player.baked_img} 
                  alt={player.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
              <div className={`absolute bottom-0 left-0 right-0 h-2 ${getRarityBadgeColor(player.rarity)}`} />
            </div>
            
            {/* Player Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-4xl font-bold ${
                  player.rarity === 'Diamond' ? 'text-cyan-400' :
                  player.rarity === 'Gold' ? 'text-yellow-400' :
                  'text-foreground'
                }`}>
                  {player.ovr}
                </span>
                <Badge className={getRarityColor(player.rarity)}>
                  {player.rarity}
                </Badge>
                <Badge variant="outline">
                  {player.display_position}
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                {player.name}
              </h2>
              <p className="text-muted-foreground">
                {player.team} • #{player.jersey_number}
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="text-muted-foreground">
                  {player.bat_hand === 'S' ? 'Switch' : player.bat_hand === 'L' ? 'Left' : 'Right'} / {player.throw_hand === 'L' ? 'Left' : 'Right'}
                </span>
                <span className="text-muted-foreground">
                  {player.height} • {player.weight} lbs
                </span>
                <span className="text-muted-foreground">
                  Age {player.age}
                </span>
              </div>
              
              {/* True Overall */}
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <Star className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-400">True Overall:</span>
                <span className="text-lg font-bold text-purple-400">{trueOverall.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Hitting / Main Attributes */}
            {player.is_hitter ? (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-jkap-red-500" />
                  Hitting
                </h3>
                <div className="space-y-3">
                  <AttributeBar label="Contact L" value={player.contact_left} />
                  <AttributeBar label="Contact R" value={player.contact_right} />
                  <AttributeBar label="Power L" value={player.power_left} />
                  <AttributeBar label="Power R" value={player.power_right} />
                  <AttributeBar label="Vision" value={player.plate_vision} />
                  <AttributeBar label="Discipline" value={player.plate_discipline} />
                  <AttributeBar label="Clutch" value={player.batting_clutch} />
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-jkap-red-500" />
                  Pitching
                </h3>
                <div className="space-y-3">
                  <AttributeBar label="Stamina" value={player.stamina} />
                  <AttributeBar label="H/9" value={player.hits_per_bf} />
                  <AttributeBar label="K/9" value={player.k_per_bf} />
                  <AttributeBar label="BB/9" value={player.bb_per_bf} />
                  <AttributeBar label="HR/9" value={player.hr_per_bf} />
                  <AttributeBar label="Velocity" value={player.pitch_velocity} />
                  <AttributeBar label="Control" value={player.pitch_control} />
                  <AttributeBar label="Movement" value={player.pitch_movement} />
                  <AttributeBar label="Clutch" value={player.pitching_clutch} />
                </div>
              </div>
            )}
            
            {/* Speed / Fielding */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                {player.is_hitter ? 'Speed & Fielding' : 'Pitch Arsenal'}
              </h3>
              
              {player.is_hitter ? (
                <div className="space-y-3">
                  <AttributeBar label="Speed" value={player.speed} />
                  <AttributeBar label="Stealing" value={player.baserunning_ability} />
                  <AttributeBar label="BR Aggr." value={player.baserunning_aggression} />
                  <AttributeBar label="Fielding" value={player.fielding_ability} />
                  <AttributeBar label="Arm Str." value={player.arm_strength} />
                  <AttributeBar label="Arm Acc." value={player.arm_accuracy} />
                  <AttributeBar label="Reaction" value={player.reaction_time} />
                  {player.display_position === 'C' && (
                    <AttributeBar label="Blocking" value={player.blocking} />
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {player.pitches && player.pitches.length > 0 ? (
                    player.pitches.map((pitch, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <span className="font-medium text-foreground">{pitch.name}</span>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            <span className="text-foreground font-medium">{pitch.speed}</span> mph
                          </span>
                          <span className="text-muted-foreground">
                            Ctrl: <span className="text-foreground font-medium">{pitch.control}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Mov: <span className="text-foreground font-medium">{pitch.movement}</span>
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">No pitch data available</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Quirks */}
          {player.quirks && player.quirks.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                Quirks
              </h3>
              <div className="flex flex-wrap gap-2">
                {player.quirks.map((quirk, idx) => (
                  <Badge key={idx} variant="outline" className="border-amber-500/30 text-amber-400">
                    {quirk.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {onAddToRoster && (
            <Button 
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={onAddToRoster}
            >
              Add to My Team
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Page Component
export default function PlayerDatabasePage() {
  const { isAuthenticated, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [rarityFilter, setRarityFilter] = useState('');
  const [minOvr, setMinOvr] = useState<number | ''>('');
  const [maxOvr, setMaxOvr] = useState<number | ''>('');
  
  const [players, setPlayers] = useState<PlayerSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [selectedPlayer, setSelectedPlayer] = useState<MLBTheShowPlayer | null>(null);
  const [loadingPlayer, setLoadingPlayer] = useState(false);
  
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Search function
  const handleSearch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    
    try {
      const results = await searchPlayers(searchQuery, {
        team: teamFilter || undefined,
        position: positionFilter || undefined,
        minOvr: minOvr ? Number(minOvr) : undefined,
        maxOvr: maxOvr ? Number(maxOvr) : undefined,
        rarity: rarityFilter as 'Diamond' | 'Gold' | 'Silver' | 'Bronze' | 'Common' | undefined,
      });
      
      setPlayers(results);
    } catch (err) {
      setError('Failed to search players. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, teamFilter, positionFilter, rarityFilter, minOvr, maxOvr]);

  // Load player details
  const handlePlayerClick = async (uuid: string) => {
    setLoadingPlayer(true);
    try {
      const player = await fetchPlayerByUUID(uuid);
      if (player) {
        setSelectedPlayer(player);
      }
    } catch (err) {
      console.error('Failed to load player:', err);
    } finally {
      setLoadingPlayer(false);
    }
  };

  // Toggle compare
  const toggleCompare = (uuid: string) => {
    setCompareList(prev => {
      if (prev.includes(uuid)) {
        return prev.filter(id => id !== uuid);
      }
      if (prev.length >= 2) {
        return [prev[1], uuid]; // Replace oldest
      }
      return [...prev, uuid];
    });
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setTeamFilter('');
    setPositionFilter('');
    setRarityFilter('');
    setMinOvr('');
    setMaxOvr('');
  };

  const hasActiveFilters = teamFilter || positionFilter || rarityFilter || minOvr || maxOvr;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        {/* Header */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-grid-pattern opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-background" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <Link 
              href="/tools"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tools
            </Link>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                <Database className="w-7 h-7 text-white" />
              </div>
              <div>
                <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 mb-1">
                  Live Series Only
                </Badge>
                <h1 className="font-display text-4xl text-foreground">
                  PLAYER DATABASE
                </h1>
              </div>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Search and browse all Live Series players. View attributes, compare cards, 
              and research for drafts and trades.
            </p>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="py-6 border-b border-border bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Search Bar */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search players by name..."
                  className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                icon={<Filter className="w-4 h-4" />}
                className={hasActiveFilters ? 'border-cyan-500 text-cyan-400' : ''}
              >
                Filters {hasActiveFilters && `(${[teamFilter, positionFilter, rarityFilter, minOvr, maxOvr].filter(Boolean).length})`}
              </Button>
              <Button
                variant="primary"
                onClick={handleSearch}
                disabled={isLoading}
                icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              >
                Search
              </Button>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-card rounded-xl border border-border">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Team</label>
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {MLB_TEAMS.map(team => (
                      <option key={team.value} value={team.value}>{team.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Position</label>
                  <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {POSITIONS.map(pos => (
                      <option key={pos.value} value={pos.value}>{pos.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Rarity</label>
                  <select
                    value={rarityFilter}
                    onChange={(e) => setRarityFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {RARITIES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Min OVR</label>
                  <input
                    type="number"
                    value={minOvr}
                    onChange={(e) => setMinOvr(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    min={0}
                    max={99}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Max OVR</label>
                  <input
                    type="number"
                    value={maxOvr}
                    onChange={(e) => setMaxOvr(e.target.value ? Number(e.target.value) : '')}
                    placeholder="99"
                    min={0}
                    max={99}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                
                {hasActiveFilters && (
                  <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Results */}
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
                <p className="text-muted-foreground">Searching Live Series players...</p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="text-center py-20">
                <p className="text-red-400 mb-4">{error}</p>
                <Button variant="outline" onClick={handleSearch}>
                  Try Again
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && hasSearched && players.length === 0 && (
              <div className="text-center py-20">
                <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No players found</h3>
                <p className="text-muted-foreground">Try adjusting your search or filters</p>
              </div>
            )}

            {/* Initial State */}
            {!isLoading && !error && !hasSearched && (
              <div className="text-center py-20">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Search Live Series Players</h3>
                <p className="text-muted-foreground mb-6">
                  Enter a player name or use filters to find cards
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setRarityFilter('Diamond'); handleSearch(); }}>
                    Diamond Cards
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setPositionFilter('SP'); handleSearch(); }}>
                    Starting Pitchers
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setMinOvr(90); handleSearch(); }}>
                    90+ OVR
                  </Button>
                </div>
              </div>
            )}

            {/* Results Grid */}
            {!isLoading && !error && players.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <p className="text-muted-foreground">
                    Found <span className="text-foreground font-medium">{players.length}</span> players
                  </p>
                  {compareList.length > 0 && (
                    <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                      {compareList.length}/2 selected for comparison
                    </Badge>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {players.map(player => (
                    <PlayerCard
                      key={player.uuid}
                      player={player}
                      onClick={() => handlePlayerClick(player.uuid)}
                      onCompare={() => toggleCompare(player.uuid)}
                      isComparing={compareList.includes(player.uuid)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onAddToRoster={() => {
            // TODO: Add to roster functionality
            alert('Add to roster coming soon!');
          }}
        />
      )}

      {/* Loading Player Overlay */}
      {loadingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card p-6 rounded-xl">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mx-auto" />
            <p className="text-muted-foreground mt-2">Loading player...</p>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
