'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  SeasonPhase,
  SeasonState,
  FreeAgentDeclaration,
  FreeAgentClaim,
  QuestionnaireStatus,
  OffseasonProgress,
  PlayerClassification,
  CLASSIFICATION_COLORS,
  CLASSIFICATION_ORDER,
  getPhaseLabel,
  getPhaseDescription,
  isValidClaim,
  getClaimableClassifications,
  OFFSEASON_QUESTIONNAIRE_URL,
  DEFAULT_OFFSEASON_TASKS,
} from '@/types/offseason';
import {
  Calendar,
  Trophy,
  ClipboardList,
  Users,
  UserMinus,
  UserPlus,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Award,
  Target,
  FileText,
  Send,
  Shield,
  BarChart3,
  Flame,
  Star,
  Gift,
  Scroll,
  PlayCircle,
  PauseCircle,
  ListChecks,
  ArrowRight,
  HelpCircle,
  Info,
  Vote,
  Snowflake,
  Search,
  Gamepad2,
} from 'lucide-react';
import { PlayerSearchModal } from '@/components/offseason/PlayerSearchModal';

// Default season state (will be replaced by API data)
const DEFAULT_SEASON_STATE: SeasonState = {
  id: 'season-4',
  season_number: 4,
  phase: 'questionnaire',
  phase_started_at: new Date().toISOString(),
  phase_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Phase icons mapping
const PHASE_ICONS: Record<SeasonPhase, React.ReactNode> = {
  regular_season: <PlayCircle className="w-5 h-5" />,
  postseason_sim: <BarChart3 className="w-5 h-5" />,
  awards_voting: <Trophy className="w-5 h-5" />,
  questionnaire: <ClipboardList className="w-5 h-5" />,
  free_agent_declaration: <UserMinus className="w-5 h-5" />,
  world_series: <Trophy className="w-5 h-5" />,
  claiming_period: <UserPlus className="w-5 h-5" />,
  claim_resolution: <Target className="w-5 h-5" />,
  roster_finalization: <ListChecks className="w-5 h-5" />,
  draft_prep: <FileText className="w-5 h-5" />,
  draft: <Users className="w-5 h-5" />,
  pre_season: <Sparkles className="w-5 h-5" />,
};

// Phase colors
const PHASE_COLORS: Record<SeasonPhase, string> = {
  regular_season: 'emerald',
  postseason_sim: 'blue',
  awards_voting: 'amber',
  questionnaire: 'purple',
  free_agent_declaration: 'orange',
  world_series: 'red',
  claiming_period: 'cyan',
  claim_resolution: 'indigo',
  roster_finalization: 'green',
  draft_prep: 'yellow',
  draft: 'pink',
  pre_season: 'teal',
};

function OffSeasonContent() {
  const { user } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [seasonState, setSeasonState] = useState<SeasonState>(DEFAULT_SEASON_STATE);
  const [activeTab, setActiveTab] = useState<'overview' | 'questionnaire' | 'free-agents' | 'claims' | 'standings' | 'winter-league'>('overview');
  
  // User progress tracking
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  const [freeAgentsDeclared, setFreeAgentsDeclared] = useState<FreeAgentDeclaration[]>([]);
  const [claimsSubmitted, setClaimsSubmitted] = useState<FreeAgentClaim[]>([]);
  
  // Player search modal state
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const [playerSearchMode, setPlayerSearchMode] = useState<'declare' | 'offer'>('declare');

  useEffect(() => {
    // Load season state and user progress from the database
    const loadData = async () => {
      try {
        // Import dynamically to avoid circular dependencies
        const { getCurrentSeasonState, getQuestionnaireStatus, getUserDeclarations, getUserClaims } = await import('@/lib/supabase');
        
        // Load season state
        const state = await getCurrentSeasonState();
        if (state) {
          setSeasonState({
            id: state.id,
            season_number: state.season_number,
            phase: state.phase as SeasonPhase,
            phase_started_at: state.phase_started_at,
            phase_deadline: state.phase_deadline,
            created_at: state.created_at,
            updated_at: state.updated_at,
          });
        }
        
        // Load user progress if logged in
        if (user?.id) {
          const [questionnaireStatus, declarations, claims] = await Promise.all([
            getQuestionnaireStatus(user.id, state?.season_number || 4),
            getUserDeclarations(user.id, state?.season_number || 4),
            getUserClaims(user.id, state?.season_number || 4),
          ]);
          
          setQuestionnaireCompleted(questionnaireStatus?.completed || false);
          setFreeAgentsDeclared(declarations || []);
          setClaimsSubmitted(claims || []);
        }
      } catch (err) {
        console.error('Error loading offseason data:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadData();
  }, [user?.id]);

  // Calculate time remaining for current phase
  const getTimeRemaining = () => {
    if (!seasonState.phase_deadline) return null;
    const deadline = new Date(seasonState.phase_deadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    
    if (diff <= 0) return 'Deadline passed';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    }
    return `${hours}h ${minutes}m remaining`;
  };

  // Check if user is admin
  const isAdmin = user?.isAdmin || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Header */}
        <div
          className={`mb-8 transition-all duration-500 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-red-500/20 border border-amber-500/30 p-8">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30">
                  <Scroll className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <Badge variant="outline" className="border-amber-500/50 text-amber-400 mb-1">
                    Season {seasonState.season_number} Off-Season
                  </Badge>
                  <h1 className="text-3xl sm:text-4xl font-display text-white tracking-wide">
                    JKAP League Official Off-Season Plan
                  </h1>
                </div>
              </div>
              <p className="text-lg text-slate-300 max-w-2xl">
                Your guide to managing the offseason like a big-league GM. Complete all required tasks to secure your spot for next season.
              </p>
            </div>
          </div>
        </div>

        {/* Current Phase Status */}
        <div
          className={`mb-8 transition-all duration-500 delay-100 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Card className="bg-slate-800/50 border-slate-700 overflow-hidden">
            <div className="flex flex-col lg:flex-row">
              {/* Phase Info */}
              <div className="flex-1 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-${PHASE_COLORS[seasonState.phase]}-500/20`}>
                    {PHASE_ICONS[seasonState.phase]}
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Current Phase</p>
                    <h2 className="text-xl font-bold text-white">{getPhaseLabel(seasonState.phase)}</h2>
                  </div>
                </div>
                <p className="text-slate-300 mb-4">{getPhaseDescription(seasonState.phase)}</p>
                
                {/* Deadline countdown */}
                {seasonState.phase_deadline && (
                  <div className="flex items-center gap-2 text-amber-400">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">{getTimeRemaining()}</span>
                  </div>
                )}
              </div>

              {/* Phase Progress */}
              <div className="lg:w-80 p-6 bg-slate-700/30 border-t lg:border-t-0 lg:border-l border-slate-600">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Your Progress</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Questionnaire</span>
                    {questionnaireCompleted ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Free Agents Declared</span>
                    <span className="text-white font-medium">{freeAgentsDeclared.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Claims Submitted</span>
                    <span className="text-white font-medium">{claimsSubmitted.length}</span>
                  </div>
                </div>
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
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('questionnaire')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'questionnaire'
                ? 'bg-purple-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Questionnaire
            {!questionnaireCompleted && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 rounded-full">!</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('free-agents')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'free-agents'
                ? 'bg-orange-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <UserMinus className="w-4 h-4" />
            Free Agents
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'claims'
                ? 'bg-cyan-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Claims
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'standings'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Standings
          </button>
          <button
            onClick={() => setActiveTab('winter-league')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'winter-league'
                ? 'bg-blue-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Snowflake className="w-4 h-4" />
            Winter League
          </button>
        </div>

        {/* Tab Content */}
        <div
          className={`transition-all duration-500 delay-200 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Off-Season Checklist */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-amber-400" />
                      Off-Season Checklist
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Awards Voting */}
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-amber-500/20">
                            <Trophy className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <h4 className="font-medium text-white mb-1">1. MVP & Cy Young Voting</h4>
                            <p className="text-sm text-slate-400">
                              Vote for the league's Most Valuable Player and best pitcher.
                              Each team votes for 1 Hitter & 1 Pitcher.
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          <Clock className="w-3 h-3 mr-1" />
                          Upcoming
                        </Badge>
                      </div>
                    </div>

                    {/* Questionnaire */}
                    <div className={`p-4 rounded-xl ${questionnaireCompleted ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'} border`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${questionnaireCompleted ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                            <ClipboardList className={`w-5 h-5 ${questionnaireCompleted ? 'text-emerald-400' : 'text-red-400'}`} />
                          </div>
                          <div>
                            <h4 className="font-medium text-white mb-1">2. Off-Season Questionnaire</h4>
                            <p className="text-sm text-slate-400">
                              Complete within 24 hours of season ending. Confirms participation,
                              team preference, and feedback.
                            </p>
                            <p className="text-xs text-red-400 mt-2 font-medium">
                              <AlertTriangle className="w-3 h-3 inline mr-1" />
                              Failure to submit = loss of franchise spot!
                            </p>
                          </div>
                        </div>
                        {questionnaireCompleted ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Complete
                          </Badge>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setActiveTab('questionnaire')}
                            className="bg-red-500 hover:bg-red-400"
                          >
                            Complete Now
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Free Agent Declaration */}
                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-orange-500/20">
                            <UserMinus className="w-5 h-5 text-orange-400" />
                          </div>
                          <div>
                            <h4 className="font-medium text-white mb-1">3. Free Agent Declaration</h4>
                            <p className="text-sm text-slate-400">
                              Declare at least 1 player as a free agent before the World Series begins.
                              No declarations = no ability to claim players.
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setActiveTab('free-agents')}
                        >
                          Declare
                        </Button>
                      </div>
                    </div>

                    {/* Claiming Period */}
                    <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-cyan-500/20">
                            <UserPlus className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div>
                            <h4 className="font-medium text-white mb-1">4. Claiming Period</h4>
                            <p className="text-sm text-slate-400">
                              48-hour window after World Series ends. To claim a player, 
                              offer one of equal or higher value. Max 2 successful claims.
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                          <Clock className="w-3 h-3 mr-1" />
                          Not Yet
                        </Badge>
                      </div>
                    </div>

                    {/* Draft Prep */}
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-purple-500/20">
                            <FileText className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <h4 className="font-medium text-white mb-1">5. Draft Preparation</h4>
                            <p className="text-sm text-slate-400">
                              Prepare for the upcoming season draft. Draft order based on 
                              previous season standings (worst team picks first).
                            </p>
                          </div>
                        </div>
                        <Link href="/draft">
                          <Button variant="secondary" size="sm">
                            Draft Board
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Classification Guide */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-400" />
                      Player Classifications
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {CLASSIFICATION_ORDER.slice().reverse().map((classification) => (
                      <div
                        key={classification}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${CLASSIFICATION_COLORS[classification].bg} border ${CLASSIFICATION_COLORS[classification].border}`}
                      >
                        <div className={`w-3 h-3 rounded-full ${CLASSIFICATION_COLORS[classification].bg}`} />
                        <span className={`capitalize ${CLASSIFICATION_COLORS[classification].text} font-medium`}>
                          {classification}
                        </span>
                      </div>
                    ))}
                    <p className="text-xs text-slate-500 mt-3">
                      To claim a player, you must offer one of equal or higher classification.
                    </p>
                  </CardContent>
                </Card>

                {/* Claim Rules */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-400" />
                      Claiming Rules
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-slate-400">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>Equal or higher value required to claim</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>Worst record gets priority on ties</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>Max 2 successful claims per team</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>48-hour claiming window</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Links */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-purple-400" />
                      Quick Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <a
                      href={OFFSEASON_QUESTIONNAIRE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 transition-colors"
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span className="flex-1 text-sm">Questionnaire</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <Link
                      href="/draft"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 transition-colors"
                    >
                      <Users className="w-4 h-4" />
                      <span className="flex-1 text-sm">Draft Board</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                    <Link
                      href="/leaderboard"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors"
                    >
                      <Trophy className="w-4 h-4" />
                      <span className="flex-1 text-sm">Leaderboard</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Questionnaire Tab */}
          {activeTab === 'questionnaire' && (
            <QuestionnaireSection
              completed={questionnaireCompleted}
              onComplete={() => setQuestionnaireCompleted(true)}
            />
          )}

          {/* Free Agents Tab */}
          {activeTab === 'free-agents' && (
            <FreeAgentSection
              declarations={freeAgentsDeclared}
              onDeclare={(declaration) => setFreeAgentsDeclared([...freeAgentsDeclared, declaration])}
              onSearchPlayer={() => {
                setPlayerSearchMode('declare');
                setShowPlayerSearch(true);
              }}
            />
          )}

          {/* Claims Tab */}
          {activeTab === 'claims' && (
            <ClaimsSection
              claims={claimsSubmitted}
              onClaim={(claim) => setClaimsSubmitted([...claimsSubmitted, claim])}
            />
          )}

          {/* Standings Tab */}
          {activeTab === 'standings' && (
            <StandingsSection />
          )}

          {/* Winter League Tab */}
          {activeTab === 'winter-league' && (
            <WinterLeagueSection />
          )}
        </div>

        {/* Player Search Modal */}
        <PlayerSearchModal
          isOpen={showPlayerSearch}
          onClose={() => setShowPlayerSearch(false)}
          onSelectPlayer={(player) => {
            if (playerSearchMode === 'declare') {
              const newDeclaration: FreeAgentDeclaration = {
                id: `fa-${Date.now()}`,
                season_number: seasonState.season_number,
                declaring_team_id: user?.teamId || 'user-team',
                declaring_user_id: user?.id || 'user-id',
                player_name: player.player_name,
                position: player.position,
                classification: player.classification,
                overall_rating: player.overall_rating,
                declared_at: new Date().toISOString(),
                is_claimed: false,
              };
              setFreeAgentsDeclared([...freeAgentsDeclared, newDeclaration]);
            }
            setShowPlayerSearch(false);
          }}
          title={playerSearchMode === 'declare' ? 'Search Player to Declare' : 'Search Player to Offer'}
        />

        {/* Commissioner Controls - Only show for admins */}
        {isAdmin && (
          <div
            className={`mt-8 transition-all duration-500 delay-300 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <Card className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-red-500/10 border-amber-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-amber-400" />
                    Commissioner Controls
                  </span>
                  <Link href="/offseason/admin">
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-400">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Full Dashboard
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link href="/offseason/admin?tab=phases">
                    <Button variant="secondary" className="justify-start w-full">
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Advance Phase
                    </Button>
                  </Link>
                  <Link href="/offseason/admin?tab=standings">
                    <Button variant="secondary" className="justify-start w-full">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Lock Standings
                    </Button>
                  </Link>
                  <Button variant="secondary" className="justify-start">
                    <Target className="w-4 h-4 mr-2" />
                    Process Claims
                  </Button>
                  <Link href="/offseason/admin?tab=members">
                    <Button variant="secondary" className="justify-start w-full">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      View Completions
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

// =============================================================================
// QUESTIONNAIRE SECTION
// =============================================================================

interface QuestionnaireSectionProps {
  completed: boolean;
  onComplete: () => void;
}

function QuestionnaireSection({ completed, onComplete }: QuestionnaireSectionProps) {
  const [showEmbed, setShowEmbed] = useState(false);

  if (completed) {
    return (
      <Card className="bg-emerald-500/10 border-emerald-500/30">
        <CardContent className="py-12 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">Questionnaire Completed!</h3>
          <p className="text-slate-400">
            Thank you for confirming your participation for next season.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <Card className="bg-red-500/10 border-red-500/30">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-red-400">Required Within 24 Hours</h4>
              <p className="text-sm text-slate-400">
                Failure to submit the questionnaire will result in loss of your reserved franchise spot for the upcoming season.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questionnaire Info */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-400" />
            Off-Season Questionnaire
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-300">
            Every owner must complete the official Off-Season Questionnaire. This form will confirm:
          </p>
          <ul className="space-y-2 text-slate-400">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Continued participation for next season
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Desired team retention or switch request
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Feedback on league settings and operations
            </li>
          </ul>

          {!showEmbed ? (
            <div className="flex gap-4 pt-4">
              <Button
                variant="primary"
                onClick={() => setShowEmbed(true)}
                className="bg-purple-500 hover:bg-purple-400"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Fill Out Questionnaire
              </Button>
              <a
                href={OFFSEASON_QUESTIONNAIRE_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
              </a>
            </div>
          ) : (
            <div className="pt-4">
              {/* Typeform Embed */}
              <div className="rounded-xl overflow-hidden border border-purple-500/30">
                <iframe
                  src={OFFSEASON_QUESTIONNAIRE_URL}
                  width="100%"
                  height="600"
                  frameBorder="0"
                  allow="camera; microphone; autoplay; encrypted-media;"
                  className="bg-slate-900"
                />
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="secondary"
                  onClick={() => setShowEmbed(false)}
                >
                  Hide Form
                </Button>
                <Button
                  variant="primary"
                  onClick={onComplete}
                  className="bg-emerald-500 hover:bg-emerald-400"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  I've Completed the Form
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// FREE AGENT SECTION
// =============================================================================

interface FreeAgentSectionProps {
  declarations: FreeAgentDeclaration[];
  onDeclare: (declaration: FreeAgentDeclaration) => void;
  onSearchPlayer?: () => void;
}

function FreeAgentSection({ declarations, onDeclare, onSearchPlayer }: FreeAgentSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [position, setPosition] = useState('');
  const [classification, setClassification] = useState<PlayerClassification>('gold');
  const [overallRating, setOverallRating] = useState(85);

  const handleSubmit = () => {
    if (!playerName || !position) return;
    
    const newDeclaration: FreeAgentDeclaration = {
      id: `fa-${Date.now()}`,
      season_number: 4,
      declaring_team_id: 'user-team', // TODO: Get from auth
      declaring_user_id: 'user-id', // TODO: Get from auth
      player_name: playerName,
      position,
      classification,
      overall_rating: overallRating,
      declared_at: new Date().toISOString(),
      is_claimed: false,
    };

    onDeclare(newDeclaration);
    setPlayerName('');
    setPosition('');
    setShowForm(false);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Info Card */}
        <Card className="bg-orange-500/10 border-orange-500/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <UserMinus className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-400 mb-1">Free Agent Declaration</h4>
                <p className="text-sm text-slate-400">
                  Every team must declare at least one player as a free agent. You can declare more if you choose, 
                  but one is the minimum. Submit your declarations BEFORE the first pitch of the World Series.
                </p>
                <p className="text-sm text-orange-300 mt-2 font-medium">
                  No declarations = no ability to claim players!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Declaration Form */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-orange-400" />
                Your Declarations ({declarations.length})
              </span>
              <div className="flex gap-2">
                {onSearchPlayer && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onSearchPlayer}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Search Database
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowForm(!showForm)}
                  className="bg-orange-500 hover:bg-orange-400"
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  {showForm ? 'Cancel' : 'Manual Entry'}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showForm && (
              <div className="p-4 rounded-xl bg-slate-700/50 border border-slate-600 mb-4 space-y-4">
                <p className="text-sm text-slate-400 mb-2">
                  Use "Search Database" above to find players from the Live Series database, or manually enter below:
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Player Name
                    </label>
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="e.g., Aaron Judge"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Position
                    </label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="">Select position...</option>
                      <option value="SP">SP - Starting Pitcher</option>
                      <option value="RP">RP - Relief Pitcher</option>
                      <option value="CP">CP - Closer</option>
                      <option value="C">C - Catcher</option>
                      <option value="1B">1B - First Base</option>
                      <option value="2B">2B - Second Base</option>
                      <option value="3B">3B - Third Base</option>
                      <option value="SS">SS - Shortstop</option>
                      <option value="LF">LF - Left Field</option>
                      <option value="CF">CF - Center Field</option>
                      <option value="RF">RF - Right Field</option>
                      <option value="DH">DH - Designated Hitter</option>
                    </select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Classification
                    </label>
                    <select
                      value={classification}
                      onChange={(e) => setClassification(e.target.value as PlayerClassification)}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    >
                      {CLASSIFICATION_ORDER.slice().reverse().map((c) => (
                        <option key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Overall Rating
                    </label>
                    <input
                      type="number"
                      value={overallRating}
                      onChange={(e) => setOverallRating(parseInt(e.target.value))}
                      min={40}
                      max={99}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!playerName || !position}
                  className="bg-orange-500 hover:bg-orange-400"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Declaration
                </Button>
              </div>
            )}

            {/* Declarations List */}
            {declarations.length > 0 ? (
              <div className="space-y-3">
                {declarations.map((dec) => (
                  <div
                    key={dec.id}
                    className={`p-4 rounded-xl border ${CLASSIFICATION_COLORS[dec.classification].bg} ${CLASSIFICATION_COLORS[dec.classification].border}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center">
                          <span className="text-xs font-mono text-slate-300">{dec.position}</span>
                        </div>
                        <div>
                          <p className="font-medium text-white">{dec.player_name}</p>
                          <p className={`text-sm capitalize ${CLASSIFICATION_COLORS[dec.classification].text}`}>
                            {dec.classification} - {dec.overall_rating} OVR
                          </p>
                        </div>
                      </div>
                      <Badge className={`${CLASSIFICATION_COLORS[dec.classification].bg} ${CLASSIFICATION_COLORS[dec.classification].text} ${CLASSIFICATION_COLORS[dec.classification].border}`}>
                        {dec.is_claimed ? 'Claimed' : 'Available'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <UserMinus className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No players declared yet</p>
                <p className="text-sm mt-1">Click "Declare Player" to add your first free agent</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Example Declaration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600 font-mono text-sm text-slate-300">
              RF - Aaron Judge - Diamond - 92
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Format: Position - Name - Classification - Rating
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Declaration Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-400">
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <span>Higher rated players attract better offers in return</span>
            </div>
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <span>Declare surplus players you're willing to move</span>
            </div>
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <span>You can declare more than the minimum 1 player</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// CLAIMS SECTION
// =============================================================================

interface ClaimsSectionProps {
  claims: FreeAgentClaim[];
  onClaim: (claim: FreeAgentClaim) => void;
}

function ClaimsSection({ claims, onClaim }: ClaimsSectionProps) {
  // Mock available free agents for demo
  const [availableFreeAgents] = useState<FreeAgentDeclaration[]>([
    {
      id: 'fa-1',
      season_number: 4,
      declaring_team_id: 'team-1',
      declaring_user_id: 'user-1',
      player_name: 'Mike Trout',
      position: 'CF',
      classification: 'diamond',
      overall_rating: 94,
      declared_at: new Date().toISOString(),
      is_claimed: false,
    },
    {
      id: 'fa-2',
      season_number: 4,
      declaring_team_id: 'team-2',
      declaring_user_id: 'user-2',
      player_name: 'Shohei Ohtani',
      position: 'SP',
      classification: 'diamond',
      overall_rating: 97,
      declared_at: new Date().toISOString(),
      is_claimed: false,
    },
    {
      id: 'fa-3',
      season_number: 4,
      declaring_team_id: 'team-3',
      declaring_user_id: 'user-3',
      player_name: 'Freddie Freeman',
      position: '1B',
      classification: 'gold',
      overall_rating: 89,
      declared_at: new Date().toISOString(),
      is_claimed: false,
    },
  ]);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Info Card */}
        <Card className="bg-cyan-500/10 border-cyan-500/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <UserPlus className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-cyan-400 mb-1">Claiming Period</h4>
                <p className="text-sm text-slate-400">
                  Browse available free agents and submit claims. Remember: to claim a player, 
                  you must offer one of <span className="text-cyan-300 font-medium">equal or higher</span> classification.
                </p>
                <p className="text-sm text-cyan-300 mt-2 font-medium">
                  Max 2 successful claims per team!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Available Free Agents */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Available Free Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableFreeAgents.map((fa) => (
                <div
                  key={fa.id}
                  className={`p-4 rounded-xl border ${CLASSIFICATION_COLORS[fa.classification].bg} ${CLASSIFICATION_COLORS[fa.classification].border}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-slate-700/50 flex flex-col items-center justify-center">
                        <span className="text-xs font-mono text-slate-300">{fa.position}</span>
                        <span className={`text-lg font-bold ${CLASSIFICATION_COLORS[fa.classification].text}`}>
                          {fa.overall_rating}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white text-lg">{fa.player_name}</p>
                        <p className={`text-sm capitalize ${CLASSIFICATION_COLORS[fa.classification].text}`}>
                          {fa.classification}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-cyan-500 hover:bg-cyan-400"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Submit Claim
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Your Claims */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-cyan-400" />
              Your Claims ({claims.length}/2)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {claims.length > 0 ? (
              <div className="space-y-3">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="p-4 rounded-xl bg-slate-700/30 border border-slate-600"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{claim.target_player_name}</p>
                        <p className="text-sm text-slate-400">
                          Offered: {claim.offered_player_name}
                        </p>
                      </div>
                      <Badge
                        className={
                          claim.status === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : claim.status === 'denied'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }
                      >
                        {claim.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No claims submitted yet</p>
                <p className="text-sm mt-1">Browse available free agents above to submit claims</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar with claiming rules */}
      <div className="space-y-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Claiming Examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-emerald-400 font-medium mb-1">Valid Claim</p>
              <p className="text-slate-400">
                Offer Diamond → Claim Diamond, Gold, Silver, Bronze, or Common
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 font-medium mb-1">Invalid Claim</p>
              <p className="text-slate-400">
                Offer Silver → Cannot claim Gold or Diamond
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Priority Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-400">
            <p>If multiple teams claim the same player:</p>
            <div className="flex items-start gap-2">
              <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>Team with <span className="text-amber-400">worst regular season record</span> gets priority</span>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              This helps maintain competitive balance in the league.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// STANDINGS SECTION
// =============================================================================

function StandingsSection() {
  // Mock standings data
  const mockStandings = [
    { rank: 1, team: 'New York Yankees', record: '98-64', pct: '.605', gb: '-', playoffs: true },
    { rank: 2, team: 'Los Angeles Dodgers', record: '95-67', pct: '.586', gb: '3.0', playoffs: true },
    { rank: 3, team: 'Atlanta Braves', record: '92-70', pct: '.568', gb: '6.0', playoffs: true },
    { rank: 4, team: 'Houston Astros', record: '90-72', pct: '.556', gb: '8.0', playoffs: true },
    { rank: 5, team: 'Philadelphia Phillies', record: '88-74', pct: '.543', gb: '10.0', playoffs: true },
    { rank: 6, team: 'Cleveland Guardians', record: '85-77', pct: '.525', gb: '13.0', playoffs: true },
    { rank: 7, team: 'San Diego Padres', record: '82-80', pct: '.506', gb: '16.0', playoffs: false },
    { rank: 8, team: 'Toronto Blue Jays', record: '80-82', pct: '.494', gb: '18.0', playoffs: false },
  ];

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Season {4} Final Standings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                    <th className="pb-3 pl-2">Rank</th>
                    <th className="pb-3">Team</th>
                    <th className="pb-3 text-center">Record</th>
                    <th className="pb-3 text-center">PCT</th>
                    <th className="pb-3 text-center">GB</th>
                    <th className="pb-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockStandings.map((team, index) => (
                    <tr
                      key={team.rank}
                      className={`border-b border-slate-700/50 ${
                        team.playoffs ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      <td className="py-3 pl-2">
                        <span className={`font-bold ${team.rank <= 3 ? 'text-amber-400' : 'text-slate-400'}`}>
                          {team.rank}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-white font-medium">{team.team}</span>
                      </td>
                      <td className="py-3 text-center text-slate-300">{team.record}</td>
                      <td className="py-3 text-center text-slate-300">{team.pct}</td>
                      <td className="py-3 text-center text-slate-400">{team.gb}</td>
                      <td className="py-3 text-center">
                        {team.playoffs ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                            <Trophy className="w-3 h-3 mr-1" />
                            Playoffs
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

      {/* Sidebar */}
      <div className="space-y-4">
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" />
              Playoff Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 mb-3">
              Top 6 teams advance to the postseason tournament.
            </p>
            <div className="space-y-2">
              {mockStandings.filter(t => t.playoffs).map((team) => (
                <div key={team.rank} className="flex items-center gap-2 text-sm">
                  <span className="text-amber-400 font-bold w-4">{team.rank}</span>
                  <span className="text-white">{team.team}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Snowflake className="w-4 h-4 text-blue-400" />
              Winter League
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">
              Teams that didn't make playoffs compete in the Winter League to stay active during the postseason.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// WINTER LEAGUE SECTION
// =============================================================================

function WinterLeagueSection() {
  // Mock winter league data
  const winterLeagueTeams = [
    { id: 'sd', team: 'San Diego Padres', owner: 'Player 7', wins: 3, losses: 1, gamesPlayed: 4 },
    { id: 'tor', team: 'Toronto Blue Jays', owner: 'Player 8', wins: 2, losses: 2, gamesPlayed: 4 },
    { id: 'sea', team: 'Seattle Mariners', owner: 'Player 9', wins: 2, losses: 2, gamesPlayed: 4 },
    { id: 'min', team: 'Minnesota Twins', owner: 'Player 10', wins: 1, losses: 3, gamesPlayed: 4 },
  ];

  const upcomingGames = [
    { game: 1, away: 'San Diego Padres', home: 'Toronto Blue Jays', scheduled: 'Feb 18 @ 8:00 PM' },
    { game: 2, away: 'Seattle Mariners', home: 'Minnesota Twins', scheduled: 'Feb 18 @ 9:30 PM' },
    { game: 3, away: 'Toronto Blue Jays', home: 'Seattle Mariners', scheduled: 'Feb 19 @ 7:00 PM' },
    { game: 4, away: 'Minnesota Twins', home: 'San Diego Padres', scheduled: 'Feb 19 @ 8:30 PM' },
  ];

  const recentResults = [
    { game: 1, winner: 'San Diego Padres', loser: 'Minnesota Twins', score: '7-3', date: 'Feb 16' },
    { game: 2, winner: 'Toronto Blue Jays', loser: 'Seattle Mariners', score: '5-4', date: 'Feb 16' },
    { game: 3, winner: 'Seattle Mariners', loser: 'Minnesota Twins', score: '8-2', date: 'Feb 15' },
    { game: 4, winner: 'San Diego Padres', loser: 'Toronto Blue Jays', score: '4-1', date: 'Feb 15' },
  ];

  return (
    <div className="space-y-6">
      {/* Winter League Header */}
      <Card className="bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-indigo-500/10 border-blue-500/30">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Snowflake className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">JKAP Winter League</h2>
              <p className="text-slate-400">
                Non-playoff teams compete to stay sharp while the postseason plays out!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Standings */}
        <div className="lg:col-span-2">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-blue-400" />
                Winter League Standings
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
                      <th className="pb-3 text-center">GP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winterLeagueTeams
                      .sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses))
                      .map((team, index) => (
                        <tr key={team.id} className="border-b border-slate-700/50">
                          <td className="py-3 pl-2">
                            <span className={`font-bold ${index === 0 ? 'text-blue-400' : 'text-slate-400'}`}>
                              {index + 1}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="text-white font-medium">{team.team}</span>
                          </td>
                          <td className="py-3 text-slate-400">{team.owner}</td>
                          <td className="py-3 text-center text-emerald-400 font-medium">{team.wins}</td>
                          <td className="py-3 text-center text-red-400 font-medium">{team.losses}</td>
                          <td className="py-3 text-center text-slate-400">{team.gamesPlayed}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card className="bg-slate-800/50 border-slate-700 mt-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-emerald-400" />
                Recent Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{result.date}</span>
                      <span className="text-emerald-400 font-medium">{result.winner}</span>
                      <span className="text-slate-500">def.</span>
                      <span className="text-slate-400">{result.loser}</span>
                    </div>
                    <Badge className="bg-slate-600/50 text-white">{result.score}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Upcoming Games */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Upcoming Games
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingGames.map((game, index) => (
                <div key={index} className="p-3 rounded-lg bg-slate-700/30">
                  <div className="text-xs text-cyan-400 mb-1">{game.scheduled}</div>
                  <div className="text-sm">
                    <span className="text-slate-400">{game.away}</span>
                    <span className="text-slate-500 mx-2">@</span>
                    <span className="text-white">{game.home}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                About Winter League
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  All non-playoff teams compete in a round-robin format
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  Games are played during the postseason period
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  Winner receives special recognition in the next draft
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  Stay sharp for next season!
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Playoff Progress */}
          <Card className="bg-emerald-500/10 border-emerald-500/30">
            <CardHeader>
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400" />
                Playoff Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 mb-3">
                While you compete in Winter League, the playoffs are in progress:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded bg-emerald-500/10">
                  <span className="text-white">World Series</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    In Progress
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">NYY vs LAD</span>
                  <span className="text-white font-medium">Series: 2-1</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

export default function OffSeasonPage() {
  return (
    <ProtectedRoute requireJkapMember>
      <OffSeasonContent />
    </ProtectedRoute>
  );
}
