'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { PlayerStatsCard, PlayerStatsPopover } from '@/components/players';
import { PlayerSearchModal } from '@/components/offseason/PlayerSearchModal';
import {
  Users,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Grid,
  List,
  Download,
  Upload,
} from 'lucide-react';

interface RosterPlayer {
  id: string;
  player_name: string;
  position: string;
  lineup_position: string;
  overall_rating: number;
  classification: string;
  player_uuid?: string;
  card_img?: string;
  team_short_name?: string;
}

const LINEUP_POSITIONS = [
  { id: 'C', label: 'Catcher', order: 1 },
  { id: '1B', label: 'First Base', order: 2 },
  { id: '2B', label: 'Second Base', order: 3 },
  { id: '3B', label: 'Third Base', order: 4 },
  { id: 'SS', label: 'Shortstop', order: 5 },
  { id: 'LF', label: 'Left Field', order: 6 },
  { id: 'CF', label: 'Center Field', order: 7 },
  { id: 'RF', label: 'Right Field', order: 8 },
  { id: 'DH', label: 'Designated Hitter', order: 9 },
];

const PITCHING_POSITIONS = [
  { id: 'SP1', label: 'Starting Pitcher 1', order: 1 },
  { id: 'SP2', label: 'Starting Pitcher 2', order: 2 },
  { id: 'SP3', label: 'Starting Pitcher 3', order: 3 },
  { id: 'SP4', label: 'Starting Pitcher 4', order: 4 },
  { id: 'SP5', label: 'Starting Pitcher 5', order: 5 },
  { id: 'CP', label: 'Closer', order: 6 },
];

const BENCH_POSITIONS = [
  { id: 'BENCH1', label: 'Bench 1', order: 1 },
  { id: 'BENCH2', label: 'Bench 2', order: 2 },
  { id: 'BENCH3', label: 'Bench 3', order: 3 },
  { id: 'BENCH4', label: 'Bench 4', order: 4 },
  { id: 'BENCH5', label: 'Bench 5', order: 5 },
];

const BULLPEN_POSITIONS = [
  { id: 'RP1', label: 'Relief Pitcher 1', order: 1 },
  { id: 'RP2', label: 'Relief Pitcher 2', order: 2 },
  { id: 'RP3', label: 'Relief Pitcher 3', order: 3 },
  { id: 'RP4', label: 'Relief Pitcher 4', order: 4 },
];

function MyTeamContent() {
  const { user } = useAuth();
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedSections, setExpandedSections] = useState({
    lineup: true,
    pitching: true,
    bench: false,
    bullpen: false,
  });

  useEffect(() => {
    loadRoster();
  }, []);

  const loadRoster = async () => {
    setLoading(true);
    try {
      // Try to load from localStorage for now (can be moved to Supabase later)
      const savedRoster = localStorage.getItem('myTeamRoster');
      if (savedRoster) {
        setRoster(JSON.parse(savedRoster));
      }
    } catch (err) {
      console.error('Failed to load roster:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveRoster = async () => {
    setSaving(true);
    try {
      localStorage.setItem('myTeamRoster', JSON.stringify(roster));
      // Future: Save to Supabase
      // await saveUserRoster(user?.id, roster);
    } catch (err) {
      console.error('Failed to save roster:', err);
    } finally {
      setSaving(false);
    }
  };

  const addPlayerToPosition = (position: string, player: {
    player_name: string;
    position: string;
    classification: string;
    overall_rating: number;
    card_img?: string;
    player_uuid?: string;
    team_short_name?: string;
  }) => {
    const newPlayer: RosterPlayer = {
      id: `${position}-${Date.now()}`,
      player_name: player.player_name,
      position: player.position,
      lineup_position: position,
      overall_rating: player.overall_rating,
      classification: player.classification,
      player_uuid: player.player_uuid,
      card_img: player.card_img,
      team_short_name: player.team_short_name,
    };

    setRoster(prev => {
      // Remove any existing player at this position
      const filtered = prev.filter(p => p.lineup_position !== position);
      return [...filtered, newPlayer];
    });
    setShowPlayerSearch(false);
    setSelectedPosition(null);
  };

  const removePlayer = (playerId: string) => {
    setRoster(prev => prev.filter(p => p.id !== playerId));
  };

  const getPlayerAtPosition = (position: string): RosterPlayer | undefined => {
    return roster.find(p => p.lineup_position === position);
  };

  const calculateTeamOVR = () => {
    if (roster.length === 0) return 0;
    const total = roster.reduce((sum, p) => sum + p.overall_rating, 0);
    return Math.round(total / roster.length);
  };

  const getRarityColor = (classification: string) => {
    switch (classification?.toLowerCase()) {
      case 'diamond': return 'text-cyan-400';
      case 'gold': return 'text-yellow-400';
      case 'silver': return 'text-slate-300';
      case 'bronze': return 'text-orange-400';
      default: return 'text-zinc-400';
    }
  };

  const getRarityBgColor = (classification: string) => {
    switch (classification?.toLowerCase()) {
      case 'diamond': return 'bg-cyan-500/10 border-cyan-500/30';
      case 'gold': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'silver': return 'bg-slate-400/10 border-slate-400/30';
      case 'bronze': return 'bg-orange-500/10 border-orange-500/30';
      default: return 'bg-zinc-500/10 border-zinc-500/30';
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderPositionSlot = (pos: { id: string; label: string }) => {
    const player = getPlayerAtPosition(pos.id);

    return (
      <div
        key={pos.id}
        className={`relative rounded-xl border-2 border-dashed transition-all ${
          player 
            ? `border-solid ${getRarityBgColor(player.classification)}` 
            : 'border-slate-600 hover:border-cyan-500/50 bg-slate-800/30'
        }`}
      >
        {player ? (
          <div className="p-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <Badge variant="outline" className="text-xs bg-slate-800/50">
                {pos.id}
              </Badge>
              <button
                onClick={() => removePlayer(player.id)}
                className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            
            {player.player_uuid ? (
              <PlayerStatsCard
                playerUUID={player.player_uuid}
                playerName={player.player_name}
                position={player.position}
                ovr={player.overall_rating}
                rarity={player.classification.charAt(0).toUpperCase() + player.classification.slice(1)}
                cardImg={player.card_img}
                compact
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <span className={`text-xl font-bold ${getRarityColor(player.classification)}`}>
                    {player.overall_rating}
                  </span>
                </div>
                <div>
                  <PlayerStatsPopover playerName={player.player_name} position={player.position}>
                    <span className="font-medium text-white hover:text-cyan-400 cursor-pointer">
                      {player.player_name}
                    </span>
                  </PlayerStatsPopover>
                  <p className="text-sm text-slate-400">
                    {player.position} · <span className={`capitalize ${getRarityColor(player.classification)}`}>
                      {player.classification}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              setSelectedPosition(pos.id);
              setShowPlayerSearch(true);
            }}
            className="w-full p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm font-medium">{pos.label}</span>
            <span className="text-xs text-slate-500">Click to add player</span>
          </button>
        )}
      </div>
    );
  };

  const renderSection = (
    title: string, 
    sectionKey: keyof typeof expandedSections, 
    positions: { id: string; label: string }[],
    icon: React.ReactNode
  ) => {
    const sectionPlayers = roster.filter(p => 
      positions.some(pos => pos.id === p.lineup_position)
    );
    const avgOVR = sectionPlayers.length > 0 
      ? Math.round(sectionPlayers.reduce((sum, p) => sum + p.overall_rating, 0) / sectionPlayers.length)
      : 0;

    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="cursor-pointer" onClick={() => toggleSection(sectionKey)}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              {icon}
              {title}
              <Badge variant="outline" className="ml-2">
                {sectionPlayers.length}/{positions.length}
              </Badge>
              {avgOVR > 0 && (
                <Badge className="bg-slate-700 text-slate-200">
                  Avg: {avgOVR} OVR
                </Badge>
              )}
            </CardTitle>
            {expandedSections[sectionKey] ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </CardHeader>
        {expandedSections[sectionKey] && (
          <CardContent>
            <div className={`grid gap-3 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            }`}>
              {positions.map(pos => renderPositionSlot(pos))}
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-cyan-400" />
              My Team
            </h1>
            <p className="text-slate-400 mt-1">
              Build and manage your custom league roster
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Save Button */}
            <Button
              variant="primary"
              onClick={saveRoster}
              disabled={saving}
              className="bg-cyan-500 hover:bg-cyan-400"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Roster
            </Button>
          </div>
        </div>

        {/* Team Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-cyan-400">{roster.length}</p>
                <p className="text-sm text-slate-400">Players</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">{calculateTeamOVR()}</p>
                <p className="text-sm text-slate-400">Team OVR</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-purple-400">
                  {roster.filter(p => p.classification.toLowerCase() === 'diamond').length}
                </p>
                <p className="text-sm text-slate-400">Diamonds</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">
                  {25 - roster.length}
                </p>
                <p className="text-sm text-slate-400">Open Spots</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {renderSection('Starting Lineup', 'lineup', LINEUP_POSITIONS, <Star className="w-5 h-5 text-yellow-400" />)}
            {renderSection('Starting Rotation', 'pitching', PITCHING_POSITIONS, <TrendingUp className="w-5 h-5 text-cyan-400" />)}
            {renderSection('Bench', 'bench', BENCH_POSITIONS, <Users className="w-5 h-5 text-slate-400" />)}
            {renderSection('Bullpen', 'bullpen', BULLPEN_POSITIONS, <AlertCircle className="w-5 h-5 text-orange-400" />)}
          </div>
        )}

        {/* Player Search Modal */}
        <PlayerSearchModal
          isOpen={showPlayerSearch}
          onClose={() => {
            setShowPlayerSearch(false);
            setSelectedPosition(null);
          }}
          onSelectPlayer={(player) => {
            if (selectedPosition) {
              addPlayerToPosition(selectedPosition, player);
            }
          }}
          title={`Add Player to ${selectedPosition || 'Position'}`}
        />
      </main>

      <Footer />
    </div>
  );
}

export default function MyTeamPage() {
  return (
    <ProtectedRoute>
      <MyTeamContent />
    </ProtectedRoute>
  );
}
