'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  SeasonPhase,
  getPhaseLabel,
  CLASSIFICATION_COLORS,
  OFFSEASON_QUESTIONNAIRE_URL,
} from '@/types/offseason';
import {
  Users,
  Trophy,
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Shield,
  BarChart3,
  Send,
  Copy,
  Check,
  Download,
  Phone,
  Mail,
  MessageSquare,
  UserCheck,
  UserX,
  Vote,
  Award,
  Snowflake,
  Image as ImageIcon,
  Share2,
  Play,
  Pause,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Crown,
  Star,
  Flame,
  Target,
  Loader2,
} from 'lucide-react';
import {
  getLeagueStandings,
  getAllUsers,
  getFreeAgentDeclarations,
  getAwardCandidates,
  getCurrentSeasonState,
  TeamStats,
  DBUser,
} from '@/lib/supabase';
import { MLB_TEAMS } from '@/types/teams';
import { checkQuestionnaireCompletions } from '@/lib/typeform-api';

// Types for admin data
interface MemberData {
  id: string;
  username: string;
  displayName: string;
  teamId: string;
  teamName: string;
  email: string;
  phone: string;
  isActive: boolean;
  lastActive: string;
  questionnaireCompleted: boolean;
  freeAgentsDeclared: boolean;
}

interface StandingsData {
  rank: number;
  teamId: string;
  teamName: string;
  teamAbbr: string;
  wins: number;
  losses: number;
  pct: number;
  gb: string;
  madePlayoffs: boolean;
  seed?: number;
  owner: string;
}

interface AwardCandidate {
  id: string;
  playerName: string;
  teamAbbr: string;
  stats: Record<string, string | number>;
  voteCount?: number;
}

export default function OffSeasonAdminPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'voting' | 'standings' | 'phases'>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Season state
  const [currentPhase, setCurrentPhase] = useState<SeasonPhase>('questionnaire');
  const [seasonNumber, setSeasonNumber] = useState(4);
  const [playoffTeamCount, setPlayoffTeamCount] = useState(4);

  // Real data state
  const [members, setMembers] = useState<MemberData[]>([]);
  const [standings, setStandings] = useState<StandingsData[]>([]);
  const [progressSummary, setProgressSummary] = useState({
    totalMembers: 0,
    questionnaireCompleted: 0,
    declarationsSubmitted: 0,
    claimsSubmitted: 0,
  });
  const [mvpCandidates, setMvpCandidates] = useState<AwardCandidate[]>([]);
  const [cyYoungCandidates, setCyYoungCandidates] = useState<AwardCandidate[]>([]);

  // Voting state
  const [mvpVote, setMvpVote] = useState<string | null>(null);
  const [cyYoungVote, setCyYoungVote] = useState<string | null>(null);
  const [votingSubmitted, setVotingSubmitted] = useState(false);

  // Load real data from database
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // First get season state
      const seasonState = await getCurrentSeasonState();
      const currentSeasonNum = seasonState?.season_number || 4;
      
      // Fetch all data in parallel (except Typeform which needs member emails first)
      const [
        standingsData,
        usersData,
        declarationsData,
        mvpData,
        cyYoungData,
      ] = await Promise.all([
        getLeagueStandings(),
        getAllUsers(),
        getFreeAgentDeclarations(currentSeasonNum),
        getAwardCandidates(currentSeasonNum, 'mvp'),
        getAwardCandidates(currentSeasonNum, 'cy_young'),
      ]);

      // Set season info
      setSeasonNumber(currentSeasonNum);
      if (seasonState) {
        setCurrentPhase(seasonState.phase as SeasonPhase);
        setPlayoffTeamCount(seasonState.playoff_team_count || 4);
      }

      // Process standings
      const processedStandings: StandingsData[] = standingsData.map((team, index) => {
        const mlbTeam = MLB_TEAMS.find(t => t.abbreviation === team.teamId);
        const owner = usersData.find(u => u.team_id === team.teamId);
        const gamesBack = index === 0 ? '-' : 
          ((standingsData[0].wins - team.wins) + (team.losses - standingsData[0].losses)) / 2;
        
        return {
          rank: index + 1,
          teamId: team.teamId,
          teamName: mlbTeam?.name || team.teamId,
          teamAbbr: team.teamId,
          wins: team.wins,
          losses: team.losses,
          pct: team.wins / (team.wins + team.losses) || 0,
          gb: index === 0 ? '-' : gamesBack.toFixed(1),
          madePlayoffs: index < playoffTeamCount,
          seed: index < playoffTeamCount ? index + 1 : undefined,
          owner: owner?.display_name || 'Unknown',
        };
      });
      setStandings(processedStandings);

      // Get member emails for Typeform lookup
      const jkapMembers = usersData.filter(u => u.user_type === 'jkap_member');
      const memberEmails = jkapMembers.map(u => u.email).filter(Boolean) as string[];
      
      // Fetch questionnaire completions from Typeform (last 45 days)
      const questionnaireCompletions = await checkQuestionnaireCompletions(memberEmails, 45);
      
      // Build questionnaire completion map by user ID
      const questionnaireCompletedMap = new Map<string, boolean>();
      jkapMembers.forEach(u => {
        if (u.email) {
          const completion = questionnaireCompletions.get(u.email.toLowerCase());
          questionnaireCompletedMap.set(u.id, completion?.completed || false);
        } else {
          questionnaireCompletedMap.set(u.id, false);
        }
      });

      // Build declarations map
      const declarationsMap = new Map<string, boolean>();
      declarationsData.forEach(d => {
        declarationsMap.set(d.declaring_user_id, true);
      });

      // Process members (jkapMembers already defined above)
      const processedMembers: MemberData[] = jkapMembers.map(u => {
        const mlbTeam = MLB_TEAMS.find(t => t.abbreviation === u.team_id);
        return {
          id: u.id,
          username: u.username || u.display_name || 'unknown',
          displayName: u.display_name || 'Unknown',
          teamId: u.team_id || '',
          teamName: mlbTeam?.name || u.team_id || 'No Team',
          email: u.email || '',
          phone: u.phone || '',
          isActive: u.is_active !== false, // Default to active
          lastActive: u.last_login || u.created_at || '',
          questionnaireCompleted: questionnaireCompletedMap.get(u.id) || false,
          freeAgentsDeclared: declarationsMap.has(u.id),
        };
      });
      setMembers(processedMembers);

      // Calculate progress summary
      const activeMembers = processedMembers.filter(m => m.isActive);
      setProgressSummary({
        totalMembers: activeMembers.length,
        questionnaireCompleted: activeMembers.filter(m => m.questionnaireCompleted).length,
        declarationsSubmitted: activeMembers.filter(m => m.freeAgentsDeclared).length,
        claimsSubmitted: 0, // Will be updated when claims are tracked
      });

      // Process award candidates
      if (mvpData && mvpData.length > 0) {
        setMvpCandidates(mvpData.map(c => ({
          id: c.id,
          playerName: c.player_name,
          teamAbbr: c.team_abbr,
          stats: c.stats || {},
          voteCount: c.vote_count,
        })));
      }

      if (cyYoungData && cyYoungData.length > 0) {
        setCyYoungCandidates(cyYoungData.map(c => ({
          id: c.id,
          playerName: c.player_name,
          teamAbbr: c.team_abbr,
          stats: c.stats || {},
          voteCount: c.vote_count,
        })));
      }

    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if user is admin
    if (isAuthenticated && user && !user.isAdmin) {
      router.push('/offseason');
      return;
    }
    setIsLoaded(true);
    loadData();
  }, [isAuthenticated, user, router, loadData]);

  // Copy to clipboard helper
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Get active members only
  const activeMembers = members.filter(m => m.isActive);
  const inactiveMembers = members.filter(m => !m.isActive);

  // Export phone numbers for EZTexting (comma-separated)
  const exportPhoneNumbers = () => {
    const phones = activeMembers.filter(m => m.phone).map(m => m.phone).join(',');
    copyToClipboard(phones, 'phones');
  };

  // Export emails
  const exportEmails = () => {
    const emails = activeMembers.filter(m => m.email).map(m => m.email).join(',');
    copyToClipboard(emails, 'emails');
  };

  // Export as CSV
  const exportCSV = () => {
    const headers = ['Name', 'Username', 'Team', 'Email', 'Phone', 'Active', 'Questionnaire', 'FA Declared'];
    const rows = activeMembers.map(m => [
      m.displayName,
      m.username,
      m.teamName,
      m.email,
      m.phone,
      m.isActive ? 'Yes' : 'No',
      m.questionnaireCompleted ? 'Yes' : 'No',
      m.freeAgentsDeclared ? 'Yes' : 'No',
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jkap_active_members_season${seasonNumber}.csv`;
    a.click();
  };

  // Generate shareable standings image text
  const generateStandingsText = () => {
    const lines = [
      `🏆 JKAP League Season ${seasonNumber} Final Standings`,
      '',
      ...standings.map(team => 
        `${team.rank}. ${team.teamAbbr} (${team.wins}-${team.losses}) ${team.madePlayoffs ? '✅' : '❌'} - ${team.owner}`
      ),
      '',
      `✅ = Playoffs | ❌ = Winter League`,
    ];
    return lines.join('\n');
  };

  // Calculate completion stats
  const completionStats = {
    questionnaire: {
      completed: progressSummary.questionnaireCompleted,
      total: progressSummary.totalMembers,
      percent: progressSummary.totalMembers > 0 
        ? Math.round((progressSummary.questionnaireCompleted / progressSummary.totalMembers) * 100) 
        : 0,
    },
    freeAgents: {
      completed: progressSummary.declarationsSubmitted,
      total: progressSummary.totalMembers,
      percent: progressSummary.totalMembers > 0 
        ? Math.round((progressSummary.declarationsSubmitted / progressSummary.totalMembers) * 100) 
        : 0,
    },
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 py-20 text-center">
          <Shield className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">Commissioner Access Only</h1>
          <p className="text-slate-400 mb-8">This area is for league commissioners only.</p>
          <Button as="link" href="/offseason" variant="secondary">Back to Off-Season Hub</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div
          className={`mb-8 transition-all duration-500 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30">
              <Shield className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <Badge variant="outline" className="border-amber-500/50 text-amber-400 mb-1">
                Commissioner Dashboard
              </Badge>
              <h1 className="text-3xl font-display text-white tracking-wide">
                Off-Season Command Center
              </h1>
            </div>
          </div>
          <div className="flex items-center justify-between ml-16">
            <p className="text-slate-400">
              Manage the off-season program, track completions, and run voting for Season {seasonNumber}.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isLoading ? 'Loading...' : 'Refresh Data'}
            </Button>
          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-slate-800 rounded-xl p-8 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
              <p className="text-white font-medium">Loading league data...</p>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div
          className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 transition-all duration-500 delay-100 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-600/5 border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/20">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-500">{activeMembers.length}</p>
                <p className="text-xs text-muted-foreground">Active Members</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-green-600/5 border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20">
                <ClipboardList className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-500">{completionStats.questionnaire.percent}%</p>
                <p className="text-xs text-muted-foreground">Questionnaire Done</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-600/5 border-orange-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/20">
                <UserCheck className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-500">{completionStats.freeAgents.completed}</p>
                <p className="text-xs text-muted-foreground">FA Declared</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-600/5 border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20">
                <Trophy className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-500">{standings.filter(s => s.madePlayoffs).length}</p>
                <p className="text-xs text-muted-foreground">Playoff Teams</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex flex-wrap gap-2 mb-6 transition-all duration-500 delay-150 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'members', label: 'Members & SMS', icon: Users },
            { id: 'voting', label: 'Awards Voting', icon: Trophy },
            { id: 'standings', label: 'Standings', icon: Target },
            { id: 'phases', label: 'Phase Control', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div
          className={`transition-all duration-500 delay-200 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Completion Tracker */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    Completion Tracker
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    Questionnaire data from Typeform (last 45 days)
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Questionnaire */}
                  <div className="p-4 rounded-xl bg-slate-700/30 border border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">Questionnaire</span>
                      <span className="text-emerald-400 font-bold">
                        {completionStats.questionnaire.completed}/{completionStats.questionnaire.total}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${completionStats.questionnaire.percent}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {activeMembers.map(member => (
                        <span
                          key={member.id}
                          className={`px-2 py-0.5 text-xs rounded ${
                            member.questionnaireCompleted
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {member.teamId}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Free Agents */}
                  <div className="p-4 rounded-xl bg-slate-700/30 border border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">Free Agent Declarations</span>
                      <span className="text-orange-400 font-bold">
                        {completionStats.freeAgents.completed}/{completionStats.freeAgents.total}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full transition-all"
                        style={{ width: `${completionStats.freeAgents.percent}%` }}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {activeMembers.map(member => (
                        <span
                          key={member.id}
                          className={`px-2 py-0.5 text-xs rounded ${
                            member.freeAgentsDeclared
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {member.teamId}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <a
                    href={OFFSEASON_QUESTIONNAIRE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ClipboardList className="w-5 h-5 text-purple-400" />
                      <span className="text-white font-medium">Questionnaire Link</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-purple-400" />
                  </a>

                  <button
                    onClick={() => {
                      copyToClipboard(OFFSEASON_QUESTIONNAIRE_URL, 'questionnaire-link');
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-700/50 border border-slate-600 hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Copy className="w-5 h-5 text-slate-400" />
                      <span className="text-white font-medium">Copy Questionnaire URL</span>
                    </div>
                    {copiedField === 'questionnaire-link' ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('standings')}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-700/50 border border-slate-600 hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Share2 className="w-5 h-5 text-slate-400" />
                      <span className="text-white font-medium">Generate Standings for Facebook</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <Link
                    href="/offseason"
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-700/50 border border-slate-600 hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ExternalLink className="w-5 h-5 text-slate-400" />
                      <span className="text-white font-medium">View Member Off-Season Hub</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Members & SMS Tab */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Export Actions */}
              <Card className="bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-teal-500/10 border-green-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-green-400" />
                    SMS & Email Export (EZTexting Ready)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 mb-4">
                    Export active member contact info for messaging. Only includes members with recent activity.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={exportPhoneNumbers}
                      className="bg-green-600 hover:bg-green-500"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      {copiedField === 'phones' ? 'Copied!' : `Copy ${activeMembers.length} Phone Numbers`}
                    </Button>
                    <Button
                      onClick={exportEmails}
                      variant="secondary"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      {copiedField === 'emails' ? 'Copied!' : `Copy ${activeMembers.length} Emails`}
                    </Button>
                    <Button
                      onClick={exportCSV}
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Active Members */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-emerald-400" />
                      Active Members ({activeMembers.length})
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      Ready for SMS
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                          <th className="pb-3 pl-2">Member</th>
                          <th className="pb-3">Team</th>
                          <th className="pb-3">Phone</th>
                          <th className="pb-3">Email</th>
                          <th className="pb-3">Questionnaire</th>
                          <th className="pb-3">FA Declared</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMembers.map((member) => (
                          <tr key={member.id} className="border-b border-slate-700/50">
                            <td className="py-3 pl-2">
                              <div>
                                <p className="text-white font-medium">{member.displayName}</p>
                                <p className="text-xs text-slate-400">@{member.username}</p>
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge className="bg-slate-600/50">{member.teamId}</Badge>
                            </td>
                            <td className="py-3 text-slate-300 font-mono text-sm">{member.phone}</td>
                            <td className="py-3 text-slate-300 text-sm">{member.email}</td>
                            <td className="py-3">
                              {member.questionnaireCompleted ? (
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400" />
                              )}
                            </td>
                            <td className="py-3">
                              {member.freeAgentsDeclared ? (
                                <CheckCircle className="w-5 h-5 text-emerald-400" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Inactive Members */}
              {inactiveMembers.length > 0 && (
                <Card className="bg-slate-800/50 border-slate-700 opacity-75">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <UserX className="w-5 h-5 text-red-400" />
                      Inactive Members ({inactiveMembers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-400 text-sm mb-4">
                      These members haven't been active recently and are excluded from SMS exports.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {inactiveMembers.map(member => (
                        <Badge key={member.id} className="bg-red-500/20 text-red-400 border-red-500/30">
                          {member.displayName} ({member.teamId})
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Awards Voting Tab */}
          {activeTab === 'voting' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* MVP Voting */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-400" />
                    MVP Voting (Top 5 Hitters)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-sm mb-4">
                    Based on AVG, HR, RBI, SB, and OPS. Each team gets one vote.
                  </p>
                  <div className="space-y-3">
                    {MVP_CANDIDATES.map((candidate, index) => (
                      <button
                        key={candidate.name}
                        onClick={() => setMvpVote(candidate.name)}
                        disabled={votingSubmitted}
                        className={`w-full p-4 rounded-xl border transition-all text-left ${
                          mvpVote === candidate.name
                            ? 'bg-amber-500/20 border-amber-500/50'
                            : 'bg-slate-700/30 border-slate-600 hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              index === 0 ? 'bg-amber-500 text-black' :
                              index === 1 ? 'bg-slate-400 text-black' :
                              index === 2 ? 'bg-orange-600 text-white' :
                              'bg-slate-600 text-white'
                            }`}>
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-white font-medium">{candidate.name}</p>
                              <p className="text-slate-400 text-xs">{candidate.team}</p>
                            </div>
                          </div>
                          {mvpVote === candidate.name && (
                            <CheckCircle className="w-5 h-5 text-amber-400" />
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            AVG: {candidate.stats.avg}
                          </span>
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            HR: {candidate.stats.hr}
                          </span>
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            RBI: {candidate.stats.rbi}
                          </span>
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            OPS: {candidate.stats.ops}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Cy Young Voting */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-cyan-400" />
                    Cy Young Voting (Top 5 Pitchers)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-sm mb-4">
                    Based on Wins, ERA, Strikeouts, and WHIP. Each team gets one vote.
                  </p>
                  <div className="space-y-3">
                    {CY_YOUNG_CANDIDATES.map((candidate, index) => (
                      <button
                        key={candidate.name}
                        onClick={() => setCyYoungVote(candidate.name)}
                        disabled={votingSubmitted}
                        className={`w-full p-4 rounded-xl border transition-all text-left ${
                          cyYoungVote === candidate.name
                            ? 'bg-cyan-500/20 border-cyan-500/50'
                            : 'bg-slate-700/30 border-slate-600 hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              index === 0 ? 'bg-cyan-500 text-black' :
                              index === 1 ? 'bg-slate-400 text-black' :
                              index === 2 ? 'bg-orange-600 text-white' :
                              'bg-slate-600 text-white'
                            }`}>
                              {index + 1}
                            </span>
                            <div>
                              <p className="text-white font-medium">{candidate.name}</p>
                              <p className="text-slate-400 text-xs">{candidate.team}</p>
                            </div>
                          </div>
                          {cyYoungVote === candidate.name && (
                            <CheckCircle className="w-5 h-5 text-cyan-400" />
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            W: {candidate.stats.wins}
                          </span>
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            ERA: {candidate.stats.era}
                          </span>
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            K: {candidate.stats.so}
                          </span>
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            WHIP: {candidate.stats.whip}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Submit Voting */}
              <Card className="lg:col-span-2 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-red-500/10 border-amber-500/30">
                <CardContent className="py-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-white font-bold">Your Votes</h3>
                      <p className="text-slate-400 text-sm">
                        MVP: {mvpVote || 'Not selected'} | Cy Young: {cyYoungVote || 'Not selected'}
                      </p>
                    </div>
                    <Button
                      disabled={!mvpVote || !cyYoungVote || votingSubmitted}
                      onClick={() => setVotingSubmitted(true)}
                      className="bg-amber-500 hover:bg-amber-400"
                    >
                      {votingSubmitted ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Votes Submitted!
                        </>
                      ) : (
                        <>
                          <Vote className="w-4 h-4 mr-2" />
                          Submit Votes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Standings Tab */}
          {activeTab === 'standings' && (
            <div className="space-y-6">
              {/* Shareable Standings */}
              <Card className="bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-emerald-500/10 border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-blue-400" />
                    Share to Facebook
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 mb-4">
                    Copy the standings text below to paste into Facebook chat. It's formatted for easy reading.
                  </p>
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 font-mono text-sm text-slate-300 whitespace-pre-wrap mb-4">
                    {generateStandingsText()}
                  </div>
                  <Button
                    onClick={() => copyToClipboard(generateStandingsText(), 'standings-text')}
                    className="bg-blue-500 hover:bg-blue-400"
                  >
                    {copiedField === 'standings-text' ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Standings Text
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Full Standings Table */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                    Season {seasonNumber} Final Standings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                          <th className="pb-3 pl-2">Rank</th>
                          <th className="pb-3">Team</th>
                          <th className="pb-3">Owner</th>
                          <th className="pb-3 text-center">W</th>
                          <th className="pb-3 text-center">L</th>
                          <th className="pb-3 text-center">PCT</th>
                          <th className="pb-3 text-center">GB</th>
                          <th className="pb-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((team) => (
                          <tr
                            key={team.teamId}
                            className={`border-b border-slate-700/50 ${
                              team.madePlayoffs ? 'bg-emerald-500/5' : 'bg-blue-500/5'
                            }`}
                          >
                            <td className="py-3 pl-2">
                              <span className={`font-bold ${
                                team.rank === 1 ? 'text-amber-400' :
                                team.rank === 2 ? 'text-slate-300' :
                                team.rank === 3 ? 'text-orange-400' :
                                'text-slate-400'
                              }`}>
                                {team.rank}
                              </span>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <span className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-xs font-bold text-slate-300">
                                  {team.teamAbbr}
                                </span>
                                <span className="text-white font-medium">{team.teamName}</span>
                              </div>
                            </td>
                            <td className="py-3 text-slate-300">{team.owner}</td>
                            <td className="py-3 text-center text-white font-medium">{team.wins}</td>
                            <td className="py-3 text-center text-slate-400">{team.losses}</td>
                            <td className="py-3 text-center text-white">{team.pct.toFixed(3)}</td>
                            <td className="py-3 text-center text-slate-400">{team.gb}</td>
                            <td className="py-3 text-center">
                              {team.madePlayoffs ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                  <Trophy className="w-3 h-3 mr-1" />
                                  #{team.seed} Seed
                                </Badge>
                              ) : (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                  <Snowflake className="w-3 h-3 mr-1" />
                                  Winter League
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Phase Control Tab */}
          {activeTab === 'phases' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Current Phase */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-amber-400" />
                    Current Phase
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/20">
                        <ClipboardList className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-amber-400 font-bold text-lg">{getPhaseLabel(currentPhase)}</p>
                        <p className="text-slate-400 text-sm">Season {seasonNumber}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {[
                      'questionnaire',
                      'awards_voting', 
                      'free_agent_declaration',
                      'world_series',
                      'claiming_period',
                      'claim_resolution',
                      'roster_finalization',
                      'draft_prep',
                    ].map((phase) => (
                      <button
                        key={phase}
                        onClick={() => setCurrentPhase(phase as SeasonPhase)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                          currentPhase === phase
                            ? 'bg-amber-500/20 border border-amber-500/50'
                            : 'bg-slate-700/30 border border-slate-600 hover:bg-slate-700/50'
                        }`}
                      >
                        <span className="text-white">{getPhaseLabel(phase as SeasonPhase)}</span>
                        {currentPhase === phase && <CheckCircle className="w-4 h-4 text-amber-400" />}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Phase Actions */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Play className="w-5 h-5 text-emerald-400" />
                    Phase Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button fullWidth variant="secondary" className="justify-start">
                    <Play className="w-4 h-4 mr-2" />
                    Advance to Next Phase
                  </Button>
                  <Button fullWidth variant="secondary" className="justify-start">
                    <Clock className="w-4 h-4 mr-2" />
                    Set Phase Deadline
                  </Button>
                  <Button fullWidth variant="secondary" className="justify-start">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Phase Reminder (SMS)
                  </Button>
                  <Button fullWidth variant="secondary" className="justify-start">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Reset Phase Progress
                  </Button>

                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-slate-400 text-sm mb-3">Quick Links</p>
                    <div className="space-y-2">
                      <a
                        href={OFFSEASON_QUESTIONNAIRE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Typeform Questionnaire
                      </a>
                      <Link
                        href="/offseason"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Member Off-Season Hub
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
