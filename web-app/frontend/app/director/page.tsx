'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getUsersAtLeague, 
  getLeague, 
  getLeagues,
  DBLeague, 
  DBUserLevel,
  getLeagueSummary,
  getRegistrationQueue,
  DBRegistrationRequest,
  createUser,
  updateRegistrationRequest,
  updateTeamStatus,
  TeamStatus,
  initializeNewMember,
} from '@/lib/supabase';
import { MLB_TEAMS } from '@/types/league';
import {
  Users,
  Trophy,
  TrendingUp,
  Activity,
  Star,
  Crown,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Shield,
  Award,
  Sparkles,
  UserPlus,
  Mail,
  Phone,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';

interface LeaguePlayer extends DBUserLevel {
  display_name?: string;
  team_id?: string;
}

export default function DirectorDashboard() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [league, setLeague] = useState<DBLeague | null>(null);
  const [allLeagues, setAllLeagues] = useState<DBLeague[]>([]);
  const [players, setPlayers] = useState<LeaguePlayer[]>([]);
  const [leagueSummary, setLeagueSummary] = useState<{ leagueId: string; name: string; playerCount: number; color: string }[]>([]);
  
  // Registration queue for director enrollment
  const [registrationQueue, setRegistrationQueue] = useState<DBRegistrationRequest[]>([]);
  const [enrollModal, setEnrollModal] = useState<DBRegistrationRequest | null>(null);
  const [selectedEnrollLeague, setSelectedEnrollLeague] = useState<string>('');
  const [enrollmentSuccess, setEnrollmentSuccess] = useState<{
    username: string;
    password: string;
    leagueName: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'players' | 'enroll'>('players');

  useEffect(() => {
    // Check if user is a league director
    if (isAuthenticated && user) {
      if (!user.isLeagueDirector && !user.isAdmin) {
        router.push('/dashboard');
        return;
      }
      loadData();
    }
  }, [isAuthenticated, user, router]);

  const loadData = async () => {
    if (!user?.managedLeagueId && !user?.isAdmin) return;

    const leagueId = user?.managedLeagueId || 'triple-a'; // Default for admin testing
    
    const [leagueData, playersData, summary, allLeaguesData, queueData] = await Promise.all([
      getLeague(leagueId),
      getUsersAtLeague(leagueId),
      getLeagueSummary(),
      getLeagues(),
      getRegistrationQueue(),
    ]);

    setLeague(leagueData);
    setPlayers(playersData);
    setLeagueSummary(summary);
    setAllLeagues(allLeaguesData);
    setSelectedEnrollLeague(leagueId); // Default to their managed league
    
    // Filter registration queue to show only pending
    setRegistrationQueue(queueData.filter(r => r.status === 'pending'));
    setIsLoaded(true);
  };
  
  // Get leagues this director can enroll into
  const getEnrollableLeagues = () => {
    if (user?.isAdmin) return allLeagues; // Admin can enroll anywhere
    
    // Find the director's managed league
    const managedLeague = allLeagues.find(l => l.id === user?.managedLeagueId);
    if (!managedLeague) return [];
    
    // Directors can enroll into their league and any leagues below them
    // Miguel (Triple-A, level 2) can enroll into Triple-A (2), Double-A (3), Single-A (4), Rookie (5)
    // Roy (Double-A, level 3) can enroll into Double-A (3), Single-A (4), Rookie (5)
    return allLeagues.filter(l => l.level >= managedLeague.level);
  };
  
  // Handle enrolling a new player
  const handleEnrollPlayer = async () => {
    if (!enrollModal || !selectedEnrollLeague) return;
    setActionLoading(true);
    
    // Generate password
    const generatedPassword = Math.random().toString(36).slice(-8);
    
    // Create user
    const createResult = await createUser({
      username: enrollModal.username,
      password: generatedPassword,
      displayName: enrollModal.display_name,
      teamId: enrollModal.requested_team_id,
      isAdmin: false,
      email: enrollModal.email,
      phone: enrollModal.phone,
      userType: 'jkap_member',
    });
    
    if (!createResult.success || !createResult.user?.id) {
      alert(createResult.error || 'Failed to create user');
      setActionLoading(false);
      return;
    }
    
    // Initialize at selected league level
    await initializeNewMember(createResult.user.id, selectedEnrollLeague);
    
    // Update registration status
    await updateRegistrationRequest(enrollModal.id, {
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    });
    
    // Update team status
    await updateTeamStatus(enrollModal.requested_team_id, {
      status: 'occupied' as TeamStatus,
      occupied_by: createResult.user.id,
      notes: `Enrolled by ${user?.directorTitle || 'Director'} on ${new Date().toLocaleDateString()}`,
    });
    
    const selectedLeague = allLeagues.find(l => l.id === selectedEnrollLeague);
    
    setEnrollmentSuccess({
      username: enrollModal.username,
      password: generatedPassword,
      leagueName: selectedLeague?.name || 'Unknown',
    });
    
    // Refresh data
    loadData();
    setEnrollModal(null);
    setActionLoading(false);
  };
  
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Calculate stats
  const qualifiedCount = players.filter(p => p.is_qualified_for_promotion).length;
  const averageGames = players.length > 0 
    ? Math.round(players.reduce((sum, p) => sum + p.games_at_current_level, 0) / players.length) 
    : 0;
  const averageWinRate = players.length > 0
    ? Math.round(players.reduce((sum, p) => sum + (p.wins_at_current_level / Math.max(1, p.games_at_current_level) * 100), 0) / players.length)
    : 0;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Shield className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">Director Dashboard</h1>
          <p className="text-slate-400 mb-8">Sign in to access your league management tools.</p>
          <Button as="link" href="/login" variant="primary">Sign In</Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user?.isLeagueDirector && !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-slate-400 mb-8">This area is for League Directors only.</p>
          <Button as="link" href="/dashboard" variant="secondary">Go to Dashboard</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className={`mb-8 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center gap-4 mb-2">
            <div 
              className="p-3 rounded-xl border"
              style={{ 
                backgroundColor: (league?.color || '#f59e0b') + '20',
                borderColor: (league?.color || '#f59e0b') + '40'
              }}
            >
              <Trophy className="w-8 h-8" style={{ color: league?.color || '#f59e0b' }} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge 
                  variant="outline" 
                  className="text-xs border-amber-500/50 text-amber-400"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  {user?.directorTitle || 'League Director'}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-white">
                {league?.name || 'League'} Dashboard
              </h1>
            </div>
          </div>
          <p className="text-slate-400 ml-16">
            Welcome, <span className="text-white font-medium">{user?.displayName}</span>. 
            Manage your {players.length} player{players.length !== 1 ? 's' : ''} and track their progress.
          </p>
        </div>

        {/* Stats Grid */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 transition-all duration-500 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-600/5 border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{players.length}</p>
                <p className="text-xs text-muted-foreground">Total Players</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-green-600/5 border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-500">{qualifiedCount}</p>
                <p className="text-xs text-muted-foreground">Ready to Promote</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-yellow-600/5 border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20">
                <Target className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-500">{averageGames}</p>
                <p className="text-xs text-muted-foreground">Avg Games Played</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-600/5 border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-500">{averageWinRate}%</p>
                <p className="text-xs text-muted-foreground">Avg Win Rate</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className={`flex gap-2 mb-6 transition-all duration-500 delay-150 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={() => setActiveTab('players')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'players' 
                ? 'bg-amber-500 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            My Players ({players.length})
          </button>
          <button
            onClick={() => setActiveTab('enroll')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'enroll' 
                ? 'bg-emerald-500 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Enroll Players
            {registrationQueue.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-emerald-600 rounded-full">
                {registrationQueue.length}
              </span>
            )}
          </button>
        </div>

        {/* Main Content Grid */}
        <div className={`grid lg:grid-cols-3 gap-6 transition-all duration-500 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Players Tab */}
          {activeTab === 'players' && (
          <>
          {/* Players List */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5" style={{ color: league?.color }} />
                  Your Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                {players.length > 0 ? (
                  <div className="space-y-2">
                    {players.map((player) => {
                      const team = MLB_TEAMS.find(t => t.id === player.team_id);
                      const winRate = player.games_at_current_level > 0 
                        ? Math.round((player.wins_at_current_level / player.games_at_current_level) * 100)
                        : 0;
                      
                      return (
                        <div 
                          key={player.id}
                          className={`p-4 rounded-xl bg-slate-700/30 border transition-all hover:bg-slate-700/50 ${
                            player.is_qualified_for_promotion 
                              ? 'border-emerald-500/30' 
                              : 'border-slate-600/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-slate-600/50 flex items-center justify-center">
                                <span className="text-xs font-mono text-amber-400">
                                  {team?.abbreviation || '???'}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-white">{player.display_name || 'Unknown'}</p>
                                  {player.is_qualified_for_promotion && (
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      Ready
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400">
                                  {team?.name || 'No team assigned'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-sm font-medium text-white">
                                  {player.wins_at_current_level}-{player.games_at_current_level - player.wins_at_current_level}
                                </p>
                                <p className="text-xs text-slate-400">{winRate}% win rate</p>
                              </div>
                              
                              <div className="w-16">
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all"
                                    style={{ 
                                      width: `${player.qualification_percent}%`,
                                      backgroundColor: player.is_qualified_for_promotion ? '#10b981' : league?.color || '#f59e0b'
                                    }}
                                  />
                                </div>
                                <p className="text-xs text-slate-500 text-center mt-1">
                                  {player.qualification_percent}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No players in your league yet</p>
                    <p className="text-sm mt-1">Players will appear here when they join {league?.name}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="secondary" 
                  className="w-full justify-start"
                  icon={<Award className="w-4 h-4" />}
                >
                  Recommend for Promotion
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full justify-start"
                  icon={<Activity className="w-4 h-4" />}
                >
                  View Activity Report
                </Button>
                <Button 
                  variant="secondary" 
                  className="w-full justify-start"
                  as="link"
                  href="/league-levels"
                  icon={<TrendingUp className="w-4 h-4" />}
                >
                  Road to the Show
                </Button>
              </CardContent>
            </Card>

            {/* League Overview */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">League Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leagueSummary.map((l) => (
                    <div 
                      key={l.leagueId}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        l.leagueId === user?.managedLeagueId 
                          ? 'bg-slate-700/50 border border-slate-600' 
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: l.color }}
                        />
                        <span className="text-sm text-slate-300">{l.name}</span>
                        {l.leagueId === user?.managedLeagueId && (
                          <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-400">
                            You
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-slate-400">{l.playerCount}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Promotion Requirements */}
            {league && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Promotion Requirements</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-400 space-y-2">
                  <div className="flex justify-between">
                    <span>Min Games:</span>
                    <span className="text-white">{league.min_games_to_qualify}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min Win Rate:</span>
                    <span className="text-white">{Math.round(league.min_win_rate * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min Days:</span>
                    <span className="text-white">{league.min_time_in_league_days}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-xs text-slate-500">
                      Players meeting all requirements can be recommended to the Commissioner for promotion.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          </>
          )}

          {/* Enroll Tab */}
          {activeTab === 'enroll' && (
          <>
          {/* Registration Queue */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-emerald-400" />
                    Pending Applications
                  </CardTitle>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={loadData}
                    icon={<RefreshCw className="w-4 h-4" />}
                  >
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {registrationQueue.length > 0 ? (
                  <div className="space-y-3">
                    {registrationQueue.map((request) => {
                      const team = MLB_TEAMS.find(t => t.id === request.requested_team_id);
                      return (
                        <div 
                          key={request.id}
                          className="p-4 rounded-xl bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-white">@{request.username}</p>
                                <span className="text-slate-400">•</span>
                                <p className="text-slate-300">{request.display_name}</p>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {request.email}
                                </span>
                                {request.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {request.phone}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                Requested: <span className="text-blue-400">{team?.name}</span>
                                <span className="mx-2">•</span>
                                Applied {new Date(request.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => setEnrollModal(request)}
                              className="bg-emerald-600 hover:bg-emerald-500"
                            >
                              <UserPlus className="w-4 h-4 mr-1" />
                              Enroll
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No pending applications</p>
                    <p className="text-sm mt-1">New applicants from the waitlist will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enroll Instructions Sidebar */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-blue-500/5 border-emerald-500/30">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Your Enrollment Scope
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400 mb-3">
                  As <span className="text-amber-400 font-medium">{user?.directorTitle}</span>, you can enroll players into:
                </p>
                <div className="space-y-2">
                  {getEnrollableLeagues().map(l => (
                    <div key={l.id} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: l.color }}
                      />
                      <span className="text-sm text-slate-300">{l.name}</span>
                      {l.id === user?.managedLeagueId && (
                        <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400">
                          Your League
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">How Enrollment Works</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-400 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-emerald-400">1</span>
                  </div>
                  <p>Review applicant from the waitlist</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-emerald-400">2</span>
                  </div>
                  <p>Select which league level they should start at</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-emerald-400">3</span>
                  </div>
                  <p>Their account is created with login credentials</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-emerald-400">4</span>
                  </div>
                  <p>Send them their credentials to get started!</p>
                </div>
              </CardContent>
            </Card>
          </div>
          </>
          )}
        </div>

        {/* Enroll Modal */}
        {enrollModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="bg-slate-800 border-slate-700 border-emerald-500/50 w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  Enroll New Player
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="font-bold text-white">@{enrollModal.username}</p>
                  <p className="text-slate-300">{enrollModal.display_name}</p>
                  <p className="text-sm text-slate-400 mt-2">
                    Requested: <span className="text-blue-400">{MLB_TEAMS.find(t => t.id === enrollModal.requested_team_id)?.name}</span>
                  </p>
                </div>

                {/* League Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Trophy className="w-4 h-4 inline mr-1" />
                    Starting League
                  </label>
                  <select
                    value={selectedEnrollLeague}
                    onChange={(e) => setSelectedEnrollLeague(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    {getEnrollableLeagues().map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name} (Level {l.level})
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-sm text-slate-400">
                  A random password will be generated. Copy it to send to the new member.
                </p>

                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setEnrollModal(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleEnrollPlayer}
                    disabled={actionLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  >
                    {actionLoading ? 'Enrolling...' : 'Enroll Player'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enrollment Success Modal */}
        {enrollmentSuccess && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="bg-slate-800 border-slate-700 border-emerald-500/50 w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  Player Enrolled!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
                  <p className="text-emerald-400 font-medium mb-1">🎉 Welcome to {enrollmentSuccess.leagueName}!</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Username</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={enrollmentSuccess.username}
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(enrollmentSuccess.username, 'username')}
                        className="p-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-600"
                      >
                        {copiedField === 'username' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Password</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={enrollmentSuccess.password}
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(enrollmentSuccess.password, 'password')}
                        className="p-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-600"
                      >
                        {copiedField === 'password' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setEnrollmentSuccess(null)}
                  fullWidth
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  Done
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
