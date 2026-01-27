'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/contexts/AuthContext';
import { 
  logGame, 
  getGameLogs, 
  getUserGameStats, 
  getLeaderboards,
  DBGameLog,
  LeaderboardEntry,
  saveRecentGame,
  savePlayersFromGame,
  getSavedPlayers,
  SavedPlayers,
} from '@/lib/supabase';
import { MLB_TEAMS } from '@/types/league';
import {
  Gamepad2,
  Trophy,
  Target,
  Flame,
  Plus,
  X,
  Check,
  Medal,
  Coins,
  TrendingUp,
  ChevronRight,
  Zap,
  Crown,
  Star,
  History,
  Award,
  Sparkles,
} from 'lucide-react';

interface HomeRunEntry {
  player: string;
  count: number;
}

export default function GameLoggerPage() {
  const { user, isAuthenticated } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'log' | 'history' | 'leaderboards'>('log');
  
  // Form state
  const [opponentTeam, setOpponentTeam] = useState('');
  const [userScore, setUserScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [gameNumber, setGameNumber] = useState('');
  const [winningPitcher, setWinningPitcher] = useState('');
  const [losingPitcher, setLosingPitcher] = useState('');
  const [savePitcher, setSavePitcher] = useState('');
  const [strikeouts, setStrikeouts] = useState('');
  const [homeRuns, setHomeRuns] = useState<HomeRunEntry[]>([]);
  const [newHRPlayer, setNewHRPlayer] = useState('');
  const [notes, setNotes] = useState('');
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; tokens?: number } | null>(null);
  
  // Data state
  const [gameLogs, setGameLogs] = useState<DBGameLog[]>([]);
  const [userStats, setUserStats] = useState<{
    gamesPlayed: number;
    wins: number;
    losses: number;
    winPct: string;
    totalHomeRuns: number;
    totalStrikeouts: number;
    currentWinStreak: number;
    tokens: number;
  } | null>(null);
  const [leaderboards, setLeaderboards] = useState<{
    homeRuns: LeaderboardEntry[];
    strikeouts: LeaderboardEntry[];
    wins: LeaderboardEntry[];
    saves: LeaderboardEntry[];
    gamesPlayed: LeaderboardEntry[];
  } | null>(null);
  
  // Saved players for autocomplete
  const [savedPlayers, setSavedPlayers] = useState<SavedPlayers>({ pitchers: [], hitters: [], lastUpdated: '' });
  const [showPitcherSuggestions, setShowPitcherSuggestions] = useState<'winning' | 'losing' | 'save' | null>(null);
  const [showHitterSuggestions, setShowHitterSuggestions] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    if (user?.id) {
      loadData();
      // Load saved player names
      setSavedPlayers(getSavedPlayers(user.id));
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    
    const [logs, stats, boards] = await Promise.all([
      getGameLogs(user.id, 20),
      getUserGameStats(user.id),
      getLeaderboards(),
    ]);
    
    setGameLogs(logs);
    setUserStats(stats);
    setLeaderboards(boards);
  };

  const handleAddHomeRun = () => {
    if (newHRPlayer.trim()) {
      const existing = homeRuns.find(hr => hr.player.toLowerCase() === newHRPlayer.toLowerCase());
      if (existing) {
        setHomeRuns(homeRuns.map(hr => 
          hr.player.toLowerCase() === newHRPlayer.toLowerCase() 
            ? { ...hr, count: hr.count + 1 }
            : hr
        ));
      } else {
        setHomeRuns([...homeRuns, { player: newHRPlayer.trim(), count: 1 }]);
      }
      setNewHRPlayer('');
    }
  };

  const handleRemoveHomeRun = (player: string) => {
    setHomeRuns(homeRuns.filter(hr => hr.player !== player));
  };

  const isWin = () => {
    const us = parseInt(userScore) || 0;
    const them = parseInt(opponentScore) || 0;
    return us > them;
  };

  const handleSubmit = async () => {
    if (!user?.id || !user?.teamId || !opponentTeam || !userScore || !opponentScore) {
      setSubmitResult({ success: false, message: 'Please fill in all required fields' });
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const result = await logGame({
        user_id: user.id,
        user_team_id: user.teamId,
        opponent_team_id: opponentTeam,
        user_score: parseInt(userScore),
        opponent_score: parseInt(opponentScore),
        is_win: isWin(),
        game_number: gameNumber ? parseInt(gameNumber) : undefined,
        game_date: new Date().toISOString().split('T')[0],
        winning_pitcher: isWin() ? winningPitcher || undefined : undefined,
        losing_pitcher: !isWin() ? losingPitcher || undefined : undefined,
        save_pitcher: savePitcher || undefined,
        user_strikeouts: strikeouts ? parseInt(strikeouts) : 0,
        home_runs_hit: homeRuns.length > 0 ? homeRuns : undefined,
        total_home_runs: homeRuns.reduce((sum, hr) => sum + hr.count, 0),
        notes: notes || undefined,
      });

      if (result.success) {
        // Save game to recent games for Game Recap auto-fill
        saveRecentGame(user.id, {
          userTeamId: user.teamId,
          opponentTeamId: opponentTeam,
          userScore: parseInt(userScore),
          opponentScore: parseInt(opponentScore),
          isWin: isWin(),
          gameNumber: gameNumber ? parseInt(gameNumber) : undefined,
          gameDate: new Date().toISOString().split('T')[0],
          winningPitcher: isWin() ? winningPitcher || undefined : undefined,
          losingPitcher: !isWin() ? losingPitcher || undefined : undefined,
          savePitcher: savePitcher || undefined,
          homeRuns: homeRuns.length > 0 ? homeRuns : undefined,
          strikeouts: strikeouts ? parseInt(strikeouts) : undefined,
          notes: notes || undefined,
        });
        
        // Save player names for autocomplete
        savePlayersFromGame(user.id, {
          winningPitcher: isWin() ? winningPitcher : undefined,
          losingPitcher: !isWin() ? losingPitcher : undefined,
          savePitcher: savePitcher || undefined,
          homeRuns: homeRuns.length > 0 ? homeRuns : undefined,
        });
        
        // Refresh saved players
        setSavedPlayers(getSavedPlayers(user.id));
        
        setSubmitResult({
          success: true,
          message: `Game logged! ${isWin() ? '🎉 Victory!' : 'Better luck next time!'} +1 Recap Credit earned!`,
          tokens: result.tokensEarned,
        });
        
        // Reset form
        setOpponentTeam('');
        setUserScore('');
        setOpponentScore('');
        setGameNumber('');
        setWinningPitcher('');
        setLosingPitcher('');
        setSavePitcher('');
        setStrikeouts('');
        setHomeRuns([]);
        setNotes('');
        
        // Reload data
        loadData();
      } else {
        setSubmitResult({ success: false, message: result.error || 'Failed to log game' });
      }
    } catch (err) {
      setSubmitResult({ success: false, message: 'An error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTeamName = (teamId: string) => {
    const team = MLB_TEAMS.find(t => t.id === teamId);
    return team?.name || teamId;
  };

  const getTeamAbbr = (teamId: string) => {
    const team = MLB_TEAMS.find(t => t.id === teamId);
    return team?.abbreviation || teamId;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Gamepad2 className="w-16 h-16 mx-auto text-jkap-red-500 mb-4" />
          <h1 className="font-display text-4xl text-foreground mb-4">GAME LOGGER</h1>
          <p className="text-muted-foreground mb-8">Sign in to log your games and earn rewards.</p>
          <Button as="link" href="/login" variant="primary">Sign In</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className={`mb-8 transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display text-3xl text-foreground">GAME LOGGER</h1>
              <p className="text-muted-foreground">Log games, earn tokens, climb the leaderboards</p>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        {userStats && (
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/30">
              <div className="flex items-center gap-2 text-emerald-400 mb-1">
                <Trophy className="w-4 h-4" />
                <span className="text-xs font-medium">RECORD</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{userStats.wins}-{userStats.losses}</p>
              <p className="text-xs text-muted-foreground">{userStats.winPct}% Win Rate</p>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-400 mb-1">
                <Coins className="w-4 h-4" />
                <span className="text-xs font-medium">TOKENS</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{userStats.tokens}</p>
              <p className="text-xs text-muted-foreground">Earned from logging</p>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-transparent border-orange-500/30">
              <div className="flex items-center gap-2 text-orange-400 mb-1">
                <Flame className="w-4 h-4" />
                <span className="text-xs font-medium">WIN STREAK</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{userStats.currentWinStreak}</p>
              <p className="text-xs text-muted-foreground">Current streak</p>
            </Card>
            
            <Card className="p-4 bg-gradient-to-br from-jkap-red-500/10 to-transparent border-jkap-red-500/30">
              <div className="flex items-center gap-2 text-jkap-red-400 mb-1">
                <Target className="w-4 h-4" />
                <span className="text-xs font-medium">HOME RUNS</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{userStats.totalHomeRuns}</p>
              <p className="text-xs text-muted-foreground">Total logged</p>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border pb-4">
          {[
            { id: 'log', label: 'Log Game', icon: Plus },
            { id: 'history', label: 'History', icon: History },
            { id: 'leaderboards', label: 'Leaderboards', icon: Medal },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-jkap-red-500 text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'log' && (
          <div className={`transition-all duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-jkap-red-500" />
                Log Your Game
              </h2>

              {/* Rewards Info */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Rewards for Logging Games
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Game logged: +5</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span>Win bonus: +10</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Target className="w-3 h-3 text-jkap-red-400" />
                    <span>Per HR: +2</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span>3+ streak: +15</span>
                  </div>
                  <div className="flex items-center gap-1 text-purple-400 font-medium">
                    <Sparkles className="w-3 h-3" />
                    <span>+1 Recap Credit</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-6">
                {/* Game Result */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Opponent Team *</label>
                    <select
                      value={opponentTeam}
                      onChange={(e) => setOpponentTeam(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:ring-2 focus:ring-jkap-red-500 focus:border-transparent"
                    >
                      <option value="">Select opponent...</option>
                      {MLB_TEAMS.filter(t => t.id !== user?.teamId).map(team => (
                        <option key={team.id} value={team.id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Your Score *</label>
                    <input
                      type="number"
                      value={userScore}
                      onChange={(e) => setUserScore(e.target.value)}
                      min="0"
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:ring-2 focus:ring-jkap-red-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Opponent Score *</label>
                    <input
                      type="number"
                      value={opponentScore}
                      onChange={(e) => setOpponentScore(e.target.value)}
                      min="0"
                      placeholder="0"
                      className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:ring-2 focus:ring-jkap-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Result Preview */}
                {userScore && opponentScore && (
                  <div className={`p-4 rounded-lg border ${
                    isWin() 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      {isWin() ? (
                        <Trophy className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <X className="w-5 h-5 text-red-400" />
                      )}
                      <span className={`font-bold ${isWin() ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isWin() ? 'VICTORY!' : 'DEFEAT'}
                      </span>
                      <span className="text-muted-foreground">
                        {user?.teamName || 'Your Team'} {userScore} - {opponentScore} {getTeamName(opponentTeam)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Game Number (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Game # <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <input
                    type="number"
                    value={gameNumber}
                    onChange={(e) => setGameNumber(e.target.value)}
                    min="1"
                    placeholder="e.g., 42"
                    className="w-full sm:w-1/3 px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:ring-2 focus:ring-jkap-red-500 focus:border-transparent"
                  />
                </div>

                {/* Pitching Stats */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-400" />
                    Pitching Stats
                  </h3>
                  <div className="grid sm:grid-cols-4 gap-4">
                    {isWin() ? (
                      <div className="relative">
                        <label className="block text-xs text-muted-foreground mb-1">Winning Pitcher</label>
                        <input
                          type="text"
                          value={winningPitcher}
                          onChange={(e) => setWinningPitcher(e.target.value)}
                          onFocus={() => setShowPitcherSuggestions('winning')}
                          onBlur={() => setTimeout(() => setShowPitcherSuggestions(null), 200)}
                          placeholder="Player name"
                          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:ring-2 focus:ring-jkap-red-500"
                        />
                        {showPitcherSuggestions === 'winning' && savedPlayers.pitchers.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {savedPlayers.pitchers
                              .filter(p => p.toLowerCase().includes(winningPitcher.toLowerCase()))
                              .slice(0, 8)
                              .map((player, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => { setWinningPitcher(player); setShowPitcherSuggestions(null); }}
                                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg"
                                >
                                  {player}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <label className="block text-xs text-muted-foreground mb-1">Losing Pitcher</label>
                        <input
                          type="text"
                          value={losingPitcher}
                          onChange={(e) => setLosingPitcher(e.target.value)}
                          onFocus={() => setShowPitcherSuggestions('losing')}
                          onBlur={() => setTimeout(() => setShowPitcherSuggestions(null), 200)}
                          placeholder="Player name"
                          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:ring-2 focus:ring-jkap-red-500"
                        />
                        {showPitcherSuggestions === 'losing' && savedPlayers.pitchers.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {savedPlayers.pitchers
                              .filter(p => p.toLowerCase().includes(losingPitcher.toLowerCase()))
                              .slice(0, 8)
                              .map((player, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => { setLosingPitcher(player); setShowPitcherSuggestions(null); }}
                                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg"
                                >
                                  {player}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="relative">
                      <label className="block text-xs text-muted-foreground mb-1">Save</label>
                      <input
                        type="text"
                        value={savePitcher}
                        onChange={(e) => setSavePitcher(e.target.value)}
                        onFocus={() => setShowPitcherSuggestions('save')}
                        onBlur={() => setTimeout(() => setShowPitcherSuggestions(null), 200)}
                        placeholder="If applicable"
                        className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:ring-2 focus:ring-jkap-red-500"
                      />
                      {showPitcherSuggestions === 'save' && savedPlayers.pitchers.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {savedPlayers.pitchers
                            .filter(p => p.toLowerCase().includes(savePitcher.toLowerCase()))
                            .slice(0, 8)
                            .map((player, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => { setSavePitcher(player); setShowPitcherSuggestions(null); }}
                                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg"
                              >
                                {player}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Team Strikeouts</label>
                      <input
                        type="number"
                        value={strikeouts}
                        onChange={(e) => setStrikeouts(e.target.value)}
                        min="0"
                        placeholder="0"
                        className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:ring-2 focus:ring-jkap-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Home Runs */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-jkap-red-400" />
                    Home Runs
                    {homeRuns.length > 0 && (
                      <Badge variant="active" className="text-xs">
                        {homeRuns.reduce((sum, hr) => sum + hr.count, 0)} HR
                      </Badge>
                    )}
                  </h3>
                  
                  <div className="flex gap-2 mb-3 relative">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={newHRPlayer}
                        onChange={(e) => setNewHRPlayer(e.target.value)}
                        onFocus={() => setShowHitterSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowHitterSuggestions(false), 200)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddHomeRun()}
                        placeholder="Player who hit HR"
                        className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:ring-2 focus:ring-jkap-red-500"
                      />
                      {showHitterSuggestions && savedPlayers.hitters.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {savedPlayers.hitters
                            .filter(p => p.toLowerCase().includes(newHRPlayer.toLowerCase()))
                            .slice(0, 8)
                            .map((player, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => { setNewHRPlayer(player); setShowHitterSuggestions(false); }}
                                className="w-full px-3 py-2 text-left text-sm text-white hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg"
                              >
                                {player}
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleAddHomeRun}
                      variant="outline"
                      size="sm"
                      disabled={!newHRPlayer.trim()}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
                  </div>
                  
                  {homeRuns.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {homeRuns.map((hr, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-jkap-red-500/10 border border-jkap-red-500/30"
                        >
                          <Target className="w-3 h-3 text-jkap-red-400" />
                          <span className="text-sm text-foreground">{hr.player}</span>
                          {hr.count > 1 && (
                            <Badge variant="delinquent" className="text-xs">{hr.count}</Badge>
                          )}
                          <button
                            onClick={() => handleRemoveHomeRun(hr.player)}
                            className="text-muted-foreground hover:text-jkap-red-400 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Notes <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any memorable moments, clutch plays, etc."
                    rows={2}
                    className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground focus:ring-2 focus:ring-jkap-red-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Submit Result */}
                {submitResult && (
                  <div className={`p-4 rounded-lg ${
                    submitResult.success 
                      ? 'bg-emerald-500/10 border border-emerald-500/30' 
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-2">
                      {submitResult.success ? (
                        <Check className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <X className="w-5 h-5 text-red-400" />
                      )}
                      <span className={submitResult.success ? 'text-emerald-400' : 'text-red-400'}>
                        {submitResult.message}
                      </span>
                      {submitResult.tokens && (
                        <Badge variant="active" className="ml-2">
                          <Coins className="w-3 h-3 mr-1" />
                          +{submitResult.tokens} tokens
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting || !opponentTeam || !userScore || !opponentScore}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Logging Game...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Log Game & Earn Tokens
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <div className={`transition-all duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-jkap-red-500" />
                Game History
              </h2>

              {gameLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Gamepad2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No games logged yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">Log your first game to start earning tokens!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gameLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-4 rounded-lg border ${
                        log.is_win 
                          ? 'bg-emerald-500/5 border-emerald-500/20' 
                          : 'bg-red-500/5 border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            log.is_win ? 'bg-emerald-500/20' : 'bg-red-500/20'
                          }`}>
                            {log.is_win ? (
                              <Trophy className="w-5 h-5 text-emerald-400" />
                            ) : (
                              <X className="w-5 h-5 text-red-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${log.is_win ? 'text-emerald-400' : 'text-red-400'}`}>
                                {log.is_win ? 'W' : 'L'}
                              </span>
                              <span className="text-foreground font-medium">
                                {log.user_score} - {log.opponent_score}
                              </span>
                              <span className="text-muted-foreground">vs</span>
                              <span className="text-foreground">{getTeamName(log.opponent_team_id)}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{new Date(log.game_date).toLocaleDateString()}</span>
                              {log.game_number && <span>Game #{log.game_number}</span>}
                              {log.total_home_runs > 0 && (
                                <span className="flex items-center gap-1 text-jkap-red-400">
                                  <Target className="w-3 h-3" />
                                  {log.total_home_runs} HR
                                </span>
                              )}
                              {log.save_pitcher && (
                                <span className="flex items-center gap-1 text-blue-400">
                                  <Award className="w-3 h-3" />
                                  SV: {log.save_pitcher}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {log.game_number && (
                          <Badge variant="outline" className="text-xs">
                            #{log.game_number}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'leaderboards' && (
          <div className={`grid md:grid-cols-2 gap-6 transition-all duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
            {/* Home Run Leaders */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-jkap-red-500" />
                Home Run Leaders
              </h3>
              <LeaderboardList entries={leaderboards?.homeRuns || []} statLabel="HR" />
            </Card>

            {/* Win Leaders */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Win Leaders
              </h3>
              <LeaderboardList entries={leaderboards?.wins || []} statLabel="W" />
            </Card>

            {/* Strikeout Leaders */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                Strikeout Leaders
              </h3>
              <LeaderboardList entries={leaderboards?.strikeouts || []} statLabel="K" />
            </Card>

            {/* Save Leaders */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" />
                Save Leaders
              </h3>
              <LeaderboardList entries={leaderboards?.saves || []} statLabel="SV" />
            </Card>

            {/* Most Active */}
            <Card className="p-6 md:col-span-2">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Most Active Players
              </h3>
              <LeaderboardList entries={leaderboards?.gamesPlayed || []} statLabel="Games" horizontal />
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

// Leaderboard List Component
function LeaderboardList({ 
  entries, 
  statLabel, 
  horizontal = false 
}: { 
  entries: LeaderboardEntry[]; 
  statLabel: string;
  horizontal?: boolean;
}) {
  const getTeamAbbr = (teamId: string) => {
    const team = MLB_TEAMS.find(t => t.id === teamId);
    return team?.abbreviation || teamId;
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data yet. Start logging games!
      </div>
    );
  }

  if (horizontal) {
    return (
      <div className="flex flex-wrap gap-3">
        {entries.map((entry) => (
          <div
            key={entry.user_id}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              entry.rank === 1 
                ? 'bg-amber-500/10 border border-amber-500/30' 
                : 'bg-muted/50'
            }`}
          >
            <span className={`font-bold ${
              entry.rank === 1 ? 'text-amber-400' : 
              entry.rank === 2 ? 'text-zinc-400' : 
              entry.rank === 3 ? 'text-orange-400' : 'text-muted-foreground'
            }`}>
              #{entry.rank}
            </span>
            <span className="text-foreground font-medium">{entry.display_name}</span>
            <Badge variant="outline" className="text-xs">{getTeamAbbr(entry.team_id)}</Badge>
            <span className="text-emerald-400 font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.user_id}
          className={`flex items-center justify-between p-3 rounded-lg ${
            entry.rank === 1 
              ? 'bg-amber-500/10 border border-amber-500/30' 
              : entry.rank === 2
              ? 'bg-zinc-500/10 border border-zinc-500/30'
              : entry.rank === 3
              ? 'bg-orange-500/10 border border-orange-500/30'
              : 'bg-muted/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              entry.rank === 1 ? 'bg-amber-500 text-white' : 
              entry.rank === 2 ? 'bg-zinc-500 text-white' : 
              entry.rank === 3 ? 'bg-orange-500 text-white' : 
              'bg-muted text-muted-foreground'
            }`}>
              {entry.rank === 1 ? <Crown className="w-4 h-4" /> : entry.rank}
            </div>
            <div>
              <p className="font-medium text-foreground">{entry.display_name}</p>
              <p className="text-xs text-muted-foreground">{getTeamAbbr(entry.team_id)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-foreground">{entry.value}</p>
            <p className="text-xs text-muted-foreground">{statLabel}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
