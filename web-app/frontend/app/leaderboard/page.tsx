'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Trophy, Flame, Star, TrendingUp, Target, Award, 
  Medal, Crown, Zap, Activity, Users, ChevronRight
} from 'lucide-react';
import { getActivitySummary } from '@/lib/supabase';
import { MLB_TEAMS } from '@/types/league';

interface ActivityData {
  [userId: string]: {
    gamesPlayed: number;
    recapsCreated: number;
    analysisUploads: number;
    lastActive: string;
    wins: number;
    losses: number;
    winRate: number;
  };
}

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  teamId: string;
  teamName: string;
  teamAbbr: string;
  value: number;
  secondaryValue?: number;
  rank: number;
}

type LeaderboardType = 'games' | 'wins' | 'winRate' | 'activity' | 'streaks';

function LeaderboardContent() {
  const { user } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [activityData, setActivityData] = useState<ActivityData>({});
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<LeaderboardType>('games');
  const [playerOfWeek, setPlayerOfWeek] = useState<LeaderboardEntry | null>(null);
  const [hotPlayers, setHotPlayers] = useState<LeaderboardEntry[]>([]);
  const [coldPlayers, setColdPlayers] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Calculate this week's date range (Sunday to Saturday)
        const now = new Date();
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        // Load activity data and users
        const summary = await getActivitySummary(
          startOfWeek.toISOString(),
          endOfWeek.toISOString()
        );
        setActivityData(summary);
        
        // Get all users from activity summary
        // Note: In a real app, you'd fetch users from a proper endpoint
        // For now, we'll use the activity data keys
        
        // Determine player of the week (most total activity)
        const entries = Object.entries(summary);
        if (entries.length > 0) {
          const sorted = entries
            .map(([id, data]) => ({
              userId: id,
              totalActivity: data.gamesPlayed + data.recapsCreated + (data.wins || 0),
              ...data
            }))
            .sort((a, b) => b.totalActivity - a.totalActivity);
          
          // Hot players (top 5 by activity)
          const hot = sorted.slice(0, 5).map((p, i) => ({
            userId: p.userId,
            displayName: 'Player',
            teamId: '',
            teamName: 'Team',
            teamAbbr: 'TM',
            value: p.totalActivity,
            rank: i + 1,
          }));
          setHotPlayers(hot);
          
          // Cold players (lowest activity)
          const cold = sorted
            .filter(p => p.gamesPlayed < 3)
            .slice(-5)
            .reverse()
            .map((p, i) => ({
              userId: p.userId,
              displayName: 'Player',
              teamId: '',
              teamName: 'Team',
              teamAbbr: 'TM',
              value: p.gamesPlayed,
              rank: i + 1,
            }));
          setColdPlayers(cold);
        }
        
        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading leaderboard data:', err);
        setIsLoaded(true);
      }
    };
    
    loadData();
  }, []);

  const tabs = [
    { id: 'games', label: 'Games Played', icon: Target },
    { id: 'wins', label: 'Most Wins', icon: Trophy },
    { id: 'winRate', label: 'Win Rate', icon: TrendingUp },
    { id: 'activity', label: 'Activity Score', icon: Activity },
  ];

  const getLeaderboardData = (): LeaderboardEntry[] => {
    const entries = Object.entries(activityData);
    
    switch (activeTab) {
      case 'games':
        return entries
          .map(([id, data], i) => ({
            userId: id,
            displayName: `Player ${i + 1}`,
            teamId: '',
            teamName: 'Team',
            teamAbbr: 'TM',
            value: data.gamesPlayed,
            rank: 0,
          }))
          .sort((a, b) => b.value - a.value)
          .map((e, i) => ({ ...e, rank: i + 1 }))
          .slice(0, 10);
      
      case 'wins':
        return entries
          .map(([id, data], i) => ({
            userId: id,
            displayName: `Player ${i + 1}`,
            teamId: '',
            teamName: 'Team',
            teamAbbr: 'TM',
            value: data.wins || 0,
            secondaryValue: data.losses || 0,
            rank: 0,
          }))
          .sort((a, b) => b.value - a.value)
          .map((e, i) => ({ ...e, rank: i + 1 }))
          .slice(0, 10);
      
      case 'winRate':
        return entries
          .filter(([, data]) => data.gamesPlayed >= 3)
          .map(([id, data], i) => ({
            userId: id,
            displayName: `Player ${i + 1}`,
            teamId: '',
            teamName: 'Team',
            teamAbbr: 'TM',
            value: data.winRate || 0,
            secondaryValue: data.gamesPlayed,
            rank: 0,
          }))
          .sort((a, b) => b.value - a.value)
          .map((e, i) => ({ ...e, rank: i + 1 }))
          .slice(0, 10);
      
      case 'activity':
        return entries
          .map(([id, data], i) => ({
            userId: id,
            displayName: `Player ${i + 1}`,
            teamId: '',
            teamName: 'Team',
            teamAbbr: 'TM',
            value: data.gamesPlayed + data.recapsCreated + data.analysisUploads,
            rank: 0,
          }))
          .sort((a, b) => b.value - a.value)
          .map((e, i) => ({ ...e, rank: i + 1 }))
          .slice(0, 10);
      
      case 'streaks':
        // For streaks, use consecutive wins (wins as proxy since we don't have streak data)
        return entries
          .map(([id, data], i) => ({
            userId: id,
            displayName: `Player ${i + 1}`,
            teamId: '',
            teamName: 'Team',
            teamAbbr: 'TM',
            value: data.wins || 0, // Using wins as proxy for now
            rank: 0,
          }))
          .sort((a, b) => b.value - a.value)
          .map((e, i) => ({ ...e, rank: i + 1 }))
          .slice(0, 10);
      
      default:
        return [];
    }
  };

  const leaderboardData = getLeaderboardData();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <span className="text-xl">🥇</span>;
      case 2: return <span className="text-xl">🥈</span>;
      case 3: return <span className="text-xl">🥉</span>;
      default: return <span className="text-sm text-slate-500 w-6 text-center">{rank}</span>;
    }
  };

  const getValueDisplay = (entry: LeaderboardEntry) => {
    switch (activeTab) {
      case 'winRate':
        return `${entry.value.toFixed(1)}%`;
      case 'wins':
        return `${entry.value}-${entry.secondaryValue || 0}`;
      default:
        return entry.value.toString();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className={`mb-8 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30">
              <Trophy className="w-6 h-6 text-yellow-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Leaderboards</h1>
          </div>
          <p className="text-slate-400">See who's dominating the league this week</p>
        </div>

        {/* Featured Cards Row */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 transition-all duration-500 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Player of the Week */}
          <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-600/5 border-yellow-500/30 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6 relative">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">Player of the Week</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-amber-500/20 flex items-center justify-center">
                  <span className="text-3xl">👑</span>
                </div>
                <div>
                  <p className="text-xl font-bold text-white">Top Performer</p>
                  <p className="text-sm text-yellow-400/80">Most active this week</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      <Zap className="w-3 h-3 mr-1" />
                      Elite
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hot Streak */}
          <Card className="bg-gradient-to-br from-orange-500/10 to-red-600/5 border-orange-500/30 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6 relative">
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-sm font-medium text-orange-400">Hot Streak 🔥</span>
              </div>
              <div className="space-y-2">
                {hotPlayers.slice(0, 3).map((player, i) => (
                  <div key={player.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getRankIcon(i + 1)}
                      <span className="text-sm text-white">Active Player</span>
                    </div>
                    <Badge variant="outline" className="border-orange-500/50 text-orange-400">
                      {player.value} pts
                    </Badge>
                  </div>
                ))}
                {hotPlayers.length === 0 && (
                  <p className="text-slate-400 text-sm">No data yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Rising Stars */}
          <Card className="bg-gradient-to-br from-emerald-500/10 to-green-600/5 border-emerald-500/30 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <CardContent className="p-6 relative">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Rising Stars</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">Most Improved</span>
                  <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                    +5 games
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">Rookie of Week</span>
                  <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                    3-0
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">Comeback Player</span>
                  <Badge variant="outline" className="border-emerald-500/50 text-emerald-400">
                    4W streak
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Leaderboard */}
        <Card className={`bg-slate-800/50 border-slate-700 transition-all duration-500 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-white flex items-center gap-2">
                <Medal className="w-5 h-5 text-amber-400" />
                Weekly Rankings
              </CardTitle>
              
              {/* Tab Buttons */}
              <div className="flex flex-wrap gap-2">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as LeaderboardType)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-300 border border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Leaderboard Table */}
            <div className="space-y-2">
              {leaderboardData.length > 0 ? (
                leaderboardData.map((entry, index) => (
                  <div
                    key={entry.userId}
                    className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                      index < 3 
                        ? 'bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20' 
                        : 'bg-slate-700/30 hover:bg-slate-700/50'
                    } ${entry.userId === user?.id ? 'ring-2 ring-emerald-500/50' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 flex justify-center">
                        {getRankIcon(entry.rank)}
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-slate-600/50 flex items-center justify-center">
                        <Users className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {entry.displayName}
                          {entry.userId === user?.id && (
                            <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                              You
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-slate-400">{entry.teamName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${index < 3 ? 'text-amber-400' : 'text-white'}`}>
                        {getValueDisplay(entry)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {activeTab === 'winRate' && entry.secondaryValue && `${entry.secondaryValue} games`}
                        {activeTab === 'games' && 'games'}
                        {activeTab === 'wins' && 'W-L'}
                        {activeTab === 'activity' && 'points'}
                        {activeTab === 'streaks' && 'streak'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No leaderboard data yet</p>
                  <p className="text-sm mt-1">Play games to climb the rankings!</p>
                </div>
              )}
            </div>

            {/* Your Position (if not in top 10) */}
            {user && !leaderboardData.find(e => e.userId === user.id) && (
              <div className="mt-6 pt-6 border-t border-slate-700">
                <p className="text-sm text-slate-400 mb-2">Your Position</p>
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-700/30 ring-2 ring-emerald-500/30">
                  <div className="flex items-center gap-4">
                    <span className="text-slate-400">—</span>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{user.displayName}</p>
                      <p className="text-xs text-slate-400">
                        {MLB_TEAMS.find(t => t.id === user.teamId)?.name || 'Your Team'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-400">—</p>
                    <p className="text-xs text-slate-500">Keep playing!</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Explainer */}
        <div className={`mt-8 p-4 rounded-xl bg-slate-800/30 border border-slate-700 transition-all duration-500 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-sm text-slate-400 text-center">
            📊 Rankings update in real-time based on game logs, recaps, and tool usage. 
            <span className="text-slate-500"> Play more games to climb the leaderboard!</span>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <ProtectedRoute requireJkapMember>
      <LeaderboardContent />
    </ProtectedRoute>
  );
}
