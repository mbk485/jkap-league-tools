'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  ArrowDownCircle,
  Gamepad2,
  Home,
  Eye,
  Lock,
  Unlock,
} from 'lucide-react';
import { PlayerSearchModal } from '@/components/offseason/PlayerSearchModal';
import { PlayerStatsCard, PlayerStatsPopover } from '@/components/players';

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

type TabType = 'overview' | 'questionnaire' | 'free-agents' | 'claims' | 'standings' | 'winter-league';

function OffSeasonContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [isLoaded, setIsLoaded] = useState(false);
  const [seasonState, setSeasonState] = useState<SeasonState>(DEFAULT_SEASON_STATE);
  
  // Read initial tab from URL query parameter
  const getInitialTab = (): TabType => {
    const tabParam = searchParams.get('tab');
    const validTabs: TabType[] = ['overview', 'questionnaire', 'free-agents', 'claims', 'standings', 'winter-league'];
    if (tabParam && validTabs.includes(tabParam as TabType)) {
      return tabParam as TabType;
    }
    return 'overview';
  };
  
  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  
  // User progress tracking
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState(false);
  const [freeAgentsDeclared, setFreeAgentsDeclared] = useState<FreeAgentDeclaration[]>([]);
  const [claimsSubmitted, setClaimsSubmitted] = useState<FreeAgentClaim[]>([]);
  
  // Player search modal state
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  const [playerSearchMode, setPlayerSearchMode] = useState<'declare' | 'offer'>('declare');

  // Preview mode - when true, hide all admin elements to see exactly what members see
  const [previewMode, setPreviewMode] = useState(false);

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
        {/* View Mode Toggle - For admins to switch between views */}
        {isAdmin && !previewMode ? (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-slate-800/50 to-emerald-500/10 border border-slate-600">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Current Mode Indicator */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                  <Eye className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-blue-400 font-bold text-sm">MEMBER VIEW</p>
                  <p className="text-slate-400 text-xs">Seeing member page (with admin controls visible)</p>
                </div>
              </div>

              {/* View Switching */}
              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={() => setPreviewMode(true)}
                  className="bg-purple-600 hover:bg-purple-500 text-white"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview as Regular Member
                </Button>
                
                <Link href="/offseason/admin">
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white">
                    <Shield className="w-4 h-4 mr-2" />
                    Commissioner Dashboard
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
        ) : isAdmin && previewMode ? (
          /* Preview Mode Banner - Shows admin is previewing as regular member */
          <div className="mb-6 p-3 rounded-xl bg-purple-500/20 border border-purple-500/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-purple-400 font-bold text-sm">PREVIEW MODE</p>
                  <p className="text-slate-400 text-xs">Viewing exactly what regular members see (no admin controls)</p>
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={() => setPreviewMode(false)}
                variant="secondary"
                className="bg-slate-700 hover:bg-slate-600"
              >
                Exit Preview
              </Button>
            </div>
          </div>
        ) : (
          /* Regular member navigation */
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <Home className="w-4 h-4 mr-1" />
                  Home
                </Button>
              </Link>
              <Link href="/ballyard">
                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                  <Target className="w-4 h-4 mr-1" />
                  The Ballyard
                </Button>
              </Link>
            </div>
            <Link href="/ballyard">
              <Button variant="secondary" size="sm" className="bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/30 text-emerald-400">
                <Users className="w-4 h-4 mr-1" />
                My Team
              </Button>
            </Link>
          </div>
        )}

        {/* SIMPLIFIED HERO - What do I need to do RIGHT NOW? */}
        <div
          className={`mb-6 transition-all duration-500 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Big Action Card - THE MAIN THING */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600/30 via-orange-500/20 to-amber-500/30 border-2 border-orange-500/50 p-6 sm:p-8">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              {/* Status Badge */}
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-orange-500 text-white text-sm px-3 py-1">
                  🔥 ACTION REQUIRED
                </Badge>
                {seasonState.phase_deadline && (
                  <Badge className="bg-slate-800/80 text-amber-400 border-amber-500/50">
                    <Clock className="w-3 h-3 mr-1" />
                    {getTimeRemaining()}
                  </Badge>
                )}
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                Declare Your Free Agents
              </h1>
              <p className="text-slate-200 text-lg mb-6 max-w-2xl">
                Pick the players you're letting go. You MUST declare at least 1 player to participate in free agent claiming.
              </p>
              
              {/* Big Action Button */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setActiveTab('free-agents')}
                  className="flex items-center justify-center gap-3 px-8 py-4 bg-orange-500 hover:bg-orange-400 text-white text-xl font-bold rounded-xl transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105"
                >
                  <UserMinus className="w-6 h-6" />
                  DECLARE FREE AGENTS
                  <ArrowRight className="w-6 h-6" />
                </button>
                
                {freeAgentsDeclared.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">
                      {freeAgentsDeclared.length} player{freeAgentsDeclared.length !== 1 ? 's' : ''} declared
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* YOUR PROGRESS - Simple Checklist */}
        <div
          className={`mb-6 transition-all duration-500 delay-100 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Step 1: Questionnaire */}
            <div 
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-102 ${
                questionnaireCompleted 
                  ? 'bg-emerald-500/10 border-emerald-500/50' 
                  : 'bg-slate-800/50 border-slate-600 hover:border-purple-500/50'
              }`}
              onClick={() => setActiveTab('questionnaire')}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${
                  questionnaireCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                }`}>
                  {questionnaireCompleted ? '✓' : '1'}
                </div>
                <div>
                  <p className="text-sm text-slate-400">Step 1</p>
                  <p className="font-bold text-white">Questionnaire</p>
                </div>
              </div>
              {questionnaireCompleted ? (
                <p className="text-sm text-emerald-400">Done! ✅</p>
              ) : (
                <p className="text-sm text-slate-400">Confirm you're returning</p>
              )}
            </div>

            {/* Step 2: Declare */}
            <div 
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:scale-102 ${
                freeAgentsDeclared.length > 0 
                  ? 'bg-emerald-500/10 border-emerald-500/50' 
                  : 'bg-orange-500/10 border-orange-500/50 animate-pulse'
              }`}
              onClick={() => setActiveTab('free-agents')}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold ${
                  freeAgentsDeclared.length > 0 ? 'bg-emerald-500 text-white' : 'bg-orange-500 text-white'
                }`}>
                  {freeAgentsDeclared.length > 0 ? '✓' : '2'}
                </div>
                <div>
                  <p className="text-sm text-slate-400">Step 2</p>
                  <p className="font-bold text-white">Declare Players</p>
                </div>
              </div>
              {freeAgentsDeclared.length > 0 ? (
                <p className="text-sm text-emerald-400">{freeAgentsDeclared.length} declared ✅</p>
              ) : (
                <p className="text-sm text-orange-400 font-medium">⚠️ DO THIS NOW</p>
              )}
            </div>

            {/* Step 3: Claim (Coming Soon) */}
            <div 
              className="p-4 rounded-xl border-2 bg-slate-800/30 border-slate-700 opacity-60 cursor-not-allowed"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold bg-slate-700 text-slate-400">
                  3
                </div>
                <div>
                  <p className="text-sm text-slate-500">Step 3</p>
                  <p className="font-bold text-slate-400">Claim Players</p>
                </div>
              </div>
              <p className="text-sm text-slate-500">🔒 Opens after declarations close</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Simplified */}
        <div
          className={`flex flex-wrap gap-2 mb-6 p-2 bg-slate-800/50 rounded-xl border border-slate-700 transition-all duration-500 delay-150 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Home className="w-4 h-4" />
            Home
          </button>
          <button
            onClick={() => setActiveTab('free-agents')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'free-agents'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                : freeAgentsDeclared.length === 0
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50 animate-pulse'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <UserMinus className="w-4 h-4" />
            Declare Free Agents
            {freeAgentsDeclared.length === 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">!</span>
            )}
            {freeAgentsDeclared.length > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-emerald-500 text-white rounded-full">{freeAgentsDeclared.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'claims'
                ? 'bg-cyan-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Claim Players
          </button>
          <button
            onClick={() => setActiveTab('questionnaire')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'questionnaire'
                ? 'bg-purple-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Questionnaire
            {questionnaireCompleted ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <span className="ml-1 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">!</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'standings'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Standings
          </button>
        </div>

        {/* Tab Content */}
        <div
          className={`transition-all duration-500 delay-200 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {/* Overview Tab - Simplified */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* MAIN ACTION CARD - What to do RIGHT NOW */}
              <Card className="bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-2 border-orange-500/40">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-3xl">⚾</span>
                        <h2 className="text-2xl font-bold text-white">Free Agent Declarations</h2>
                      </div>
                      <p className="text-slate-300 text-lg mb-4">
                        Check your <span className="text-orange-400 font-bold">IN-GAME ROSTER</span> in MLB The Show and designate players <span className="text-orange-400 font-bold">FROM YOUR TEAM</span> for free agency.
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${freeAgentsDeclared.length > 0 ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`} />
                          <span className="text-slate-400">
                            {freeAgentsDeclared.length > 0 
                              ? `You've declared ${freeAgentsDeclared.length} player${freeAgentsDeclared.length !== 1 ? 's' : ''}`
                              : 'You need to declare at least 1 player'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('free-agents')}
                      className="flex items-center gap-3 px-6 py-4 bg-orange-500 hover:bg-orange-400 text-white text-lg font-bold rounded-xl transition-all shadow-lg hover:shadow-orange-500/30"
                    >
                      <UserMinus className="w-5 h-5" />
                      {freeAgentsDeclared.length > 0 ? 'Declare More Players' : 'Start Declaring'}
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </CardContent>
              </Card>

              {/* HOW IT WORKS - Super Simple Explainer */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-blue-400" />
                    How Free Agents Work (Simple Version)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {/* Step 1 */}
                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                      <div className="w-12 h-12 rounded-full bg-orange-500 text-white text-xl font-bold flex items-center justify-center mb-3">
                        1
                      </div>
                      <h3 className="font-bold text-orange-400 mb-2">DFA Your Players</h3>
                      <p className="text-sm text-slate-400">
                        Open MLB The Show, check your roster, and pick players <span className="text-orange-300 font-semibold">from YOUR team in the game</span>.
                      </p>
                    </div>
                    
                    {/* Step 2 */}
                    <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                      <div className="w-12 h-12 rounded-full bg-cyan-500 text-white text-xl font-bold flex items-center justify-center mb-3">
                        2
                      </div>
                      <h3 className="font-bold text-cyan-400 mb-2">Put In Claims</h3>
                      <p className="text-sm text-slate-400">
                        Claim players of equal or lesser tier from other teams' DFA list.
                      </p>
                    </div>
                    
                    {/* Step 3 */}
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="w-12 h-12 rounded-full bg-emerald-500 text-white text-xl font-bold flex items-center justify-center mb-3">
                        3
                      </div>
                      <h3 className="font-bold text-emerald-400 mb-2">Claims Process</h3>
                      <p className="text-sm text-slate-400">
                        Commissioner processes all claims. You acquire the players you claimed - think waiver wire pickups.
                      </p>
                    </div>
                  </div>
                  
                  {/* Important Rules */}
                  <div className="mt-4 space-y-3">
                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🎮</span>
                        <div>
                          <p className="font-bold text-orange-400">Check Your In-Game Roster First!</p>
                          <p className="text-sm text-slate-300">
                            Open MLB The Show → Go to your team roster → Only declare players that are <span className="font-bold text-white">actually on your team in the game</span>. Don't enter random players!
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-red-400">Must Declare to Claim:</p>
                          <p className="text-sm text-slate-300">
                            You MUST declare at least 1 player to participate in claiming. No declarations = you can't claim anyone!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab('free-agents')}
                  className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition-all text-left"
                >
                  <UserMinus className="w-8 h-8 text-orange-400 mb-2" />
                  <p className="font-bold text-white">Declare Players</p>
                  <p className="text-sm text-slate-400">DFA players from your roster</p>
                </button>
                
                <button
                  onClick={() => setActiveTab('claims')}
                  className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all text-left"
                >
                  <UserPlus className="w-8 h-8 text-cyan-400 mb-2" />
                  <p className="font-bold text-white">Claim Players</p>
                  <p className="text-sm text-slate-400">Claim off the waiver wire</p>
                </button>
                
                <button
                  onClick={() => setActiveTab('questionnaire')}
                  className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-all text-left"
                >
                  <ClipboardList className="w-8 h-8 text-purple-400 mb-2" />
                  <p className="font-bold text-white">Questionnaire</p>
                  <p className="text-sm text-slate-400">
                    {questionnaireCompleted ? '✅ Completed' : 'Confirm participation'}
                  </p>
                </button>
                
                <button
                  onClick={() => setActiveTab('standings')}
                  className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all text-left"
                >
                  <BarChart3 className="w-8 h-8 text-emerald-400 mb-2" />
                  <p className="font-bold text-white">Standings</p>
                  <p className="text-sm text-slate-400">View league rankings</p>
                </button>
              </div>

              {/* Player Classification Guide - Collapsed by default */}
              <details className="group">
                <summary className="flex items-center justify-between p-4 bg-slate-800/50 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-800 transition-all">
                  <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-blue-400" />
                    <span className="font-medium text-white">Player Classifications & Rules</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="mt-2 p-4 bg-slate-800/30 border border-slate-700 rounded-xl">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-white mb-3">Player Tiers (Best to Lowest)</h4>
                      <div className="space-y-2">
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
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-white mb-3">Claiming Rules</h4>
                      <div className="space-y-2 text-sm text-slate-400">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>To claim a player, offer one of equal or higher tier</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>Teams with worse records get priority</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>Maximum 2 successful claims per team</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>48-hour window to make claims</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
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
              seasonNumber={seasonState.season_number}
              userId={user?.id}
              userTeamId={user?.teamId}
              userTeamName={user?.teamName}
              userName={user?.displayName || user?.email}
            />
          )}

          {/* Claims Tab */}
          {activeTab === 'claims' && (
            <ClaimsSection
              claims={claimsSubmitted}
              onClaim={(claim) => setClaimsSubmitted([...claimsSubmitted, claim])}
              currentUser={user && user.teamId ? { id: user.id, team_id: user.teamId, display_name: user.displayName || user.teamName || '' } : null}
            />
          )}

          {/* Standings Tab */}
          {activeTab === 'standings' && (
            <StandingsSection seasonNumber={seasonState.season_number} />
          )}

          {/* Winter League Tab */}
          {activeTab === 'winter-league' && (
            <WinterLeagueSection />
          )}
        </div>

        {/* Player Search Modal - Now handled within FreeAgentSection for proper confirmation flow */}

        {/* Commissioner Controls - Only show for admins and NOT in preview mode */}
        {isAdmin && !previewMode && (
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
  seasonNumber: number;
  userId?: string;
  userTeamId?: string;
  userTeamName?: string;
  userName?: string;
}

function FreeAgentSection({ 
  declarations, 
  onDeclare, 
  seasonNumber,
  userId,
  userTeamId,
  userTeamName,
  userName,
}: FreeAgentSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [position, setPosition] = useState('');
  const [classification, setClassification] = useState<PlayerClassification>('gold');
  const [overallRating, setOverallRating] = useState(85);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // Player search modal (managed here for proper confirmation flow)
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);
  
  // Confirmation modal state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingDeclaration, setPendingDeclaration] = useState<any>(null);
  
  // Master free agent list
  const [masterList, setMasterList] = useState<FreeAgentDeclaration[]>([]);
  const [loadingMasterList, setLoadingMasterList] = useState(true);
  const [activeView, setActiveView] = useState<'your' | 'all'>('your');

  // Load master free agent list
  useEffect(() => {
    const loadMasterList = async () => {
      setLoadingMasterList(true);
      try {
        const { getMasterFreeAgentList } = await import('@/lib/supabase');
        const list = await getMasterFreeAgentList(seasonNumber);
        setMasterList(list as FreeAgentDeclaration[]);
      } catch (err) {
        console.error('Failed to load master list:', err);
      } finally {
        setLoadingMasterList(false);
      }
    };
    loadMasterList();
  }, [seasonNumber]);

  const handleSubmitRequest = (player: any) => {
    // Check for duplicate
    const isDuplicate = declarations.some(
      d => d.player_name.toLowerCase() === player.player_name.toLowerCase()
    );
    if (isDuplicate) {
      setSubmitError(`You have already declared ${player.player_name}`);
      return;
    }
    
    setPendingDeclaration(player);
    setShowConfirmation(true);
    setSubmitError(null);
  };

  const handleConfirmSubmit = async () => {
    if (!pendingDeclaration || !userId) return;
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const { submitFreeAgentDeclaration } = await import('@/lib/supabase');
      
      const result = await submitFreeAgentDeclaration({
        season_number: seasonNumber,
        declaring_team_id: userTeamId || 'unknown',
        declaring_user_id: userId,
        declaring_team_name: userTeamName,
        declaring_user_name: userName,
        player_name: pendingDeclaration.player_name,
        position: pendingDeclaration.position,
        classification: pendingDeclaration.classification,
        overall_rating: pendingDeclaration.overall_rating,
        player_uuid: pendingDeclaration.player_uuid,
        card_img: pendingDeclaration.card_img,
        team_short_name: pendingDeclaration.team_short_name,
      });
      
      if (result.success && result.declaration) {
        onDeclare(result.declaration as unknown as FreeAgentDeclaration);
        // Update master list
        setMasterList(prev => [...prev, result.declaration as unknown as FreeAgentDeclaration]);
        setShowConfirmation(false);
        setPendingDeclaration(null);
        setPlayerName('');
        setPosition('');
        setShowForm(false);
      } else {
        setSubmitError(result.error || 'Failed to submit declaration');
      }
    } catch (err: any) {
      console.error('Declaration error:', err);
      setSubmitError(err.message || 'Failed to submit declaration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = () => {
    if (!playerName || !position) return;
    
    handleSubmitRequest({
      player_name: playerName,
      position,
      classification,
      overall_rating: overallRating,
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Important Notice */}
      <Card className="bg-red-500/10 border-red-500/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-400 mb-1">Important: Declarations Are Final</h4>
              <p className="text-sm text-slate-300">
                Once you submit a free agent declaration, it is <span className="text-red-400 font-bold">permanently locked</span> and 
                cannot be removed or changed. Make sure you want to declare this player before confirming.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works - Step by Step */}
      <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-500/30">
        <CardContent className="py-5">
          <h4 className="font-bold text-orange-400 text-lg mb-4 flex items-center gap-2">
            <UserMinus className="w-5 h-5" />
            How Free Agent Declaration Works
          </h4>
          
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-2xl mb-1">1️⃣</div>
              <h5 className="font-medium text-white mb-1">Declare a Player</h5>
              <p className="text-xs text-slate-400">Search for the player you want to release and submit them as a free agent.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-2xl mb-1">2️⃣</div>
              <h5 className="font-medium text-white mb-1">They Hit the Market</h5>
              <p className="text-xs text-slate-400">Your declared player becomes available for other teams to claim.</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="text-2xl mb-1">3️⃣</div>
              <h5 className="font-medium text-white mb-1">Claiming Opens</h5>
              <p className="text-xs text-slate-400">Once everyone declares, the 48-hour claiming window begins!</p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-orange-500/20 border border-orange-500/30">
            <p className="text-sm text-orange-300">
              <span className="font-bold">⚠️ REQUIRED:</span> Every team must declare <span className="font-bold">at least 1 player</span>. 
              No declaration = No claiming. If you don't declare anyone, you can't claim players from other teams!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        <button
          onClick={() => setActiveView('your')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeView === 'your' 
              ? 'bg-orange-500/20 text-orange-400 border-b-2 border-orange-400' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Your Declarations ({declarations.length})
        </button>
        <button
          onClick={() => setActiveView('all')}
          className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
            activeView === 'all' 
              ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All Declared Free Agents ({masterList.length})
        </button>
      </div>

      {/* Your Declarations View */}
      {activeView === 'your' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Declaration Form */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <UserMinus className="w-5 h-5 text-orange-400" />
                    Declare a Free Agent
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowPlayerSearch(true)}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Search Database
                    </Button>
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
                {submitError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {submitError}
                  </div>
                )}
                
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
                      onClick={handleManualSubmit}
                      disabled={!playerName || !position}
                      className="bg-orange-500 hover:bg-orange-400"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit Declaration
                    </Button>
                  </div>
                )}

                {/* Your Declarations List */}
                {declarations.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Your Submitted Declarations
                    </h4>
                    {declarations.map((dec) => (
                      <div key={dec.id} className="relative">
                        <div
                          className={`p-4 rounded-xl border ${CLASSIFICATION_COLORS[dec.classification].bg} ${CLASSIFICATION_COLORS[dec.classification].border}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {dec.card_img && (
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-700/50">
                                  <img src={dec.card_img} alt={dec.player_name} className="w-full h-full object-cover" />
                                </div>
                              )}
                              {!dec.card_img && (
                                <div className="w-12 h-12 rounded-lg bg-slate-700/50 flex items-center justify-center">
                                  <span className="text-xs font-mono text-slate-300">{dec.position}</span>
                                </div>
                              )}
                              <div>
                                <PlayerStatsPopover playerName={dec.player_name} playerUUID={dec.player_uuid} position={dec.position}>
                                  <span className="font-medium text-white hover:text-cyan-400 cursor-pointer underline decoration-dotted underline-offset-2">
                                    {dec.player_name}
                                  </span>
                                </PlayerStatsPopover>
                                <p className={`text-sm capitalize ${CLASSIFICATION_COLORS[dec.classification].text}`}>
                                  {dec.classification} - {dec.overall_rating} OVR
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Declared: {formatDateTime(dec.declared_at)}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                Locked
                              </Badge>
                              {dec.is_claimed && (
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                  Claimed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <UserMinus className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No players declared yet</p>
                    <p className="text-sm mt-1">Click "Search Database" to add your first free agent</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  Locking Notice
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-400 space-y-2">
                <p className="text-red-300">All declarations are permanent and cannot be removed once submitted.</p>
                <p>Date and time of each declaration is recorded.</p>
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
      )}

      {/* Master Free Agent List View */}
      {activeView === 'all' && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Master Free Agent List
              <Badge variant="outline" className="ml-2">{masterList.length} players</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingMasterList ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : masterList.length > 0 ? (
              <div className="space-y-3">
                {masterList.map((dec) => (
                  <div
                    key={dec.id}
                    className={`p-4 rounded-xl border ${CLASSIFICATION_COLORS[dec.classification].bg} ${CLASSIFICATION_COLORS[dec.classification].border}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {dec.card_img && (
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-700/50">
                            <img src={dec.card_img} alt={dec.player_name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        {!dec.card_img && (
                          <div className="w-14 h-14 rounded-lg bg-slate-700/50 flex flex-col items-center justify-center">
                            <span className="text-xs font-mono text-slate-300">{dec.position}</span>
                            <span className={`text-lg font-bold ${CLASSIFICATION_COLORS[dec.classification].text}`}>
                              {dec.overall_rating}
                            </span>
                          </div>
                        )}
                        <div>
                          <PlayerStatsPopover playerName={dec.player_name} playerUUID={dec.player_uuid} position={dec.position}>
                            <span className="font-medium text-white text-lg hover:text-cyan-400 cursor-pointer underline decoration-dotted underline-offset-2">
                              {dec.player_name}
                            </span>
                          </PlayerStatsPopover>
                          <p className={`text-sm capitalize ${CLASSIFICATION_COLORS[dec.classification].text}`}>
                            {dec.position} · {dec.classification} · {dec.overall_rating} OVR
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-400">
                              Declared by: <span className="text-slate-300">{dec.declaring_team_name || dec.declaring_team_id}</span>
                            </span>
                            <span className="text-xs text-slate-500">•</span>
                            <span className="text-xs text-slate-500">
                              {formatDateTime(dec.declared_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Badge className={dec.is_claimed 
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        : 'bg-green-500/20 text-green-400 border-green-500/30'
                      }>
                        {dec.is_claimed ? 'Claimed' : 'Available'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No free agents declared yet</p>
                <p className="text-sm mt-1">Be the first to declare!</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && pendingDeclaration && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                Confirm Declaration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-red-400 text-sm">
                  <strong>Warning:</strong> Once submitted, this declaration is <strong>permanently locked</strong> and cannot be removed or changed.
                </p>
              </div>
              
              <div className={`p-4 rounded-xl border ${CLASSIFICATION_COLORS[pendingDeclaration.classification as PlayerClassification].bg} ${CLASSIFICATION_COLORS[pendingDeclaration.classification as PlayerClassification].border}`}>
                <div className="flex items-center gap-3">
                  {pendingDeclaration.card_img && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-700/50">
                      <img src={pendingDeclaration.card_img} alt={pendingDeclaration.player_name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-white text-lg">{pendingDeclaration.player_name}</p>
                    <p className={`text-sm capitalize ${CLASSIFICATION_COLORS[pendingDeclaration.classification as PlayerClassification].text}`}>
                      {pendingDeclaration.position} · {pendingDeclaration.classification} · {pendingDeclaration.overall_rating} OVR
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-slate-400 text-sm">
                Are you sure you want to declare <strong className="text-white">{pendingDeclaration.player_name}</strong> as a free agent?
              </p>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowConfirmation(false);
                    setPendingDeclaration(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 bg-orange-500 hover:bg-orange-400"
                  onClick={handleConfirmSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Confirm Declaration
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Player Search Modal */}
      <PlayerSearchModal
        isOpen={showPlayerSearch}
        onClose={() => setShowPlayerSearch(false)}
        onSelectPlayer={(player) => {
          // Trigger confirmation flow instead of direct submission
          handleSubmitRequest({
            player_name: player.player_name,
            position: player.position,
            classification: player.classification,
            overall_rating: player.overall_rating,
            player_uuid: player.player_uuid,
            card_img: player.card_img,
            team_short_name: player.team_short_name,
          });
          setShowPlayerSearch(false);
        }}
        title="Search Player to Declare as Free Agent"
      />
    </div>
  );
}

// =============================================================================
// CLAIMS SECTION
// =============================================================================

interface ClaimsSectionProps {
  claims: FreeAgentClaim[];
  onClaim: (claim: FreeAgentClaim) => void;
  currentUser: { id: string; team_id: string; display_name: string } | null;
}

type CurrentUserProp = { id: string; team_id: string; display_name: string } | null;

function ClaimsSection({ claims, onClaim, currentUser }: ClaimsSectionProps) {
  const [availableFreeAgents, setAvailableFreeAgents] = useState<FreeAgentDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingOpen, setClaimingOpen] = useState(false);
  const [claimingClosesAt, setClaimingClosesAt] = useState<string | null>(null);
  const [existingClaim, setExistingClaim] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state for 3 choices
  const [choice1, setChoice1] = useState('');
  const [choice2, setChoice2] = useState('');
  const [choice3, setChoice3] = useState('');
  const [offeredPlayer, setOfferedPlayer] = useState('');
  const [offeredClassification, setOfferedClassification] = useState('');
  const [offeredOverall, setOfferedOverall] = useState('');

  // Load claiming status and free agents
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { getAvailableFreeAgents, getLeagueSettings, getUserClaimSubmission } = await import('@/lib/supabase');
        
        const [agents, settings] = await Promise.all([
          getAvailableFreeAgents(4),
          getLeagueSettings(),
        ]);
        
        setAvailableFreeAgents(agents || []);
        setClaimingOpen(settings?.claiming_open || false);
        setClaimingClosesAt(settings?.claiming_closes_at || null);

        // Check if user already submitted a claim
        if (currentUser?.id) {
          const userClaim = await getUserClaimSubmission(currentUser.id, 4);
          setExistingClaim(userClaim);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser?.id]);

  // Handle claim submission
  const handleSubmitClaim = async () => {
    if (!currentUser || !choice1 || !offeredPlayer || !offeredClassification || !offeredOverall) {
      setSubmitMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const { submitClaimChoices } = await import('@/lib/supabase');
      
      const fa1 = availableFreeAgents.find(fa => fa.player_name === choice1);
      const fa2 = choice2 ? availableFreeAgents.find(fa => fa.player_name === choice2) : null;
      const fa3 = choice3 ? availableFreeAgents.find(fa => fa.player_name === choice3) : null;

      const result = await submitClaimChoices({
        season_number: 4,
        claiming_team_id: currentUser.team_id,
        claiming_team_name: currentUser.display_name,
        claiming_user_id: currentUser.id,
        choice_1_player: choice1,
        choice_1_classification: fa1?.classification || 'unknown',
        choice_2_player: choice2 || null,
        choice_2_classification: fa2?.classification || null,
        choice_3_player: choice3 || null,
        choice_3_classification: fa3?.classification || null,
        offered_player_name: offeredPlayer,
        offered_classification: offeredClassification.toLowerCase(),
        offered_overall: parseInt(offeredOverall),
      });

      if (result.success) {
        setSubmitMessage({ type: 'success', text: 'Claim submitted and LOCKED! The commissioner will process all claims after the deadline.' });
        // Reload to show locked state
        const { getUserClaimSubmission } = await import('@/lib/supabase');
        const userClaim = await getUserClaimSubmission(currentUser.id, 4);
        setExistingClaim(userClaim);
      } else {
        setSubmitMessage({ type: 'error', text: result.error || 'Failed to submit claim' });
      }
    } catch (err: any) {
      setSubmitMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  // Time remaining display
  const getTimeRemaining = () => {
    if (!claimingClosesAt) return null;
    const now = new Date();
    const closes = new Date(claimingClosesAt);
    const diff = closes.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    }
    return `${hours}h ${minutes}m remaining`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // CLOSED STATE
  if (!claimingOpen) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-slate-800/50 border-red-500/30">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Claiming Period CLOSED</h3>
            <p className="text-slate-400 mb-4">
              The claiming window is not currently open. Check back when the commissioner opens it.
            </p>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-lg px-4 py-2">
              CLOSED
            </Badge>
          </CardContent>
        </Card>

        {/* Still show available free agents for reference */}
        <Card className="bg-slate-800/50 border-slate-700 mt-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Available Free Agents ({availableFreeAgents.length})
            </CardTitle>
            <p className="text-sm text-slate-400">Preview - claiming not yet open</p>
          </CardHeader>
          <CardContent>
            {availableFreeAgents.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                {availableFreeAgents.map((fa) => (
                  <div key={fa.id} className={`p-3 rounded-lg border ${CLASSIFICATION_COLORS[fa.classification].bg} ${CLASSIFICATION_COLORS[fa.classification].border}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg font-bold ${CLASSIFICATION_COLORS[fa.classification].text}`}>{fa.overall_rating}</span>
                      <div>
                        <p className="font-medium text-white text-sm">{fa.player_name}</p>
                        <p className={`text-xs capitalize ${CLASSIFICATION_COLORS[fa.classification].text}`}>{fa.classification}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-slate-400">No free agents declared yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // USER ALREADY SUBMITTED (LOCKED)
  if (existingClaim) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Claim Submitted & Locked</h3>
                <p className="text-emerald-400 text-sm">
                  Submitted {new Date(existingClaim.submitted_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <h4 className="font-medium text-white mb-3">Your Claim Choices</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">1st</Badge>
                    <span className="text-white">{existingClaim.choice_1_player}</span>
                    <span className="text-slate-400 text-sm capitalize">({existingClaim.choice_1_classification})</span>
                  </div>
                  {existingClaim.choice_2_player && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">2nd</Badge>
                      <span className="text-white">{existingClaim.choice_2_player}</span>
                      <span className="text-slate-400 text-sm capitalize">({existingClaim.choice_2_classification})</span>
                    </div>
                  )}
                  {existingClaim.choice_3_player && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">3rd</Badge>
                      <span className="text-white">{existingClaim.choice_3_player}</span>
                      <span className="text-slate-400 text-sm capitalize">({existingClaim.choice_3_classification})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                <h4 className="font-medium text-white mb-2">Player You're Offering</h4>
                <p className="text-white">
                  {existingClaim.offered_player_name}
                  <span className="text-slate-400 ml-2 capitalize">
                    ({existingClaim.offered_classification} · {existingClaim.offered_overall} OVR)
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-400 text-sm">
                <Lock className="w-4 h-4 inline mr-1" />
                Your claim is locked and cannot be changed. The commissioner will process all claims after the deadline.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // OPEN - SHOW CLAIM FORM
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Status Banner */}
        <Card className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-emerald-500/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/30 flex items-center justify-center">
                  <Unlock className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-400 text-lg">Claiming Period OPEN</h4>
                  <p className="text-sm text-slate-300">Submit your claim now - once submitted, it's locked!</p>
                </div>
              </div>
              {claimingClosesAt && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-sm px-3 py-1">
                  <Clock className="w-4 h-4 mr-1 inline" />
                  {getTimeRemaining()}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Claim Form */}
        <Card className="bg-slate-800/50 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-cyan-400" />
              Submit Your Claim
            </CardTitle>
            <p className="text-sm text-slate-400">Select up to 3 players in order of preference</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {submitMessage && (
              <div className={`p-4 rounded-lg border ${submitMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                {submitMessage.text}
              </div>
            )}

            {/* Choice selections */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  1st Choice (Required) <span className="text-red-400">*</span>
                </label>
                <select
                  value={choice1}
                  onChange={(e) => setChoice1(e.target.value)}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select a player...</option>
                  {availableFreeAgents.map((fa) => (
                    <option key={fa.id} value={fa.player_name}>
                      {fa.player_name} ({fa.classification} - {fa.overall_rating} OVR)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  2nd Choice (Optional)
                </label>
                <select
                  value={choice2}
                  onChange={(e) => setChoice2(e.target.value)}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select a backup...</option>
                  {availableFreeAgents.filter(fa => fa.player_name !== choice1).map((fa) => (
                    <option key={fa.id} value={fa.player_name}>
                      {fa.player_name} ({fa.classification} - {fa.overall_rating} OVR)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  3rd Choice (Optional)
                </label>
                <select
                  value={choice3}
                  onChange={(e) => setChoice3(e.target.value)}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select another backup...</option>
                  {availableFreeAgents.filter(fa => fa.player_name !== choice1 && fa.player_name !== choice2).map((fa) => (
                    <option key={fa.id} value={fa.player_name}>
                      {fa.player_name} ({fa.classification} - {fa.overall_rating} OVR)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Offered player */}
            <div className="pt-4 border-t border-slate-700">
              <h4 className="font-medium text-white mb-4">Player You're Offering in Return</h4>
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Player Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={offeredPlayer}
                    onChange={(e) => setOfferedPlayer(e.target.value)}
                    placeholder="e.g., Aaron Judge"
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Classification <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={offeredClassification}
                    onChange={(e) => setOfferedClassification(e.target.value)}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Select...</option>
                    <option value="Diamond">Diamond</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Bronze">Bronze</option>
                    <option value="Common">Common</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Overall <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={offeredOverall}
                    onChange={(e) => setOfferedOverall(e.target.value)}
                    placeholder="e.g., 92"
                    min="1"
                    max="99"
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <p className="text-red-400 text-sm font-medium">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                WARNING: Once you submit, your claim is LOCKED and cannot be changed!
              </p>
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmitClaim}
              disabled={submitting || !choice1 || !offeredPlayer || !offeredClassification || !offeredOverall}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Submit & Lock Claim
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar with rules & available players */}
      <div className="space-y-4">
        {/* Claiming Rules */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Claiming Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <p className="text-emerald-400 font-medium mb-1">Valid Claims</p>
              <p className="text-slate-400">
                Offer Diamond → Can claim any tier<br />
                Offer Gold → Can claim Gold or lower
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-400 font-medium mb-1">Priority</p>
              <p className="text-slate-400">
                Worst record gets first pick if multiple teams claim the same player
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Available FA quick list */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Available ({availableFreeAgents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableFreeAgents.map((fa) => (
                <div key={fa.id} className={`p-2 rounded-lg border text-xs ${CLASSIFICATION_COLORS[fa.classification].bg} ${CLASSIFICATION_COLORS[fa.classification].border}`}>
                  <span className={`font-bold ${CLASSIFICATION_COLORS[fa.classification].text}`}>{fa.overall_rating}</span>
                  <span className="text-white ml-2">{fa.player_name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// STANDINGS SECTION
// =============================================================================

interface StandingsData {
  rank: number;
  team: string;
  teamAbbr: string;
  record: string;
  pct: string;
  gb: string;
  playoffs: boolean;
  owner: string;
}

function StandingsSection({ seasonNumber }: { seasonNumber: number }) {
  const [standings, setStandings] = useState<StandingsData[]>([]);
  const [draftOrder, setDraftOrder] = useState<StandingsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStandings = async () => {
      try {
        const { getFinalStandings, getDraftOrder, getAllUsers } = await import('@/lib/supabase');
        const [finalStandings, draftOrderData, users] = await Promise.all([
          getFinalStandings(seasonNumber),
          getDraftOrder(seasonNumber),
          getAllUsers(),
        ]);

        if (finalStandings && finalStandings.length > 0) {
          const processedStandings = finalStandings.map((s) => {
            const owner = users.find(u => u.team_id === s.team_abbreviation);
            return {
              rank: s.overall_rank,
              team: s.team_name,
              teamAbbr: s.team_abbreviation,
              record: `${s.wins}-${s.losses}`,
              pct: s.win_percentage.toFixed(3),
              gb: s.games_back === 0 ? '-' : s.games_back.toFixed(1),
              playoffs: s.made_playoffs,
              owner: owner?.display_name || 'Unknown',
            };
          });
          setStandings(processedStandings);

          // Draft order is reverse
          const processedDraftOrder = draftOrderData.map((s, index) => {
            const owner = users.find(u => u.team_id === s.team_abbreviation);
            return {
              rank: index + 1,
              team: s.team_name,
              teamAbbr: s.team_abbreviation,
              record: `${s.wins}-${s.losses}`,
              pct: s.win_percentage.toFixed(3),
              gb: '-',
              playoffs: s.made_playoffs,
              owner: owner?.display_name || 'Unknown',
            };
          });
          setDraftOrder(processedDraftOrder);
        }
      } catch (err) {
        console.error('Error loading standings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStandings();
  }, [seasonNumber]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (standings.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">Final standings have not been posted yet.</p>
          <p className="text-slate-500 text-sm mt-2">Check back after the regular season ends.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
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
                    <th className="pb-3 text-center">Record</th>
                    <th className="pb-3 text-center">PCT</th>
                    <th className="pb-3 text-center">GB</th>
                    <th className="pb-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team) => (
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
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded bg-slate-700/50 flex items-center justify-center text-xs font-bold text-slate-300">
                            {team.teamAbbr}
                          </span>
                          <span className="text-white font-medium">{team.team}</span>
                        </div>
                      </td>
                      <td className="py-3 text-slate-300 text-sm">{team.owner}</td>
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

        {/* Draft Order */}
        {draftOrder.length > 0 && (
          <Card className="bg-purple-500/10 border-purple-500/30 mt-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-purple-400" />
                Season {seasonNumber + 1} Draft Order
              </CardTitle>
              <p className="text-slate-400 text-sm">
                Worst record picks first (inverse of final standings)
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {draftOrder.map((team, index) => (
                  <div
                    key={team.teamAbbr}
                    className={`p-3 rounded-lg border ${
                      index < 4 
                        ? 'bg-purple-500/10 border-purple-500/30' 
                        : 'bg-slate-700/30 border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-amber-500 text-black' :
                        index === 1 ? 'bg-slate-400 text-black' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-slate-600 text-white'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-white font-medium text-sm">{team.teamAbbr}</p>
                        <p className="text-slate-400 text-xs">{team.record}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
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
              {standings.filter(t => t.playoffs).map((team) => (
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
