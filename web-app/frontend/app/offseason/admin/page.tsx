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
  ArrowUp,
  ArrowDown,
  Save,
  Edit3,
  X,
  ListOrdered,
  Home,
  ArrowLeft,
  Shuffle,
  Dices,
  Lock,
  UserCog,
  Eye,
  Gamepad2,
  UserMinus,
} from 'lucide-react';
import {
  getLeagueStandings,
  getAllUsers,
  getFreeAgentDeclarations,
  getAwardCandidates,
  getCurrentSeasonState,
  getFinalStandings,
  saveFinalStandings,
  getDraftOrder,
  TeamStats,
  DBUser,
  DBFinalStanding,
  getLeagueSettings,
  saveLeagueSettings,
} from '@/lib/supabase';
import { MLB_TEAMS } from '@/types/league';
import { checkQuestionnaireCompletions, getAllQuestionnaireCompletions } from '@/lib/typeform-api';
import { 
  postQuestionnaireReminder, 
  postCustomAnnouncement, 
  postDraftOrder,
  postStandingsUpdate,
} from '@/lib/discord';

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
  const [editableStandings, setEditableStandings] = useState<StandingsData[]>([]);
  const [isEditingStandings, setIsEditingStandings] = useState(false);
  const [isSavingStandings, setIsSavingStandings] = useState(false);
  const [standingsMessage, setStandingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [draftOrder, setDraftOrder] = useState<StandingsData[]>([]);
  const [hasSavedStandings, setHasSavedStandings] = useState(false);
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

  // Draft lottery state
  const [contractedTeams, setContractedTeams] = useState<string[]>([]); // Team IDs that are contracted/omitted
  const [lockedPicksCount, setLockedPicksCount] = useState(5); // Top 5 picks are locked by default
  const [lotteryRun, setLotteryRun] = useState(false); // Whether lottery has been run
  const [lotteryResults, setLotteryResults] = useState<StandingsData[]>([]); // Final lottery results

  // Typeform completions state - ALL responses from Typeform
  const [typeformCompletions, setTypeformCompletions] = useState<{
    email: string;
    submittedAt: string;
    displayDate: string;
  }[]>([]);

  // Detailed questionnaire responses with all fields
  interface QuestionnaireDetail {
    email: string;
    name: string;
    gamertag: string;
    currentTeam: string;
    returningNextSeason: boolean;
    wantsToSwitchTeams: boolean;
    wantsToHelp: boolean;
    submittedAt: string;
    matchedMember?: MemberData;
  }
  const [questionnaireDetails, setQuestionnaireDetails] = useState<QuestionnaireDetail[]>([]);
  const [questionnaireStats, setQuestionnaireStats] = useState({
    returning: 0,
    notReturning: 0,
    wantToSwitch: 0,
    wantToHelp: 0,
  });

  // Discord announcement state
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [customAnnouncementTitle, setCustomAnnouncementTitle] = useState('');
  const [customAnnouncementMessage, setCustomAnnouncementMessage] = useState('');
  const [discordStatus, setDiscordStatus] = useState<{ type: 'success' | 'error' | 'sending'; text: string } | null>(null);

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
        finalStandingsData,
        draftOrderData,
        leagueSettings,
      ] = await Promise.all([
        getLeagueStandings(),
        getAllUsers(),
        getFreeAgentDeclarations(currentSeasonNum),
        getAwardCandidates(currentSeasonNum, 'mvp'),
        getAwardCandidates(currentSeasonNum, 'cy_young'),
        getFinalStandings(currentSeasonNum),
        getDraftOrder(currentSeasonNum),
        getLeagueSettings(),
      ]);

      // Load Discord webhook URL for announcements (separate from IL Manager webhook)
      if (leagueSettings.discord_webhook_url_announcements) {
        setDiscordWebhookUrl(leagueSettings.discord_webhook_url_announcements);
      }

      // Set season info
      setSeasonNumber(currentSeasonNum);
      if (seasonState) {
        setCurrentPhase(seasonState.phase as SeasonPhase);
        // Default playoff team count to 4 if not stored
        setPlayoffTeamCount(4);
      }

      // Check if we have commissioner-saved final standings
      const hasFinalStandings = finalStandingsData && finalStandingsData.length > 0;
      setHasSavedStandings(hasFinalStandings);

      // Use final standings if available, otherwise fall back to calculated standings
      let processedStandings: StandingsData[];
      
      if (hasFinalStandings) {
        // Use commissioner-saved standings
        processedStandings = finalStandingsData.map((team) => {
          const mlbTeam = MLB_TEAMS.find(t => t.abbreviation === team.team_abbreviation);
          const owner = usersData.find(u => u.team_id === team.team_abbreviation);
          
          return {
            rank: team.overall_rank,
            teamId: team.team_id,
            teamName: team.team_name,
            teamAbbr: team.team_abbreviation,
            wins: team.wins,
            losses: team.losses,
            pct: team.win_percentage,
            gb: team.games_back === 0 ? '-' : team.games_back.toFixed(1),
            madePlayoffs: team.made_playoffs,
            seed: team.playoff_seed,
            owner: owner?.display_name || 'Unknown',
          };
        });

        // Process draft order (reverse of standings)
        const processedDraftOrder = draftOrderData.map((team, index) => {
          const owner = usersData.find(u => u.team_id === team.team_abbreviation);
          return {
            rank: index + 1, // Draft pick number
            teamId: team.team_id,
            teamName: team.team_name,
            teamAbbr: team.team_abbreviation,
            wins: team.wins,
            losses: team.losses,
            pct: team.win_percentage,
            gb: '-',
            madePlayoffs: team.made_playoffs,
            seed: team.playoff_seed,
            owner: owner?.display_name || 'Unknown',
          };
        });
        setDraftOrder(processedDraftOrder);
      } else {
        // Fall back to calculated standings from game results
        processedStandings = standingsData.map((team, index) => {
          const mlbTeam = MLB_TEAMS.find(t => t.abbreviation === team.teamId);
          const owner = usersData.find(u => u.team_id === team.teamId);
          
          let gb = '-';
          if (index > 0) {
            const gamesBackNum = ((standingsData[0].wins - team.wins) + (team.losses - standingsData[0].losses)) / 2;
            gb = gamesBackNum.toFixed(1);
          }
          
          return {
            rank: index + 1,
            teamId: team.teamId,
            teamName: mlbTeam?.name || team.teamId,
            teamAbbr: team.teamId,
            wins: team.wins,
            losses: team.losses,
            pct: team.wins / (team.wins + team.losses) || 0,
            gb,
            madePlayoffs: index < playoffTeamCount,
            seed: index < playoffTeamCount ? index + 1 : undefined,
            owner: owner?.display_name || 'Unknown',
          };
        });

        // Set draft order as reverse (for preview before saving)
        setDraftOrder([...processedStandings].reverse().map((team, index) => ({
          ...team,
          rank: index + 1,
        })));
      }
      
      setStandings(processedStandings);
      setEditableStandings(processedStandings);

      // Get member emails for Typeform lookup
      const jkapMembers = usersData.filter(u => u.user_type === 'jkap_member');
      const memberEmails = jkapMembers.map(u => u.email).filter(Boolean) as string[];
      
      // Fetch questionnaire completions from Typeform (last 45 days)
      const questionnaireCompletions = await checkQuestionnaireCompletions(memberEmails, 45);
      
      // Also fetch ALL Typeform completions (to show who actually completed regardless of email match)
      const allTypeformResponses = await getAllQuestionnaireCompletions(45);
      setTypeformCompletions(allTypeformResponses);

      // Fetch detailed questionnaire data with all fields
      try {
        const detailedResponse = await fetch('/api/typeform/responses?days=45&full=true');
        const detailedData = await detailedResponse.json();
        if (detailedData.completions && detailedData.completions.length > 0) {
          // Map to our detail structure
          const details: QuestionnaireDetail[] = detailedData.completions.map((c: any) => {
            // Try to match with a member
            const matchedMember = jkapMembers.find(m => 
              m.email?.toLowerCase() === c.email?.toLowerCase()
            );
            
            // Parse returning/switching from allAnswers positions if needed
            const answers = c.allAnswers || [];
            const returningAnswer = answers[5]?.answer || '';
            const switchAnswer = answers[6]?.answer || '';
            const helpAnswer = answers[7]?.answer || '';
            
            return {
              email: c.email,
              name: c.name,
              gamertag: c.gamertag || answers[1]?.answer || '',
              currentTeam: c.currentTeam || answers[3]?.answer || '',
              returningNextSeason: returningAnswer.toLowerCase().includes('yes'),
              wantsToSwitchTeams: switchAnswer.toLowerCase().includes('yes'),
              wantsToHelp: helpAnswer.toLowerCase().includes('yes'),
              submittedAt: c.submittedAt,
              matchedMember: matchedMember ? {
                id: matchedMember.id,
                username: matchedMember.username,
                displayName: matchedMember.display_name,
                teamId: matchedMember.team_id || '',
                teamName: MLB_TEAMS.find(t => t.abbreviation === matchedMember.team_id)?.name || '',
                email: matchedMember.email || '',
                phone: matchedMember.phone || '',
                isActive: true,
                lastActive: matchedMember.created_at,
                questionnaireCompleted: true,
                freeAgentsDeclared: false,
              } : undefined,
            };
          });
          setQuestionnaireDetails(details);
          
          // Calculate stats
          setQuestionnaireStats({
            returning: details.filter(d => d.returningNextSeason).length,
            notReturning: details.filter(d => !d.returningNextSeason).length,
            wantToSwitch: details.filter(d => d.wantsToSwitchTeams).length,
            wantToHelp: details.filter(d => d.wantsToHelp).length,
          });
        }
      } catch (err) {
        console.error('Error fetching detailed questionnaire data:', err);
      }
      
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
          isActive: true, // Default to active (no tracking yet)
          lastActive: u.created_at || '',
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
          voteCount: 0, // Vote tracking not yet implemented
        })));
      }

      if (cyYoungData && cyYoungData.length > 0) {
        setCyYoungCandidates(cyYoungData.map(c => ({
          id: c.id,
          playerName: c.player_name,
          teamAbbr: c.team_abbr,
          stats: c.stats || {},
          voteCount: 0, // Vote tracking not yet implemented
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

  // Update a single team's standings
  const updateTeamStanding = (teamId: string, field: keyof StandingsData, value: any) => {
    setEditableStandings(prev => prev.map(team => {
      if (team.teamId === teamId) {
        const updated = { ...team, [field]: value };
        // Auto-calculate pct when wins/losses change
        if (field === 'wins' || field === 'losses') {
          const totalGames = (field === 'wins' ? value : team.wins) + (field === 'losses' ? value : team.losses);
          updated.pct = totalGames > 0 ? (field === 'wins' ? value : team.wins) / totalGames : 0;
        }
        return updated;
      }
      return team;
    }));
  };

  // Move team up in standings
  const moveTeamUp = (index: number) => {
    if (index === 0) return;
    setEditableStandings(prev => {
      const newOrder = [...prev];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      return newOrder.map((team, i) => ({ ...team, rank: i + 1 }));
    });
  };

  // Move team down in standings
  const moveTeamDown = (index: number) => {
    if (index === editableStandings.length - 1) return;
    setEditableStandings(prev => {
      const newOrder = [...prev];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      return newOrder.map((team, i) => ({ ...team, rank: i + 1 }));
    });
  };

  // Save standings to database
  const handleSaveStandings = async () => {
    setIsSavingStandings(true);
    setStandingsMessage(null);
    
    try {
      const standingsToSave = editableStandings.map((team, index) => ({
        team_id: team.teamId,
        team_name: team.teamName,
        team_abbreviation: team.teamAbbr,
        wins: team.wins,
        losses: team.losses,
        overall_rank: index + 1,
        made_playoffs: team.madePlayoffs,
        playoff_seed: team.seed,
      }));

      const result = await saveFinalStandings(seasonNumber, standingsToSave);
      
      if (result.success) {
        setStandingsMessage({ type: 'success', text: 'Standings saved successfully!' });
        setIsEditingStandings(false);
        setHasSavedStandings(true);
        // Update main standings and draft order
        setStandings(editableStandings);
        setDraftOrder([...editableStandings].reverse().map((team, i) => ({ ...team, rank: i + 1 })));
      } else {
        setStandingsMessage({ type: 'error', text: result.error || 'Failed to save standings' });
      }
    } catch (err: any) {
      setStandingsMessage({ type: 'error', text: err.message || 'Error saving standings' });
    } finally {
      setIsSavingStandings(false);
    }
  };

  // Cancel editing and reset
  const cancelEditStandings = () => {
    setEditableStandings(standings);
    setIsEditingStandings(false);
    setStandingsMessage(null);
  };

  // Toggle team contracted status
  const toggleContractedTeam = (teamId: string) => {
    setContractedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
    // Reset lottery when teams change
    setLotteryRun(false);
    setLotteryResults([]);
  };

  // Run the draft lottery
  const runDraftLottery = () => {
    // Get active teams (not contracted) sorted by standings (worst first)
    const activeTeams = standings
      .filter(team => !contractedTeams.includes(team.teamId))
      .sort((a, b) => b.rank - a.rank); // Worst record first (highest rank number = worst)

    if (activeTeams.length === 0) {
      setStandingsMessage({ type: 'error', text: 'No active teams to run lottery!' });
      return;
    }

    // Locked picks: Top N picks go to worst N teams
    const lockedTeams = activeTeams.slice(0, lockedPicksCount);
    const lotteryTeams = activeTeams.slice(lockedPicksCount);

    // Weighted lottery for remaining picks
    // Worse teams get higher weights (more lottery balls)
    const weightedLottery = (teams: StandingsData[]): StandingsData[] => {
      if (teams.length === 0) return [];
      
      const result: StandingsData[] = [];
      const remaining = [...teams];
      
      while (remaining.length > 0) {
        // Calculate weights - team at index 0 (worst remaining) gets highest weight
        const totalWeight = remaining.reduce((sum, _, index) => sum + (remaining.length - index), 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < remaining.length; i++) {
          const weight = remaining.length - i; // Worst team gets highest weight
          random -= weight;
          if (random <= 0) {
            result.push(remaining[i]);
            remaining.splice(i, 1);
            break;
          }
        }
      }
      
      return result;
    };

    // Run the lottery for non-locked picks
    const lotteryOrder = weightedLottery(lotteryTeams);

    // Combine locked + lottery results
    const finalOrder = [...lockedTeams, ...lotteryOrder].map((team, index) => ({
      ...team,
      rank: index + 1, // Draft pick number
    }));

    setLotteryResults(finalOrder);
    setDraftOrder(finalOrder);
    setLotteryRun(true);
    setStandingsMessage({ type: 'success', text: 'Draft lottery complete! Results shown below.' });
  };

  // Reset lottery
  const resetLottery = () => {
    setLotteryRun(false);
    setLotteryResults([]);
    // Reset to reverse standings
    const activeTeams = standings
      .filter(team => !contractedTeams.includes(team.teamId))
      .sort((a, b) => b.rank - a.rank)
      .map((team, index) => ({ ...team, rank: index + 1 }));
    setDraftOrder(activeTeams);
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
          {/* View Mode Toggle - Prominent switching between Commissioner and Member view */}
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-800/50 to-blue-500/10 border border-slate-600">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Current Mode Indicator */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
                  <Shield className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-amber-400 font-bold text-sm">COMMISSIONER MODE</p>
                  <p className="text-slate-400 text-xs">Managing league as admin</p>
                </div>
              </div>

              {/* View Switching */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400 text-sm mr-2">Switch to:</span>
                
                <Link href="/offseason">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">
                    <Eye className="w-4 h-4 mr-2" />
                    Member Off-Season View
                  </Button>
                </Link>
                
                <Link href="/ballyard">
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white">
                    <Target className="w-4 h-4 mr-2" />
                    My Team (Diamondbacks)
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Quick Navigation */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-600/50">
              <span className="text-slate-500 text-xs">Quick links:</span>
              <Link href="/" className="text-slate-400 hover:text-white text-xs flex items-center gap-1">
                <Home className="w-3 h-3" /> Home
              </Link>
              <Link href="/ballyard" className="text-slate-400 hover:text-white text-xs flex items-center gap-1">
                <Target className="w-3 h-3" /> The Ballyard
              </Link>
              <Link href="/standings" className="text-slate-400 hover:text-white text-xs flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> Standings
              </Link>
              <Link href="/offseason?tab=free-agents" className="text-slate-400 hover:text-white text-xs flex items-center gap-1">
                <Users className="w-3 h-3" /> Free Agents
              </Link>
            </div>
          </div>

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

                  {/* Detailed Questionnaire Responses */}
                  <div className="p-4 rounded-xl bg-emerald-900/20 border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-emerald-400" />
                        Questionnaire Responses ({questionnaireDetails.length})
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        Last 45 Days
                      </Badge>
                    </div>
                    
                    {/* Stats Summary */}
                    {questionnaireDetails.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                          <p className="text-lg font-bold text-emerald-400">{questionnaireStats.returning}</p>
                          <p className="text-xs text-slate-400">Returning</p>
                        </div>
                        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                          <p className="text-lg font-bold text-red-400">{questionnaireStats.notReturning}</p>
                          <p className="text-xs text-slate-400">Not Returning</p>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
                          <p className="text-lg font-bold text-amber-400">{questionnaireStats.wantToSwitch}</p>
                          <p className="text-xs text-slate-400">Want Switch</p>
                        </div>
                        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-center">
                          <p className="text-lg font-bold text-purple-400">{questionnaireStats.wantToHelp}</p>
                          <p className="text-xs text-slate-400">Want to Help</p>
                        </div>
                      </div>
                    )}

                    {/* Team Switchers Alert */}
                    {questionnaireStats.wantToSwitch > 0 && (
                      <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Shuffle className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400 font-medium text-sm">Team Switch Pool</span>
                        </div>
                        <div className="space-y-1">
                          {questionnaireDetails
                            .filter(d => d.wantsToSwitchTeams)
                            .map((d, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-white">{d.name}</span>
                                <span className="text-amber-400">{d.currentTeam}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Detailed List */}
                    {questionnaireDetails.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {questionnaireDetails.map((detail, idx) => (
                          <div 
                            key={idx}
                            className={`p-3 rounded-lg border ${
                              detail.wantsToSwitchTeams 
                                ? 'bg-amber-500/10 border-amber-500/30' 
                                : !detail.returningNextSeason
                                ? 'bg-red-500/10 border-red-500/30'
                                : 'bg-slate-800/50 border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                {detail.returningNextSeason ? (
                                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400" />
                                )}
                                <span className="text-white font-medium">{detail.name}</span>
                                {detail.wantsToSwitchTeams && (
                                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                                    WANTS SWITCH
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-slate-400">{detail.currentTeam}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <Gamepad2 className="w-3 h-3" />
                                {detail.gamertag || 'No PSN'}
                              </span>
                              <span>{detail.email}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-400">
                        <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No questionnaire responses found</p>
                        <p className="text-xs text-slate-500">Check Typeform credentials in Vercel</p>
                      </div>
                    )}
                    
                    {/* Copy Actions */}
                    {questionnaireDetails.length > 0 && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            const emails = questionnaireDetails.map(c => c.email).join('\n');
                            copyToClipboard(emails, 'typeform-emails');
                          }}
                          className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm"
                        >
                          {copiedField === 'typeform-emails' ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy Emails
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            const gamertags = questionnaireDetails.map(c => c.gamertag).filter(Boolean).join('\n');
                            copyToClipboard(gamertags, 'gamertags');
                          }}
                          className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 hover:bg-purple-500/20 transition-colors text-sm"
                        >
                          {copiedField === 'gamertags' ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Gamepad2 className="w-4 h-4" />
                              Copy Gamertags
                            </>
                          )}
                        </button>
                      </div>
                    )}
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

              {/* Discord Announcements */}
              <Card className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-blue-500/10 border-indigo-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Send className="w-5 h-5 text-indigo-400" />
                    Discord Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Webhook URL Input */}
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      Discord Webhook URL (Main Chat)
                    </label>
                    <input
                      type="text"
                      value={discordWebhookUrl}
                      onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                      onBlur={async (e) => {
                        const url = e.target.value.trim();
                        if (url && url.startsWith('https://discord.com/api/webhooks/')) {
                          await saveLeagueSettings({ discord_webhook_url_announcements: url });
                          setDiscordStatus({ type: 'success', text: '✓ Webhook URL saved!' });
                          setTimeout(() => setDiscordStatus(null), 3000);
                        }
                      }}
                      placeholder="https://discord.com/api/webhooks/..."
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {discordWebhookUrl ? '✓ Webhook configured - auto-saves when changed' : 'Get this from Discord: Server Settings → Integrations → Webhooks → New Webhook'}
                    </p>
                  </div>

                  {/* Status Message */}
                  {discordStatus && (
                    <div className={`p-3 rounded-lg text-sm ${
                      discordStatus.type === 'success' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : discordStatus.type === 'error'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    }`}>
                      {discordStatus.type === 'sending' && <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />}
                      {discordStatus.text}
                    </div>
                  )}

                  {/* Quick Announcements */}
                  <div className="space-y-2">
                    <p className="text-sm text-slate-400 font-medium">Quick Announcements</p>
                    
                    {/* Questionnaire Reminder */}
                    <button
                      onClick={async () => {
                        if (!discordWebhookUrl) {
                          setDiscordStatus({ type: 'error', text: 'Please enter a Discord webhook URL first' });
                          return;
                        }
                        setDiscordStatus({ type: 'sending', text: 'Sending questionnaire reminder...' });
                        const teamsNotCompleted = members
                          .filter(m => !m.questionnaireCompleted)
                          .map(m => m.teamId.toUpperCase());
                        const completedCount = members.filter(m => m.questionnaireCompleted).length;
                        const result = await postQuestionnaireReminder(
                          discordWebhookUrl,
                          teamsNotCompleted,
                          members.length,
                          completedCount
                        );
                        if (result.success) {
                          setDiscordStatus({ type: 'success', text: '✓ Questionnaire reminder sent to Discord!' });
                        } else {
                          setDiscordStatus({ type: 'error', text: result.error || 'Failed to send' });
                        }
                        setTimeout(() => setDiscordStatus(null), 5000);
                      }}
                      disabled={!discordWebhookUrl}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-amber-400" />
                        <span className="text-white text-sm">Send Questionnaire Reminder</span>
                      </div>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        {members.filter(m => !m.questionnaireCompleted).length} pending
                      </Badge>
                    </button>

                    {/* FA Declaration Reminder */}
                    <button
                      onClick={async () => {
                        if (!discordWebhookUrl) {
                          setDiscordStatus({ type: 'error', text: 'Please enter a Discord webhook URL first' });
                          return;
                        }
                        setDiscordStatus({ type: 'sending', text: 'Sending FA declaration reminder...' });
                        const teamsNotDeclared = members
                          .filter(m => !m.freeAgentsDeclared)
                          .map(m => m.teamId);
                        const declaredCount = members.filter(m => m.freeAgentsDeclared).length;
                        const { postFADeclarationReminder } = await import('@/lib/discord');
                        const result = await postFADeclarationReminder(
                          discordWebhookUrl,
                          teamsNotDeclared,
                          members.length,
                          declaredCount
                        );
                        if (result.success) {
                          setDiscordStatus({ type: 'success', text: '✓ FA declaration reminder sent to Discord!' });
                        } else {
                          setDiscordStatus({ type: 'error', text: result.error || 'Failed to send' });
                        }
                        setTimeout(() => setDiscordStatus(null), 5000);
                      }}
                      disabled={!discordWebhookUrl}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <UserMinus className="w-4 h-4 text-orange-400" />
                        <span className="text-white text-sm">Send FA Declaration Reminder</span>
                      </div>
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        {members.filter(m => !m.freeAgentsDeclared).length} pending
                      </Badge>
                    </button>

                    {/* Post Draft Order */}
                    {lotteryResults.length > 0 && (
                      <button
                        onClick={async () => {
                          if (!discordWebhookUrl) {
                            setDiscordStatus({ type: 'error', text: 'Please enter a Discord webhook URL first' });
                            return;
                          }
                          setDiscordStatus({ type: 'sending', text: 'Posting draft order...' });
                          const draftOrderData = lotteryResults.map((team, idx) => ({
                            pick: idx + 1,
                            teamAbbr: team.teamAbbr.toUpperCase(),
                            teamName: team.teamName,
                          }));
                          const result = await postDraftOrder(discordWebhookUrl, draftOrderData, seasonNumber);
                          if (result.success) {
                            setDiscordStatus({ type: 'success', text: '✓ Draft order posted to Discord!' });
                          } else {
                            setDiscordStatus({ type: 'error', text: result.error || 'Failed to send' });
                          }
                          setTimeout(() => setDiscordStatus(null), 5000);
                        }}
                        disabled={!discordWebhookUrl}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-2">
                          <ListOrdered className="w-4 h-4 text-blue-400" />
                          <span className="text-white text-sm">Post Draft Order</span>
                        </div>
                        <Send className="w-4 h-4 text-blue-400" />
                      </button>
                    )}

                    {/* Post Standings */}
                    {standings.length > 0 && (
                      <button
                        onClick={async () => {
                          if (!discordWebhookUrl) {
                            setDiscordStatus({ type: 'error', text: 'Please enter a Discord webhook URL first' });
                            return;
                          }
                          setDiscordStatus({ type: 'sending', text: 'Posting standings...' });
                          const standingsData = standings.map(s => ({
                            rank: s.rank,
                            teamAbbr: s.teamAbbr.toUpperCase(),
                            wins: s.wins,
                            losses: s.losses,
                          }));
                          const result = await postStandingsUpdate(discordWebhookUrl, standingsData, seasonNumber);
                          if (result.success) {
                            setDiscordStatus({ type: 'success', text: '✓ Standings posted to Discord!' });
                          } else {
                            setDiscordStatus({ type: 'error', text: result.error || 'Failed to send' });
                          }
                          setTimeout(() => setDiscordStatus(null), 5000);
                        }}
                        disabled={!discordWebhookUrl}
                        className="w-full flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-emerald-400" />
                          <span className="text-white text-sm">Post Standings</span>
                        </div>
                        <Send className="w-4 h-4 text-emerald-400" />
                      </button>
                    )}
                  </div>

                  {/* Custom Announcement */}
                  <div className="pt-3 border-t border-slate-700">
                    <p className="text-sm text-slate-400 font-medium mb-2">Custom Announcement</p>
                    <input
                      type="text"
                      value={customAnnouncementTitle}
                      onChange={(e) => setCustomAnnouncementTitle(e.target.value)}
                      placeholder="Announcement title..."
                      className="w-full px-3 py-2 mb-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none text-sm"
                    />
                    <textarea
                      value={customAnnouncementMessage}
                      onChange={(e) => setCustomAnnouncementMessage(e.target.value)}
                      placeholder="Type your announcement message here..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none text-sm resize-none"
                    />
                    <button
                      onClick={async () => {
                        if (!discordWebhookUrl) {
                          setDiscordStatus({ type: 'error', text: 'Please enter a Discord webhook URL first' });
                          return;
                        }
                        if (!customAnnouncementTitle.trim() || !customAnnouncementMessage.trim()) {
                          setDiscordStatus({ type: 'error', text: 'Please enter both title and message' });
                          return;
                        }
                        setDiscordStatus({ type: 'sending', text: 'Sending announcement...' });
                        const result = await postCustomAnnouncement(
                          discordWebhookUrl,
                          customAnnouncementTitle,
                          customAnnouncementMessage
                        );
                        if (result.success) {
                          setDiscordStatus({ type: 'success', text: '✓ Announcement posted to Discord!' });
                          setCustomAnnouncementTitle('');
                          setCustomAnnouncementMessage('');
                        } else {
                          setDiscordStatus({ type: 'error', text: result.error || 'Failed to send' });
                        }
                        setTimeout(() => setDiscordStatus(null), 5000);
                      }}
                      disabled={!discordWebhookUrl || !customAnnouncementTitle.trim() || !customAnnouncementMessage.trim()}
                      className="mt-2 w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      Send Custom Announcement
                    </button>
                  </div>
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
                    {mvpCandidates.map((candidate, index) => (
                      <button
                        key={candidate.playerName}
                        onClick={() => setMvpVote(candidate.playerName)}
                        disabled={votingSubmitted}
                        className={`w-full p-4 rounded-xl border transition-all text-left ${
                          mvpVote === candidate.playerName
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
                              <p className="text-white font-medium">{candidate.playerName}</p>
                              <p className="text-slate-400 text-xs">{candidate.teamAbbr}</p>
                            </div>
                          </div>
                          {mvpVote === candidate.playerName && (
                            <CheckCircle className="w-5 h-5 text-amber-400" />
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            AVG: {candidate.stats.avg || 'N/A'}
                          </span>
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            HR: {candidate.stats.hr || 'N/A'}
                          </span>
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            RBI: {candidate.stats.rbi || 'N/A'}
                          </span>
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            OPS: {candidate.stats.ops || 'N/A'}
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
                    {cyYoungCandidates.map((candidate, index) => (
                      <button
                        key={candidate.playerName}
                        onClick={() => setCyYoungVote(candidate.playerName)}
                        disabled={votingSubmitted}
                        className={`w-full p-4 rounded-xl border transition-all text-left ${
                          cyYoungVote === candidate.playerName
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
                              <p className="text-white font-medium">{candidate.playerName}</p>
                              <p className="text-slate-400 text-xs">{candidate.teamAbbr}</p>
                            </div>
                          </div>
                          {cyYoungVote === candidate.playerName && (
                            <CheckCircle className="w-5 h-5 text-cyan-400" />
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            W: {candidate.stats.wins || 'N/A'}
                          </span>
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            ERA: {candidate.stats.era || 'N/A'}
                          </span>
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            K: {candidate.stats.so || 'N/A'}
                          </span>
                          <span className="px-2 py-1 rounded bg-slate-600/50 text-slate-300">
                            WHIP: {candidate.stats.whip || 'N/A'}
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
              {/* Status Message */}
              {standingsMessage && (
                <div className={`p-4 rounded-xl border ${
                  standingsMessage.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {standingsMessage.text}
                </div>
              )}

              {/* Editable Standings */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-amber-400" />
                      Season {seasonNumber} Final Standings
                      {hasSavedStandings && (
                        <Badge className="ml-2 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          Saved
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex gap-2">
                      {isEditingStandings ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={cancelEditStandings}
                            disabled={isSavingStandings}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveStandings}
                            disabled={isSavingStandings}
                            className="bg-emerald-600 hover:bg-emerald-500"
                          >
                            {isSavingStandings ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-1" />
                            )}
                            Save Standings
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => setIsEditingStandings(true)}
                          className="bg-amber-600 hover:bg-amber-500"
                        >
                          <Edit3 className="w-4 h-4 mr-1" />
                          Edit Standings
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mt-2">
                    {isEditingStandings 
                      ? 'Drag teams to reorder, edit W/L records, and set playoff status. Changes are saved when you click Save.'
                      : 'Click Edit to manually input final standings. The draft order will be the reverse of these standings.'}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                          {isEditingStandings && <th className="pb-3 w-16">Order</th>}
                          <th className="pb-3 pl-2">Rank</th>
                          <th className="pb-3">Team</th>
                          <th className="pb-3">Owner</th>
                          <th className="pb-3 text-center">W</th>
                          <th className="pb-3 text-center">L</th>
                          <th className="pb-3 text-center">PCT</th>
                          <th className="pb-3 text-center">Playoffs</th>
                          <th className="pb-3 text-center">Seed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(isEditingStandings ? editableStandings : standings).map((team, index) => (
                          <tr
                            key={team.teamId}
                            className={`border-b border-slate-700/50 ${
                              team.madePlayoffs ? 'bg-emerald-500/5' : 'bg-blue-500/5'
                            }`}
                          >
                            {isEditingStandings && (
                              <td className="py-2">
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => moveTeamUp(index)}
                                    disabled={index === 0}
                                    className="p-1 rounded hover:bg-slate-600 disabled:opacity-30"
                                  >
                                    <ArrowUp className="w-4 h-4 text-slate-400" />
                                  </button>
                                  <button
                                    onClick={() => moveTeamDown(index)}
                                    disabled={index === editableStandings.length - 1}
                                    className="p-1 rounded hover:bg-slate-600 disabled:opacity-30"
                                  >
                                    <ArrowDown className="w-4 h-4 text-slate-400" />
                                  </button>
                                </div>
                              </td>
                            )}
                            <td className="py-3 pl-2">
                              <span className={`font-bold ${
                                (index + 1) === 1 ? 'text-amber-400' :
                                (index + 1) === 2 ? 'text-slate-300' :
                                (index + 1) === 3 ? 'text-orange-400' :
                                'text-slate-400'
                              }`}>
                                {index + 1}
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
                            <td className="py-3 text-center">
                              {isEditingStandings ? (
                                <input
                                  type="number"
                                  value={team.wins}
                                  onChange={(e) => updateTeamStanding(team.teamId, 'wins', parseInt(e.target.value) || 0)}
                                  className="w-14 px-2 py-1 rounded bg-slate-700 border border-slate-600 text-white text-center"
                                />
                              ) : (
                                <span className="text-white font-medium">{team.wins}</span>
                              )}
                            </td>
                            <td className="py-3 text-center">
                              {isEditingStandings ? (
                                <input
                                  type="number"
                                  value={team.losses}
                                  onChange={(e) => updateTeamStanding(team.teamId, 'losses', parseInt(e.target.value) || 0)}
                                  className="w-14 px-2 py-1 rounded bg-slate-700 border border-slate-600 text-white text-center"
                                />
                              ) : (
                                <span className="text-slate-400">{team.losses}</span>
                              )}
                            </td>
                            <td className="py-3 text-center text-white">{team.pct.toFixed(3)}</td>
                            <td className="py-3 text-center">
                              {isEditingStandings ? (
                                <button
                                  onClick={() => updateTeamStanding(team.teamId, 'madePlayoffs', !team.madePlayoffs)}
                                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                    team.madePlayoffs 
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                      : 'bg-slate-600/50 text-slate-400 border border-slate-500/30'
                                  }`}
                                >
                                  {team.madePlayoffs ? 'Yes' : 'No'}
                                </button>
                              ) : (
                                team.madePlayoffs ? (
                                  <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-slate-500 mx-auto" />
                                )
                              )}
                            </td>
                            <td className="py-3 text-center">
                              {isEditingStandings && team.madePlayoffs ? (
                                <input
                                  type="number"
                                  value={team.seed || ''}
                                  onChange={(e) => updateTeamStanding(team.teamId, 'seed', parseInt(e.target.value) || undefined)}
                                  className="w-14 px-2 py-1 rounded bg-slate-700 border border-slate-600 text-white text-center"
                                  placeholder="#"
                                />
                              ) : team.madePlayoffs && team.seed ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                  #{team.seed}
                                </Badge>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* JKAP Draft Lottery */}
              <Card className="bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-blue-500/10 border-purple-500/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Dices className="w-5 h-5 text-purple-400" />
                    JKAP Draft Lottery - Season {seasonNumber + 1}
                  </CardTitle>
                  <p className="text-slate-400 text-sm mt-1">
                    Top {lockedPicksCount} picks are locked to worst records. Remaining picks determined by weighted lottery.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Lottery Settings */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Locked Picks Setting */}
                    <div className="p-4 rounded-xl bg-slate-700/30 border border-slate-600">
                      <label className="text-white font-medium flex items-center gap-2 mb-3">
                        <Lock className="w-4 h-4 text-amber-400" />
                        Locked Picks (Non-Lottery)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          max={standings.length - contractedTeams.length}
                          value={lockedPicksCount}
                          onChange={(e) => {
                            setLockedPicksCount(parseInt(e.target.value) || 0);
                            setLotteryRun(false);
                          }}
                          className="w-20 px-3 py-2 rounded bg-slate-800 border border-slate-600 text-white text-center"
                        />
                        <span className="text-slate-400 text-sm">
                          worst teams get picks 1-{lockedPicksCount} automatically
                        </span>
                      </div>
                    </div>

                    {/* Run Lottery Button */}
                    <div className="p-4 rounded-xl bg-slate-700/30 border border-slate-600">
                      <label className="text-white font-medium flex items-center gap-2 mb-3">
                        <Shuffle className="w-4 h-4 text-purple-400" />
                        Lottery Actions
                      </label>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={runDraftLottery}
                          className="bg-purple-600 hover:bg-purple-500"
                        >
                          <Dices className="w-4 h-4 mr-2" />
                          {lotteryRun ? 'Re-Run Lottery' : 'Run Draft Lottery'}
                        </Button>
                        {lotteryRun && (
                          <Button
                            variant="secondary"
                            onClick={resetLottery}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contracted/Omitted Teams */}
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                    <label className="text-white font-medium flex items-center gap-2 mb-3">
                      <XCircle className="w-4 h-4 text-red-400" />
                      Contracted Teams (Omit from Draft)
                    </label>
                    <p className="text-slate-400 text-sm mb-3">
                      Select teams that have been contracted this season. They will be excluded from the draft order.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {standings.map(team => (
                        <button
                          key={team.teamId}
                          onClick={() => toggleContractedTeam(team.teamId)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            contractedTeams.includes(team.teamId)
                              ? 'bg-red-500/30 text-red-400 border border-red-500/50 line-through'
                              : 'bg-slate-600/50 text-slate-300 border border-slate-500/30 hover:bg-slate-600'
                          }`}
                        >
                          {team.teamAbbr}
                        </button>
                      ))}
                    </div>
                    {contractedTeams.length > 0 && (
                      <p className="text-red-400 text-sm mt-2">
                        {contractedTeams.length} team(s) contracted: {contractedTeams.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Draft Order Results */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-white font-medium">Draft Order</h3>
                      {lotteryRun && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          Lottery Complete
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {draftOrder.map((team, index) => {
                        const isLocked = index < lockedPicksCount;
                        const isContracted = contractedTeams.includes(team.teamId);
                        
                        if (isContracted) return null;
                        
                        return (
                          <div
                            key={team.teamId}
                            className={`flex items-center gap-3 p-3 rounded-xl border ${
                              isLocked 
                                ? 'bg-amber-500/10 border-amber-500/30' 
                                : lotteryRun 
                                  ? 'bg-purple-500/10 border-purple-500/30'
                                  : 'bg-slate-700/30 border-slate-600'
                            }`}
                          >
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              index === 0 ? 'bg-amber-500 text-black' :
                              index === 1 ? 'bg-slate-400 text-black' :
                              index === 2 ? 'bg-orange-600 text-white' :
                              isLocked ? 'bg-amber-600/80 text-white' :
                              'bg-slate-600 text-white'
                            }`}>
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-white font-medium">{team.teamName}</p>
                              <p className="text-slate-400 text-xs">
                                {team.owner} • {team.wins}-{team.losses}
                              </p>
                            </div>
                            {isLocked ? (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                                <Lock className="w-3 h-3 mr-1" />
                                Locked
                              </Badge>
                            ) : lotteryRun ? (
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                                <Shuffle className="w-3 h-3 mr-1" />
                                Lottery
                              </Badge>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-slate-500 text-xs mt-3">
                      {standings.length - contractedTeams.length} active teams • {lockedPicksCount} locked picks • {Math.max(0, standings.length - contractedTeams.length - lockedPicksCount)} lottery picks
                    </p>
                  </div>
                </CardContent>
              </Card>

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
                  <div className="flex gap-3">
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
                    <Button
                      onClick={() => {
                        const activeTeams = draftOrder.filter(t => !contractedTeams.includes(t.teamId));
                        const draftText = [
                          `🎲 JKAP League Season ${seasonNumber + 1} Draft Order`,
                          lotteryRun ? '(Lottery Complete)' : '',
                          '',
                          `🔒 LOCKED PICKS (1-${lockedPicksCount}):`,
                          ...activeTeams.slice(0, lockedPicksCount).map((team, i) => 
                            `${i + 1}. ${team.teamAbbr} (${team.wins}-${team.losses}) - ${team.owner}`
                          ),
                          '',
                          `🎰 LOTTERY PICKS (${lockedPicksCount + 1}-${activeTeams.length}):`,
                          ...activeTeams.slice(lockedPicksCount).map((team, i) => 
                            `${lockedPicksCount + i + 1}. ${team.teamAbbr} (${team.wins}-${team.losses}) - ${team.owner}`
                          ),
                          '',
                          contractedTeams.length > 0 ? `❌ Contracted: ${contractedTeams.join(', ')}` : '',
                        ].filter(Boolean).join('\n');
                        copyToClipboard(draftText, 'draft-order-text');
                      }}
                      variant="secondary"
                    >
                      {copiedField === 'draft-order-text' ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Dices className="w-4 h-4 mr-2" />
                          Copy Draft Order
                        </>
                      )}
                    </Button>
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
                    Phase Transition
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Transition Approval */}
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-emerald-400 font-medium">Ready to Advance?</span>
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        {getPhaseLabel(currentPhase)}
                      </Badge>
                    </div>
                    
                    {/* Completion Status */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Questionnaire</span>
                        <span className={progressSummary.questionnaireCompleted === progressSummary.totalMembers ? 'text-emerald-400' : 'text-amber-400'}>
                          {progressSummary.questionnaireCompleted}/{progressSummary.totalMembers}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">FA Declarations</span>
                        <span className={progressSummary.declarationsSubmitted > 0 ? 'text-emerald-400' : 'text-amber-400'}>
                          {progressSummary.declarationsSubmitted} submitted
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        const nextPhases: Record<string, SeasonPhase> = {
                          'questionnaire': 'free_agent_declaration',
                          'free_agent_declaration': 'claiming_period',
                          'claiming_period': 'claim_resolution',
                          'claim_resolution': 'roster_finalization',
                          'roster_finalization': 'draft_prep',
                          'draft_prep': 'draft',
                          'draft': 'pre_season',
                        };
                        const nextPhase = nextPhases[currentPhase];
                        if (nextPhase && confirm(`Advance to "${getPhaseLabel(nextPhase)}"?\n\nThis will:\n• Update the phase for all members\n• Post announcement to Discord (if configured)\n\nContinue?`)) {
                          setCurrentPhase(nextPhase);
                          // Post to Discord if webhook is set
                          if (discordWebhookUrl) {
                            const announcements: Record<string, { title: string; msg: string }> = {
                              'free_agent_declaration': { title: 'Free Agent Declaration Period', msg: '🔄 **Declare your free agents!**\n\nYou must declare at least **1 player** as a free agent before the deadline.' },
                              'claiming_period': { title: '48-Hour Claiming Window Open!', msg: '🎯 **The claiming period has begun!**\n\nYou have **48 hours** to submit claims on declared free agents.' },
                              'draft_prep': { title: 'Draft Order Announced!', msg: '🎯 **The draft order has been set!**\n\nReview the draft board and prepare your strategy.' },
                              'draft': { title: 'DRAFT DAY!', msg: '🏈 **IT\'S DRAFT DAY!**\n\nHead to the Draft Tool to participate. Good luck!' },
                            };
                            const ann = announcements[nextPhase];
                            if (ann) {
                              await postCustomAnnouncement(discordWebhookUrl, ann.title, ann.msg);
                            }
                          }
                          setDiscordStatus({ type: 'success', text: `✓ Advanced to ${getPhaseLabel(nextPhase)}` });
                          setTimeout(() => setDiscordStatus(null), 5000);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                      Advance to Next Phase
                    </button>
                  </div>

                  {/* Manual Phase Override */}
                  <div className="pt-3 border-t border-slate-700">
                    <p className="text-slate-400 text-sm mb-2">Manual Override</p>
                    <p className="text-xs text-slate-500 mb-3">
                      Use the phase list above to manually set any phase. Click a phase to switch.
                    </p>
                  </div>

                  {/* Quick Links */}
                  <div className="pt-3 border-t border-slate-700">
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
                      <Link
                        href="/draft"
                        className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Draft Tool
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
