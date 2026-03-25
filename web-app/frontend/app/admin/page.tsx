'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MLB_TEAMS } from '@/types/league';
import {
  Users,
  Shield,
  Trash2,
  Key,
  RefreshCw,
  UserX,
  CheckCircle,
  XCircle,
  Search,
  Download,
  Crown,
  Calendar,
  Edit2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Webhook,
  Settings,
  ExternalLink,
  Save,
  ToggleLeft,
  ToggleRight,
  Layers,
  Target,
  TrendingUp,
  BarChart3,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Ban,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  Gamepad2,
  MessageSquare,
  FileText,
  Send,
  Trophy,
  Star,
  Flame,
  Award,
  Ticket,
  Inbox,
  Bell,
  Megaphone,
  Plus,
} from 'lucide-react';
import { setZapierWebhookUrl, getZapierWebhookUrl } from '@/contexts/AuthContext';
import { 
  getFeatureFlags, 
  setFeatureFlags, 
  FeatureFlags, 
  FEATURE_LABELS,
  resetFeatureFlags 
} from '@/lib/feature-flags';
import {
  supabase,
  getAllUsers,
  deleteUser,
  updateUserPassword,
  resetOnboarding,
  DBUser,
  getAllScoutingReports,
  getTeamIntel,
  DBScoutingReport,
  // Member Management
  getRegistrationQueue,
  updateRegistrationRequest,
  deleteRegistrationRequest,
  DBRegistrationRequest,
  getBanList,
  addToBanList,
  removeFromBanList,
  // Retroactive IL Requests
  getPendingRetroactiveILRequests,
  approveRetroactiveILRequest,
  denyRetroactiveILRequest,
  RetroactiveILRequest,
  DBBannedPlayer,
  getTeamStatuses,
  updateTeamStatus,
  DBTeamStatus,
  TeamStatus,
  getWelcomePacket,
  saveWelcomePacket,
  DBWelcomePacket,
  createUser,
  // Activity Tracking
  getActivitySummary,
  getMemberActivity,
  DBMemberActivity,
  // Rewards & Gamification
  getLeaderboard,
  DBPlayerRewards,
  BADGES,
  // Game Stats
  getLeagueStandings,
  TeamStats,
  // League Hierarchy & Promotions
  getLeagues,
  getQualifiedForPromotion,
  getLeagueSummary,
  promoteUser,
  demoteUser,
  initializeNewMember,
  getLeagueFromApprovalCode,
  DBLeague,
  DBUserLevel,
  // Support Tickets
  getAllTickets,
  getTicketStats,
  updateTicketStatus,
  addTicketNotes,
  getTicketComments,
  addTicketComment,
  DBSupportTicket,
  DBTicketComment,
  // Notifications
  getNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  DBNotification,
  NotificationCategory,
  NotificationPriority,
} from '@/lib/supabase';

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [users, setUsers] = useState<DBUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resetPasswordModal, setResetPasswordModal] = useState<{ userId: string; username: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; username: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Zapier webhook settings
  const [zapierWebhookUrl, setZapierWebhookUrlState] = useState('');
  const [webhookSaved, setWebhookSaved] = useState(false);
  
  // Feature flags
  const [featureFlags, setFeatureFlagsState] = useState<FeatureFlags>(getFeatureFlags());
  const [flagsSaved, setFlagsSaved] = useState(false);
  
  // Member Management State
  const [registrationQueue, setRegistrationQueue] = useState<DBRegistrationRequest[]>([]);
  const [banList, setBanList] = useState<DBBannedPlayer[]>([]);
  const [teamStatuses, setTeamStatuses] = useState<DBTeamStatus[]>([]);
  const [welcomePacket, setWelcomePacket] = useState<DBWelcomePacket | null>(null);
  
  // Retroactive IL Requests State
  const [retroactiveILRequests, setRetroactiveILRequests] = useState<RetroactiveILRequest[]>([]);
  const [processingILRequest, setProcessingILRequest] = useState<string | null>(null);
  const [isLoadingMemberManagement, setIsLoadingMemberManagement] = useState(true);
  
  // Member management modals
  const [removePlayerModal, setRemovePlayerModal] = useState<{
    user: DBUser;
    action: 'remove' | 'ban';
    reason: string;
  } | null>(null);
  const [approveModal, setApproveModal] = useState<DBRegistrationRequest | null>(null);
  const [selectedStartingLeague, setSelectedStartingLeague] = useState<string>('majors'); // Default to Majors for commissioner
  const [approvalSuccess, setApprovalSuccess] = useState<{
    username: string;
    password: string;
    email: string;
    teamName: string;
    leagueName?: string;
    usedOwnPassword?: boolean;
  } | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    request: DBRegistrationRequest;
    reason: string;
  } | null>(null);
  const [editWelcomePacket, setEditWelcomePacket] = useState(false);
  const [welcomePacketForm, setWelcomePacketForm] = useState({
    title: '',
    welcome_message: '',
    rules_link: '',
    discord_link: '',
    facebook_link: '',
    schedule_link: '',
  });
  
  // Active admin tab
  const [adminTab, setAdminTab] = useState<'members' | 'queue' | 'teams' | 'banlist' | 'welcome' | 'activity' | 'rewards' | 'standings' | 'intel' | 'promotions' | 'support' | 'notifications' | 'settings'>('members');
  
  // Notifications state
  const [notifications, setNotifications] = useState<DBNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [showNewNotificationForm, setShowNewNotificationForm] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: '',
    content: '',
    category: 'announcement' as NotificationCategory,
    priority: 'normal' as NotificationPriority,
    action_url: '',
    action_label: '',
    icon: '',
  });
  
  // Support tickets state
  const [supportTickets, setSupportTickets] = useState<DBSupportTicket[]>([]);
  const [ticketStats, setTicketStats] = useState<{ total: number; open: number; inProgress: number; waiting: number; resolved: number; closed: number; byType: Record<string, number>; byPriority: Record<string, number> } | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<DBSupportTicket | null>(null);
  const [ticketComments, setTicketComments] = useState<DBTicketComment[]>([]);
  const [ticketFilter, setTicketFilter] = useState<{ status: string; type: string; priority: string }>({ status: 'all', type: 'all', priority: 'all' });
  const [ticketResolution, setTicketResolution] = useState('');
  const [adminReply, setAdminReply] = useState('');
  const [ticketActionLoading, setTicketActionLoading] = useState(false);
  
  // Activity monitoring state
  const [activitySummary, setActivitySummary] = useState<Record<string, { gamesPlayed: number; recapsCreated: number; analysisUploads: number; wins: number; losses: number; lastActive: string; winRate: number }>>({});
  const [activityPeriod, setActivityPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [minGamesRequired] = useState(3); // Minimum games per week
  
  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<DBPlayerRewards[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  
  // Standings state
  const [standings, setStandings] = useState<TeamStats[]>([]);
  const [isLoadingStandings, setIsLoadingStandings] = useState(false);
  
  // Promotions state
  const [leagues, setLeagues] = useState<DBLeague[]>([]);
  const [qualifiedUsers, setQualifiedUsers] = useState<Array<DBUserLevel & { user?: DBUser; display_name?: string; team_id?: string; current_league_name?: string }>>([]);
  const [leagueSummary, setLeagueSummary] = useState<{ leagueId: string; name: string; level: number; playerCount: number; color: string }[]>([]);
  const [isLoadingPromotions, setIsLoadingPromotions] = useState(false);
  const [promotionFilter, setPromotionFilter] = useState<string>('all');
  
  // Scouting data (harvested from user uploads)
  interface ScoutingIntel {
    uploaderWeaknesses?: string[];
    uploaderStrengths?: string[];
    opponentWeaknesses?: string[];
    opponentStrengths?: string[];
    pitchTendencies?: {
      mostUsedPitches?: string[];
      effectivePitches?: string[];
      ineffectivePitches?: string[];
      preferredLocations?: string[];
    };
    hittingTendencies?: {
      hotZones?: string[];
      coldZones?: string[];
      pitchesTheyHit?: string[];
      pitchesTheyMiss?: string[];
    };
    keyInsights?: string[];
    recommendedStrategy?: string;
  }
  interface ScoutingEntry {
    id: number;
    timestamp: string;
    uploadedBy: string;
    uploaderTeamId?: string;
    uploaderTeamName?: string;
    teamId?: string; // Legacy field
    opponentTeamId: string;
    opponentTeamName?: string;
    analysisType?: 'pitching' | 'hitting';
    imageData: string;
    aiFeedback?: string;
    userFeedback?: string;
    scoutingIntel?: ScoutingIntel;
  }
  const [scoutingData, setScoutingData] = useState<ScoutingEntry[]>([]);
  const [supabaseReports, setSupabaseReports] = useState<DBScoutingReport[]>([]);
  const [isLoadingIntel, setIsLoadingIntel] = useState(true);
  const [expandedScouting, setExpandedScouting] = useState<number | null>(null);
  const [expandedCaseFile, setExpandedCaseFile] = useState<string | null>(null);
  const [caseFileTab, setCaseFileTab] = useState<'overview' | 'reports'>('overview');

  // Protect admin route
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  // Auto-select league when approve modal opens with approval code
  useEffect(() => {
    if (approveModal) {
      // Check if approval code maps to a specific league
      if (approveModal.approval_code) {
        const mapping = getLeagueFromApprovalCode(approveModal.approval_code);
        if (mapping) {
          setSelectedStartingLeague(mapping.leagueId);
          return;
        }
      }
      // Check if target_league_id is already set
      if (approveModal.target_league_id) {
        setSelectedStartingLeague(approveModal.target_league_id);
        return;
      }
      // Default to majors
      setSelectedStartingLeague('majors');
    }
  }, [approveModal]);

  // Load Zapier webhook URL
  useEffect(() => {
    const savedUrl = getZapierWebhookUrl();
    if (savedUrl) {
      setZapierWebhookUrlState(savedUrl);
    }
  }, []);

  // Load feature flags
  useEffect(() => {
    setFeatureFlagsState(getFeatureFlags());
  }, []);
  
  // Load member management data
  useEffect(() => {
    const loadMemberManagementData = async () => {
      setIsLoadingMemberManagement(true);
      try {
        const [queue, bans, statuses, packet] = await Promise.all([
          getRegistrationQueue(),
          getBanList(),
          getTeamStatuses(),
          getWelcomePacket(),
        ]);
        setRegistrationQueue(queue);
        setBanList(bans);
        setTeamStatuses(statuses);
        setWelcomePacket(packet);
        // Load retroactive IL requests
        setRetroactiveILRequests(getPendingRetroactiveILRequests());
        if (packet) {
          setWelcomePacketForm({
            title: packet.title,
            welcome_message: packet.welcome_message ?? '',
            rules_link: packet.rules_link || '',
            discord_link: packet.discord_link || '',
            facebook_link: packet.facebook_link || '',
            schedule_link: packet.schedule_link || '',
          });
        }
      } catch (err) {
        console.error('Failed to load member management data:', err);
      }
      setIsLoadingMemberManagement(false);
    };
    loadMemberManagementData();
  }, []);
  
  // Load scouting data from localStorage AND Supabase
  useEffect(() => {
    // Load from localStorage (legacy game recap uploads)
    const data = JSON.parse(localStorage.getItem('jkap_scouting_data') || '[]');
    setScoutingData(data);
    
    // Load from Supabase (Players Academy uploads)
    const loadSupabaseReports = async () => {
      setIsLoadingIntel(true);
      try {
        const reports = await getAllScoutingReports();
        setSupabaseReports(reports);
      } catch (err) {
        console.error('Failed to load scouting reports:', err);
      }
      setIsLoadingIntel(false);
    };
    loadSupabaseReports();
  }, []);
  
  // Load activity data when period changes
  useEffect(() => {
    const loadActivityData = async () => {
      setIsLoadingActivity(true);
      try {
        const now = new Date();
        let startDate: string;
        
        if (activityPeriod === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          startDate = weekAgo.toISOString();
        } else if (activityPeriod === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          startDate = monthAgo.toISOString();
        } else {
          // All time - start from year ago
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          startDate = yearAgo.toISOString();
        }
        
        const summary = await getActivitySummary(startDate, now.toISOString());
        setActivitySummary(summary);
      } catch (err) {
        console.error('Error loading activity data:', err);
      }
      setIsLoadingActivity(false);
    };
    
    if (adminTab === 'activity') {
      loadActivityData();
    }
  }, [adminTab, activityPeriod]);
  
  // Load leaderboard data
  useEffect(() => {
    const loadLeaderboardData = async () => {
      setIsLoadingLeaderboard(true);
      try {
        const data = await getLeaderboard(30); // Top 30
        setLeaderboard(data);
      } catch (err) {
        console.error('Error loading leaderboard:', err);
      }
      setIsLoadingLeaderboard(false);
    };
    
    if (adminTab === 'rewards') {
      loadLeaderboardData();
    }
  }, [adminTab]);
  
  // Load standings data
  useEffect(() => {
    const loadStandingsData = async () => {
      setIsLoadingStandings(true);
      try {
        const data = await getLeagueStandings();
        setStandings(data);
      } catch (err) {
        console.error('Error loading standings:', err);
      }
      setIsLoadingStandings(false);
    };
    
    if (adminTab === 'standings') {
      loadStandingsData();
    }
  }, [adminTab]);
  
  // Load promotions data when tab is selected
  useEffect(() => {
    const loadPromotionsData = async () => {
      setIsLoadingPromotions(true);
      try {
        const [leaguesData, qualifiedData, summaryData] = await Promise.all([
          getLeagues(),
          getQualifiedForPromotion(),
          getLeagueSummary(),
        ]);
        
        // Enrich qualified users with user data
        const enrichedQualified = qualifiedData.map(ul => ({
          ...ul,
          user: users.find(u => u.id === ul.user_id)
        }));
        
        setLeagues(leaguesData);
        setQualifiedUsers(enrichedQualified);
        setLeagueSummary(summaryData);
      } catch (err) {
        console.error('Failed to load promotions data:', err);
      } finally {
        setIsLoadingPromotions(false);
      }
    };
    
    if (adminTab === 'promotions') {
      loadPromotionsData();
    }
  }, [adminTab, users]);
  
  // Load support tickets when tab is selected
  useEffect(() => {
    const loadSupportData = async () => {
      try {
        const [tickets, stats] = await Promise.all([
          getAllTickets(ticketFilter.status !== 'all' || ticketFilter.type !== 'all' || ticketFilter.priority !== 'all' ? ticketFilter : undefined),
          getTicketStats(),
        ]);
        setSupportTickets(tickets);
        setTicketStats(stats);
      } catch (err) {
        console.error('Failed to load support data:', err);
      }
    };
    
    if (adminTab === 'support') {
      loadSupportData();
    }
  }, [adminTab, ticketFilter]);
  
  // Load ticket comments when a ticket is selected
  useEffect(() => {
    const loadComments = async () => {
      if (selectedTicket) {
        const comments = await getTicketComments(selectedTicket.id);
        setTicketComments(comments);
      }
    };
    loadComments();
  }, [selectedTicket]);
  
  // Helper to get league summary data by ID
  const getLeagueSummaryById = (leagueId: string) => {
    return leagueSummary.find(s => s.leagueId === leagueId);
  };
  
  const getScoutingTeamName = (teamId: string) => {
    const team = MLB_TEAMS.find(t => t.id === teamId);
    return team ? team.name : teamId || 'Unknown';
  };
  
  // Build comprehensive case files for each team
  const buildCaseFiles = () => {
    const caseFiles: Record<string, {
      teamId: string;
      teamName: string;
      theirSubmissions: ScoutingEntry[]; // What this team uploaded (their perspective)
      reportsAgainstThem: ScoutingEntry[]; // When others played against this team
      aggregatedWeaknesses: string[];
      aggregatedStrengths: string[];
      pitchingTendencies: string[];
      hittingTendencies: string[];
      strategies: string[];
    }> = {};
    
    scoutingData.forEach(entry => {
      // Create case file for the team who uploaded (their own data)
      const uploaderTeamId = entry.uploaderTeamId || entry.teamId || 'unknown';
      if (!caseFiles[uploaderTeamId]) {
        caseFiles[uploaderTeamId] = {
          teamId: uploaderTeamId,
          teamName: entry.uploaderTeamName || getScoutingTeamName(uploaderTeamId),
          theirSubmissions: [],
          reportsAgainstThem: [],
          aggregatedWeaknesses: [],
          aggregatedStrengths: [],
          pitchingTendencies: [],
          hittingTendencies: [],
          strategies: [],
        };
      }
      caseFiles[uploaderTeamId].theirSubmissions.push(entry);
      
      // Add uploader's weaknesses to their case file
      if (entry.scoutingIntel?.uploaderWeaknesses) {
        caseFiles[uploaderTeamId].aggregatedWeaknesses.push(...entry.scoutingIntel.uploaderWeaknesses);
      }
      if (entry.scoutingIntel?.uploaderStrengths) {
        caseFiles[uploaderTeamId].aggregatedStrengths.push(...entry.scoutingIntel.uploaderStrengths);
      }
      
      // Create/update case file for the opponent (intelligence AGAINST them)
      const opponentTeamId = entry.opponentTeamId;
      if (opponentTeamId && opponentTeamId !== 'unknown') {
        if (!caseFiles[opponentTeamId]) {
          caseFiles[opponentTeamId] = {
            teamId: opponentTeamId,
            teamName: entry.opponentTeamName || getScoutingTeamName(opponentTeamId),
            theirSubmissions: [],
            reportsAgainstThem: [],
            aggregatedWeaknesses: [],
            aggregatedStrengths: [],
            pitchingTendencies: [],
            hittingTendencies: [],
            strategies: [],
          };
        }
        caseFiles[opponentTeamId].reportsAgainstThem.push(entry);
        
        // Add opponent's weaknesses/strengths to their case file
        if (entry.scoutingIntel?.opponentWeaknesses) {
          caseFiles[opponentTeamId].aggregatedWeaknesses.push(...entry.scoutingIntel.opponentWeaknesses);
        }
        if (entry.scoutingIntel?.opponentStrengths) {
          caseFiles[opponentTeamId].aggregatedStrengths.push(...entry.scoutingIntel.opponentStrengths);
        }
        if (entry.scoutingIntel?.pitchTendencies) {
          const pt = entry.scoutingIntel.pitchTendencies;
          if (pt.mostUsedPitches) caseFiles[opponentTeamId].pitchingTendencies.push(...pt.mostUsedPitches);
          if (pt.ineffectivePitches) caseFiles[opponentTeamId].aggregatedWeaknesses.push(...pt.ineffectivePitches.map(p => `Weak pitch: ${p}`));
        }
        if (entry.scoutingIntel?.hittingTendencies) {
          const ht = entry.scoutingIntel.hittingTendencies;
          if (ht.coldZones) caseFiles[opponentTeamId].hittingTendencies.push(...ht.coldZones.map(z => `Cold zone: ${z}`));
          if (ht.pitchesTheyMiss) caseFiles[opponentTeamId].hittingTendencies.push(...ht.pitchesTheyMiss.map(p => `Struggles with: ${p}`));
        }
        if (entry.scoutingIntel?.recommendedStrategy) {
          caseFiles[opponentTeamId].strategies.push(entry.scoutingIntel.recommendedStrategy);
        }
      }
    });
    
    // Also incorporate Supabase reports (Players Academy)
    supabaseReports.forEach(report => {
      const opponentTeamId = report.opponent_team_id;
      if (opponentTeamId) {
        if (!caseFiles[opponentTeamId]) {
          caseFiles[opponentTeamId] = {
            teamId: opponentTeamId,
            teamName: getScoutingTeamName(opponentTeamId),
            theirSubmissions: [],
            reportsAgainstThem: [],
            aggregatedWeaknesses: [],
            aggregatedStrengths: [],
            pitchingTendencies: [],
            hittingTendencies: [],
            strategies: [],
          };
        }
        
        // Add weaknesses (pitches they struggled against = opponent's strength against them)
        if (report.pitches_struggled && report.pitches_struggled.length > 0) {
          caseFiles[opponentTeamId].aggregatedStrengths.push(
            ...report.pitches_struggled.map(p => `Effective pitch: ${p}`)
          );
        }
        
        // Add strengths (pitches they hit well = opponent's weakness)
        if (report.pitches_hit_well && report.pitches_hit_well.length > 0) {
          caseFiles[opponentTeamId].aggregatedWeaknesses.push(
            ...report.pitches_hit_well.map(p => `Gets hit on: ${p}`)
          );
        }
        
        // Add tendencies
        if (report.tendencies && report.tendencies.length > 0) {
          if (report.analysis_type === 'pitching') {
            caseFiles[opponentTeamId].pitchingTendencies.push(...report.tendencies);
          } else {
            caseFiles[opponentTeamId].hittingTendencies.push(...report.tendencies);
          }
        }
        
        // Add recommendations as strategies
        if (report.recommendations && report.recommendations.length > 0) {
          caseFiles[opponentTeamId].strategies.push(...report.recommendations);
        }
      }
      
      // Also track the uploader's team weaknesses (what THEY struggled against)
      const uploaderTeamId = report.team_id;
      if (uploaderTeamId) {
        if (!caseFiles[uploaderTeamId]) {
          caseFiles[uploaderTeamId] = {
            teamId: uploaderTeamId,
            teamName: getScoutingTeamName(uploaderTeamId),
            theirSubmissions: [],
            reportsAgainstThem: [],
            aggregatedWeaknesses: [],
            aggregatedStrengths: [],
            pitchingTendencies: [],
            hittingTendencies: [],
            strategies: [],
          };
        }
        
        // The uploader's struggles are THEIR weaknesses
        if (report.pitches_struggled && report.pitches_struggled.length > 0) {
          caseFiles[uploaderTeamId].aggregatedWeaknesses.push(
            ...report.pitches_struggled.map(p => `Struggles against: ${p}`)
          );
        }
        
        // The uploader's successes are THEIR strengths
        if (report.pitches_hit_well && report.pitches_hit_well.length > 0) {
          caseFiles[uploaderTeamId].aggregatedStrengths.push(
            ...report.pitches_hit_well.map(p => `Hits well: ${p}`)
          );
        }
      }
    });
    
    // Dedupe arrays
    Object.values(caseFiles).forEach(cf => {
      cf.aggregatedWeaknesses = Array.from(new Set(cf.aggregatedWeaknesses));
      cf.aggregatedStrengths = Array.from(new Set(cf.aggregatedStrengths));
      cf.pitchingTendencies = Array.from(new Set(cf.pitchingTendencies));
      cf.hittingTendencies = Array.from(new Set(cf.hittingTendencies));
      cf.strategies = Array.from(new Set(cf.strategies));
    });
    
    return caseFiles;
  };
  
  const caseFiles = buildCaseFiles();
  
  const handleDeleteScoutingEntry = (id: number) => {
    const updated = scoutingData.filter(s => s.id !== id);
    setScoutingData(updated);
    localStorage.setItem('jkap_scouting_data', JSON.stringify(updated));
  };
  
  const handleExportScoutingData = () => {
    const exportData = scoutingData.map(s => ({
      ...s,
      imageData: '[IMAGE DATA OMITTED]', // Don't include huge base64 in export
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scouting-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setError('Failed to load users. Make sure the database is set up correctly.');
      console.error(err);
    }
    setIsLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    setActionLoading(true);
    
    const result = await deleteUser(deleteConfirm.userId);
    if (result.success) {
      setUsers(users.filter(u => u.id !== deleteConfirm.userId));
      setDeleteConfirm(null);
    } else {
      setError(result.error || 'Failed to delete user');
    }
    setActionLoading(false);
  };

  // ===== MEMBER MANAGEMENT HANDLERS =====
  
  // Handle removing/banning a player
  const handleRemovePlayer = async () => {
    if (!removePlayerModal) return;
    setActionLoading(true);
    
    const { user: targetUser, action, reason } = removePlayerModal;
    
    // Add to ban list
    const banResult = await addToBanList({
      username: targetUser.username,
      email: targetUser.email || undefined,
      phone: targetUser.phone || undefined,
      original_team_id: targetUser.team_id || undefined,
      ban_type: action === 'ban' ? 'banned' : 'removed',
      ban_reason: reason,
      banned_by: user?.username || 'admin',
      can_appeal: action === 'remove', // Removed can appeal, banned cannot
    });
    
    if (!banResult.success) {
      setError(banResult.error || 'Failed to add to ban list');
      setActionLoading(false);
      return;
    }
    
    // Delete the user
    const deleteResult = await deleteUser(targetUser.id);
    if (deleteResult.success) {
      setUsers(users.filter(u => u.id !== targetUser.id));
      setBanList(await getBanList());
      setRemovePlayerModal(null);
    } else {
      setError(deleteResult.error || 'Failed to remove user');
    }
    
    setActionLoading(false);
  };
  
  // Handle approving a registration
  const handleApproveRegistration = async () => {
    if (!approveModal) return;
    setActionLoading(true);
    
    // Use the password they set during registration, or generate one if missing
    const userPassword = approveModal.password || Math.random().toString(36).slice(-8);
    
    // Create the user
    const createResult = await createUser({
      username: approveModal.username,
      password: userPassword,
      displayName: approveModal.display_name,
      teamId: approveModal.requested_team_id,
      isAdmin: false,
      email: approveModal.email,
      phone: approveModal.phone,
      userType: 'jkap_member',
    });
    
    if (!createResult.success) {
      setError(createResult.error || 'Failed to create user');
      setActionLoading(false);
      return;
    }
    
    // Initialize user at selected league level with wallet
    if (createResult.user?.id) {
      await initializeNewMember(createResult.user.id, selectedStartingLeague);
    }
    
    // Update registration status
    await updateRegistrationRequest(approveModal.id, {
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    });
    
    // Update team status to occupied
    await updateTeamStatus(approveModal.requested_team_id, {
      status: 'occupied' as TeamStatus,
      occupied_by: createResult.user?.id,
      notes: `Assigned to ${approveModal.display_name} on ${new Date().toLocaleDateString()}`,
    });
    
    // Get team and league names for success message
    const teamName = MLB_TEAMS.find(t => t.id === approveModal.requested_team_id)?.name || approveModal.requested_team_id;
    const selectedLeague = leagues.find(l => l.id === selectedStartingLeague);
    const usedOwnPassword = !!approveModal.password;
    
    // Show success modal with credentials
    setApprovalSuccess({
      username: approveModal.username,
      password: usedOwnPassword ? '(User set their own password)' : userPassword,
      email: approveModal.email,
      teamName,
      leagueName: selectedLeague?.name || 'Majors',
      usedOwnPassword,
    });
    
    // Refresh data
    setRegistrationQueue(await getRegistrationQueue());
    setUsers(await getAllUsers());
    setTeamStatuses(await getTeamStatuses());
    setApproveModal(null);
    setActionLoading(false);
  };
  
  // Handle rejecting a registration
  const handleRejectRegistration = async () => {
    if (!rejectModal) return;
    setActionLoading(true);
    
    await updateRegistrationRequest(rejectModal.request.id, {
      status: 'rejected',
      rejection_reason: rejectModal.reason,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    });
    
    setRegistrationQueue(await getRegistrationQueue());
    setRejectModal(null);
    setActionLoading(false);
  };
  
  // Handle saving welcome packet
  const handleSaveWelcomePacket = async () => {
    setActionLoading(true);
    
    const result = await saveWelcomePacket({
      ...welcomePacketForm,
      is_active: true,
    });
    
    if (result.success) {
      setWelcomePacket(await getWelcomePacket());
      setEditWelcomePacket(false);
    } else {
      setError(result.error || 'Failed to save welcome packet');
    }
    
    setActionLoading(false);
  };
  
  // Handle reinstating a player from ban list
  const handleReinstate = async (id: string) => {
    setActionLoading(true);
    const result = await removeFromBanList(id);
    if (result.success) {
      setBanList(await getBanList());
    } else {
      setError(result.error || 'Failed to reinstate player');
    }
    setActionLoading(false);
  };
  
  // Get pending count
  const pendingRegistrations = registrationQueue.filter(r => r.status === 'pending');

  const handleResetPassword = async () => {
    if (!resetPasswordModal || !newPassword) return;
    setActionLoading(true);
    
    const result = await updateUserPassword(resetPasswordModal.userId, newPassword);
    if (result.success) {
      setResetPasswordModal(null);
      setNewPassword('');
      loadUsers(); // Refresh to show updated data
    } else {
      setError(result.error || 'Failed to reset password');
    }
    setActionLoading(false);
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Handle user promotion
  const handlePromoteUser = async (userId: string, currentLeagueId: string) => {
    setActionLoading(true);
    try {
      // Find the next league up (lower level number = higher rank)
      const currentLeague = leagues.find(l => l.id === currentLeagueId);
      if (!currentLeague) throw new Error('Current league not found');
      
      const nextLeague = leagues.find(l => l.level === currentLeague.level - 1);
      if (!nextLeague) throw new Error('No higher league available');
      
      const result = await promoteUser(userId, nextLeague.id);
      if (result.success) {
        // Reload promotions data
        const [qualifiedData, summaryData] = await Promise.all([
          getQualifiedForPromotion(),
          getLeagueSummary(),
        ]);
        const enrichedQualified = qualifiedData.map(ul => ({
          ...ul,
          user: users.find(u => u.id === ul.user_id)
        }));
        setQualifiedUsers(enrichedQualified);
        setLeagueSummary(summaryData);
      } else {
        setError(result.error || 'Failed to promote user');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to promote user');
    }
    setActionLoading(false);
  };
  
  // Handle user demotion
  const handleDemoteUser = async (userId: string, currentLeagueId: string) => {
    const reason = prompt('Enter reason for demotion (optional):') || undefined;
    if (!confirm('Are you sure you want to demote this player? This will also deduct tokens.')) return;
    
    setActionLoading(true);
    try {
      // Find the next league down (higher level number = lower rank)
      const currentLeague = leagues.find(l => l.id === currentLeagueId);
      if (!currentLeague) throw new Error('Current league not found');
      
      const nextLeague = leagues.find(l => l.level === currentLeague.level + 1);
      if (!nextLeague) throw new Error('No lower league available');
      
      const result = await demoteUser(userId, nextLeague.id, user?.id || 'admin', reason);
      if (result.success) {
        // Reload users list
        loadUsers();
      } else {
        setError(result.error || 'Failed to demote user');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to demote user');
    }
    setActionLoading(false);
  };

  const copyToClipboard = (text: string, userId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveWebhook = () => {
    setZapierWebhookUrl(zapierWebhookUrl.trim());
    setWebhookSaved(true);
    setTimeout(() => setWebhookSaved(false), 3000);
  };

  const handleToggleFeature = (key: keyof FeatureFlags) => {
    const newFlags = { ...featureFlags, [key]: !featureFlags[key] };
    setFeatureFlagsState(newFlags);
    setFeatureFlags(newFlags);
    setFlagsSaved(true);
    setTimeout(() => setFlagsSaved(false), 2000);
  };

  const handleEnableAll = () => {
    const allEnabled: FeatureFlags = {
      showDashboard: true,
      showTools: true,
      showDocuments: true,
      showFreeAgents: true,
      showStandings: true,
      showAnnouncements: true,
      showComingSoon: true,
      showQuickLinks: true,
      showInjuredList: true,
      showGameRecap: true,
      showDraftBoard: true,
      showPlayersAcademy: true,
      // Token Economy - enable all
      showTokenEconomy: true,
      showLeagueHierarchy: true,
      showRewards: true,
      showGameLogger: true,
      // MLB The Show Integration
      showPlayerDatabase: true,
      showMyTeam: true,
      showRosterUpdates: true,
      showExhibitionGames: true,
      // Off-Season Program
      showOffSeason: true,
    };
    setFeatureFlagsState(allEnabled);
    setFeatureFlags(allEnabled);
    setFlagsSaved(true);
    setTimeout(() => setFlagsSaved(false), 2000);
  };

  const handleToolsOnly = () => {
    const toolsOnly: FeatureFlags = {
      showDashboard: false,
      showTools: true,
      showDocuments: false,
      showFreeAgents: false,
      showStandings: false,
      showAnnouncements: false,
      showComingSoon: false,
      showQuickLinks: false,
      showInjuredList: true,
      showGameRecap: true,
      showDraftBoard: true,
      showPlayersAcademy: true,
      // Token Economy - keep hidden in "tools only" mode
      showTokenEconomy: false,
      showLeagueHierarchy: false,
      showRewards: false,
      showGameLogger: false,
      // MLB The Show Integration - keep hidden
      showPlayerDatabase: false,
      showMyTeam: false,
      showRosterUpdates: false,
      showExhibitionGames: false,
      // Off-Season Program - keep hidden
      showOffSeason: false,
    };
    setFeatureFlagsState(toolsOnly);
    setFeatureFlags(toolsOnly);
    setFlagsSaved(true);
    setTimeout(() => setFlagsSaved(false), 2000);
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return 'No Team';
    const team = MLB_TEAMS.find(t => t.id === teamId);
    return team ? team.name : teamId;
  };

  const getTeamAbbr = (teamId: string | null) => {
    if (!teamId) return '-';
    const team = MLB_TEAMS.find(t => t.id === teamId);
    return team ? team.abbreviation : teamId;
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    getTeamName(u.team_id).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.phone && u.phone.includes(searchQuery)) ||
    (u.league_name && u.league_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const claimedTeams = users.filter(u => u.team_id).map(u => u.team_id);
  const availableTeams = MLB_TEAMS.filter(t => !claimedTeams.includes(t.id));

  const exportToCSV = () => {
    const headers = ['Username', 'Display Name', 'Team', 'League', 'Email', 'Phone', 'Type', 'Admin', 'Created At'];
    const rows = users.map(u => [
      u.username,
      u.display_name,
      getTeamName(u.team_id),
      u.league_name || '-',
      u.email || '-',
      u.phone || '-',
      u.user_type || 'jkap_member',
      u.is_admin ? 'Yes' : 'No',
      new Date(u.created_at).toLocaleDateString(),
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jkap-members-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (authLoading || (!user?.isAdmin)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Commissioner Dashboard</h1>
              <p className="text-slate-400">Manage league members and teams</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadUsers}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={exportToCSV}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
            {error}
            <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* Admin Navigation Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 p-1 bg-slate-800/50 rounded-xl border border-slate-700">
          <button
            onClick={() => setAdminTab('members')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              adminTab === 'members' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Members
          </button>
          <button
            onClick={() => setAdminTab('queue')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              adminTab === 'queue' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Queue
            {pendingRegistrations.length > 0 && (
              <Badge variant="active" className="text-xs">{pendingRegistrations.length}</Badge>
            )}
          </button>
          <button
            onClick={() => setAdminTab('teams')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              adminTab === 'teams' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            Teams
          </button>
          <button
            onClick={() => setAdminTab('banlist')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              adminTab === 'banlist' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Ban className="w-4 h-4" />
            Ban List
            {banList.length > 0 && (
              <Badge variant="outline" className="text-xs border-red-500/50 text-red-400">{banList.length}</Badge>
            )}
          </button>
          <button
            onClick={() => setAdminTab('welcome')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              adminTab === 'welcome' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Send className="w-4 h-4" />
            Welcome
          </button>
          <button
            onClick={() => setAdminTab('activity')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              adminTab === 'activity' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Activity
          </button>
          <button
            onClick={() => setAdminTab('rewards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              adminTab === 'rewards' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Rewards
          </button>
          <button
            onClick={() => setAdminTab('standings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              adminTab === 'standings' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Standings
          </button>
          <button
            onClick={() => setAdminTab('intel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              adminTab === 'intel' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Target className="w-4 h-4" />
            Intel
          </button>
          <button
            onClick={() => setAdminTab('promotions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              adminTab === 'promotions' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Promotions
            {qualifiedUsers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-emerald-600 rounded-full">
                {qualifiedUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setAdminTab('support')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              adminTab === 'support' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Ticket className="w-4 h-4" />
            Support
            {ticketStats && ticketStats.open > 0 && (
              <Badge variant="active" className="text-xs">{ticketStats.open}</Badge>
            )}
          </button>
          <button
            onClick={() => {
              setAdminTab('notifications');
              if (notifications.length === 0) {
                setIsLoadingNotifications(true);
                getNotifications().then(n => {
                  setNotifications(n);
                  setIsLoadingNotifications(false);
                });
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              adminTab === 'notifications' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications
          </button>
          <button
            onClick={() => setAdminTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              adminTab === 'settings' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{users.length}</p>
                  <p className="text-xs text-slate-400">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{claimedTeams.length}</p>
                  <p className="text-xs text-slate-400">Teams Claimed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{availableTeams.length}</p>
                  <p className="text-xs text-slate-400">Teams Available</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{users.filter(u => u.is_admin).length}</p>
                  <p className="text-xs text-slate-400">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ======================= MEMBERS TAB ======================= */}
        {adminTab === 'members' && (
          <>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by username, name, or team..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            </div>

            {/* Members Table */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Registered Members ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                {searchQuery ? 'No members match your search' : 'No members registered yet'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Username</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Team/League</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Contact</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Password</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Joined</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((member) => (
                      <tr key={member.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">@{member.username}</span>
                            {member.is_admin && (
                              <Badge variant="system" className="text-xs">Admin</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{member.display_name}</td>
                        <td className="py-3 px-4">
                          {member.team_id ? (
                            <Badge variant="active">{getTeamAbbr(member.team_id)}</Badge>
                          ) : member.league_name ? (
                            <div>
                              <Badge variant="outline" className="border-purple-500/50 text-purple-400">Commissioner</Badge>
                              <p className="text-xs text-slate-400 mt-1">{member.league_name}</p>
                            </div>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {(member.email || member.phone) ? (
                            <div className="space-y-1">
                              {member.email && (
                                <a href={`mailto:${member.email}`} className="text-sm text-blue-400 hover:underline block truncate max-w-32">
                                  {member.email}
                                </a>
                              )}
                              {member.phone && (
                                <a href={`tel:${member.phone}`} className="text-sm text-emerald-400 hover:underline block">
                                  {member.phone}
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <code className="bg-slate-700/50 px-2 py-1 rounded text-sm text-slate-300">
                              {showPasswords[member.id] ? member.password_hash : '••••••••'}
                            </code>
                            <button
                              onClick={() => togglePasswordVisibility(member.id)}
                              className="p-1 hover:bg-slate-700 rounded transition-colors"
                              title={showPasswords[member.id] ? 'Hide password' : 'Show password'}
                            >
                              {showPasswords[member.id] ? (
                                <EyeOff className="w-4 h-4 text-slate-400" />
                              ) : (
                                <Eye className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                            <button
                              onClick={() => copyToClipboard(member.password_hash, member.id)}
                              className="p-1 hover:bg-slate-700 rounded transition-colors"
                              title="Copy password"
                            >
                              {copiedId === member.id ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-sm">
                          {new Date(member.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setResetPasswordModal({ userId: member.id, username: member.username })}
                              className="p-2 hover:bg-amber-500/20 rounded-lg transition-colors"
                              title="Reset password"
                            >
                              <Key className="w-4 h-4 text-amber-400" />
                            </button>
                            <button
                              onClick={async () => {
                                if (confirm(`Reset onboarding for @${member.username}? They will see the welcome flow again.`)) {
                                  const result = await resetOnboarding(member.id);
                                  if (result.success) {
                                    alert(`Onboarding reset for @${member.username}. They will see the welcome flow on next login.`);
                                  } else {
                                    alert(`Failed to reset onboarding: ${result.error}`);
                                  }
                                }
                              }}
                              className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                              title="Reset onboarding"
                            >
                              <RefreshCw className="w-4 h-4 text-blue-400" />
                            </button>
                            {!member.is_admin && (
                              <button
                                onClick={() => setDeleteConfirm({ userId: member.id, username: member.username })}
                                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                title="Remove user"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Teams */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Available Teams ({availableTeams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableTeams.map((team) => (
                <Badge key={team.id} variant="outline" className="text-slate-300 border-slate-600">
                  {team.name} ({team.abbreviation})
                </Badge>
              ))}
              {availableTeams.length === 0 && (
                <p className="text-slate-400">All teams have been claimed!</p>
              )}
            </div>
          </CardContent>
        </Card>
          </>
        )}

        {/* ======================= REGISTRATION QUEUE TAB ======================= */}
        {adminTab === 'queue' && (
          <>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-green-400" />
                Registration Queue
                {pendingRegistrations.length > 0 && (
                  <Badge variant="active" className="ml-2">{pendingRegistrations.length} pending</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingMemberManagement ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                </div>
              ) : registrationQueue.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No registration requests yet</p>
                  <p className="text-sm mt-1">New player applications will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {registrationQueue.map((request) => (
                    <div
                      key={request.id}
                      className={`p-4 rounded-xl border ${
                        request.status === 'pending' ? 'bg-amber-500/5 border-amber-500/30' :
                        request.status === 'approved' ? 'bg-green-500/5 border-green-500/30' :
                        'bg-red-500/5 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-white">@{request.username}</span>
                            <Badge variant={
                              request.status === 'pending' ? 'outline' :
                              request.status === 'approved' ? 'active' : 'outline'
                            } className={
                              request.status === 'rejected' ? 'border-red-500/50 text-red-400' : ''
                            }>
                              {request.status}
                            </Badge>
                          </div>
                          <p className="text-slate-300">{request.display_name}</p>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                            <div className="flex items-center gap-1 text-slate-400">
                              <Mail className="w-3 h-3" />
                              {request.email}
                            </div>
                            <div className="flex items-center gap-1 text-slate-400">
                              <Phone className="w-3 h-3" />
                              {request.phone}
                            </div>
                            <div className="flex items-center gap-1 text-slate-400">
                              <Gamepad2 className="w-3 h-3" />
                              {request.psn_id || 'No PSN'}
                            </div>
                            <div className="flex items-center gap-1 text-slate-400">
                              <MessageSquare className="w-3 h-3" />
                              {request.discord_username || 'No Discord'}
                            </div>
                          </div>
                          <div className="mt-2">
                            <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                              Wants: {getTeamName(request.requested_team_id)}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Applied: {new Date(request.created_at).toLocaleString()}
                          </p>
                          {request.rejection_reason && (
                            <p className="text-xs text-red-400 mt-1">
                              Reason: {request.rejection_reason}
                            </p>
                          )}
                        </div>
                        {request.status === 'pending' && (
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setApproveModal(request)}
                              className="bg-green-600 hover:bg-green-500"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setRejectModal({ request, reason: '' })}
                              className="text-red-400"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Retroactive IL Requests */}
          <Card className="bg-slate-800/50 border-slate-700 mt-6">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Retroactive IL Requests
                {retroactiveILRequests.length > 0 && (
                  <Badge variant="active" className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/30">
                    {retroactiveILRequests.length} pending
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {retroactiveILRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No pending retroactive IL requests</p>
                  <p className="text-xs mt-1">Requests submitted by members will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {retroactiveILRequests.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 bg-slate-700/50 rounded-xl border border-amber-500/30"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white">{request.player_name}</span>
                            <Badge variant="outline" className="border-slate-600 text-slate-300">
                              {request.player_position}
                            </Badge>
                            <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                              {request.team_name}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Injury:</strong> {request.injury_type}
                          </p>
                          <p className="text-sm text-amber-400 mt-1">
                            <strong>Requested Start Date:</strong> {new Date(request.requested_start_date).toLocaleDateString()} (Game #{request.requested_start_game})
                          </p>
                          <div className="mt-2 p-2 bg-slate-800/50 rounded-lg">
                            <p className="text-xs text-muted-foreground">
                              <strong>Reason:</strong> {request.reason}
                            </p>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            Requested by {request.requested_by_name} • {new Date(request.requested_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={async () => {
                              setProcessingILRequest(request.id);
                              const result = await approveRetroactiveILRequest(request.id, user?.id || '');
                              if (result.success) {
                                setRetroactiveILRequests(getPendingRetroactiveILRequests());
                              }
                              setProcessingILRequest(null);
                            }}
                            disabled={processingILRequest === request.id}
                            className="bg-green-600 hover:bg-green-500"
                          >
                            {processingILRequest === request.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const result = denyRetroactiveILRequest(request.id, user?.id || '', 'Request denied by commissioner');
                              if (result.success) {
                                setRetroactiveILRequests(getPendingRetroactiveILRequests());
                              }
                            }}
                            disabled={processingILRequest === request.id}
                            className="text-red-400"
                          >
                            <XCircle className="w-4 h-4" />
                            Deny
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </>
        )}

        {/* ======================= TEAMS STATUS TAB ======================= */}
        {adminTab === 'teams' && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-blue-400" />
                Team Status Board
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {MLB_TEAMS.map((team) => {
                  const claimedBy = users.find(u => u.team_id === team.id);
                  const status: TeamStatus = claimedBy ? 'occupied' : 'open';
                  
                  return (
                    <div
                      key={team.id}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        status === 'occupied' ? 'bg-blue-500/10 border-blue-500/30' :
                        'bg-green-500/10 border-green-500/30 hover:border-green-500/50'
                      }`}
                    >
                      <p className="font-bold text-white">{team.abbreviation}</p>
                      <p className="text-xs text-slate-400 truncate">{team.name}</p>
                      <Badge
                        variant="outline"
                        className={`mt-2 text-xs ${
                          status === 'occupied' ? 'border-blue-500/50 text-blue-400' :
                          'border-green-500/50 text-green-400'
                        }`}
                      >
                        {status === 'occupied' ? 'Occupied' : 'Open'}
                      </Badge>
                      {claimedBy && (
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          @{claimedBy.username}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ======================= BAN LIST TAB ======================= */}
        {adminTab === 'banlist' && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-400" />
                Ban List
                {banList.length > 0 && (
                  <Badge variant="outline" className="ml-2 border-red-500/50 text-red-400">
                    {banList.length} entries
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {banList.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Ban className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No banned players</p>
                  <p className="text-sm mt-1">Players removed or banned will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {banList.map((ban) => (
                    <div
                      key={ban.id}
                      className={`p-4 rounded-xl border ${
                        ban.ban_type === 'banned' ? 'bg-red-500/10 border-red-500/30' :
                        'bg-amber-500/10 border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-white">@{ban.username}</span>
                            <Badge variant="outline" className={
                              ban.ban_type === 'banned' ? 'border-red-500/50 text-red-400' :
                              'border-amber-500/50 text-amber-400'
                            }>
                              {ban.ban_type === 'banned' ? '🚫 BANNED' : '⚠️ REMOVED'}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-300 mb-2">{ban.ban_reason}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                            {ban.email && <span>📧 {ban.email}</span>}
                            {ban.phone && <span>📱 {ban.phone}</span>}
                            {ban.original_team_id && <span>🎮 {getTeamName(ban.original_team_id)}</span>}
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            Banned by {ban.banned_by} on {new Date(ban.banned_at).toLocaleDateString()}
                          </p>
                        </div>
                        {ban.can_appeal && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleReinstate(ban.id)}
                            disabled={actionLoading}
                          >
                            Reinstate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ======================= WELCOME PACKET TAB ======================= */}
        {adminTab === 'welcome' && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-400" />
                  Welcome Packet
                </CardTitle>
                <Button
                  variant={editWelcomePacket ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setEditWelcomePacket(!editWelcomePacket)}
                >
                  {editWelcomePacket ? 'Cancel' : 'Edit'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Info banner */}
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-400">
                  <strong>💡 About the Welcome Packet:</strong> This template is shown to new members during onboarding. 
                  The "Copy Welcome Message" button in the approval modal generates a personalized message with login credentials.
                </p>
              </div>

              {editWelcomePacket ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Title</label>
                    <input
                      type="text"
                      value={welcomePacketForm.title}
                      onChange={(e) => setWelcomePacketForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                      placeholder="Welcome to JKAP Memorial League!"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Welcome Message (shown in onboarding)</label>
                    <textarea
                      value={welcomePacketForm.welcome_message}
                      onChange={(e) => setWelcomePacketForm(prev => ({ ...prev, welcome_message: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white h-64 font-mono text-sm"
                      placeholder="Use {{name}} and {{team}} as placeholders..."
                    />
                    <div className="flex items-center gap-4 mt-2">
                      <p className="text-xs text-slate-500">
                        <strong>Variables:</strong> {'{{name}}'} = Player name, {'{{team}}'} = Team name
                      </p>
                      <p className="text-xs text-slate-500">
                        <strong>Tip:</strong> Use emojis and line breaks for better readability
                      </p>
                    </div>
                  </div>
                  
                  {/* Preview Section */}
                  <div className="p-4 bg-slate-900/50 border border-slate-600 rounded-lg">
                    <p className="text-xs text-slate-400 mb-2 font-medium">📋 PREVIEW (Sample Data)</p>
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg max-h-48 overflow-y-auto">
                      <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">
                        {welcomePacketForm.welcome_message
                          .replace(/\{\{name\}\}/g, 'John Doe')
                          .replace(/\{\{team\}\}/g, 'New York Yankees')}
                      </pre>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Discord Link</label>
                      <input
                        type="url"
                        value={welcomePacketForm.discord_link}
                        onChange={(e) => setWelcomePacketForm(prev => ({ ...prev, discord_link: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                        placeholder="https://discord.gg/..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Facebook Link</label>
                      <input
                        type="url"
                        value={welcomePacketForm.facebook_link}
                        onChange={(e) => setWelcomePacketForm(prev => ({ ...prev, facebook_link: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                        placeholder="https://facebook.com/groups/..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Rules Link</label>
                      <input
                        type="url"
                        value={welcomePacketForm.rules_link}
                        onChange={(e) => setWelcomePacketForm(prev => ({ ...prev, rules_link: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Schedule Link</label>
                      <input
                        type="url"
                        value={welcomePacketForm.schedule_link}
                        onChange={(e) => setWelcomePacketForm(prev => ({ ...prev, schedule_link: e.target.value }))}
                        className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleSaveWelcomePacket}
                    disabled={actionLoading || !welcomePacketForm.title}
                    className="w-full"
                  >
                    {actionLoading ? 'Saving...' : 'Save Welcome Packet'}
                  </Button>
                </div>
              ) : welcomePacket ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <h3 className="font-bold text-emerald-400 mb-2">{welcomePacket.title}</h3>
                    <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans max-h-64 overflow-y-auto">
                      {welcomePacket.welcome_message}
                    </pre>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {welcomePacket.discord_link && (
                      <a href={welcomePacket.discord_link} target="_blank" rel="noopener noreferrer" 
                         className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg text-blue-400 hover:bg-slate-700">
                        <MessageSquare className="w-4 h-4" /> Discord
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </a>
                    )}
                    {welcomePacket.facebook_link && (
                      <a href={welcomePacket.facebook_link} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg text-blue-400 hover:bg-slate-700">
                        <Users className="w-4 h-4" /> Facebook
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </a>
                    )}
                    {welcomePacket.rules_link && (
                      <a href={welcomePacket.rules_link} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg text-blue-400 hover:bg-slate-700">
                        <FileText className="w-4 h-4" /> Rules
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </a>
                    )}
                    {welcomePacket.schedule_link && (
                      <a href={welcomePacket.schedule_link} target="_blank" rel="noopener noreferrer"
                         className="flex items-center gap-2 p-3 bg-slate-700/50 rounded-lg text-blue-400 hover:bg-slate-700">
                        <Calendar className="w-4 h-4" /> Schedule
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 text-center">
                    Links above will be included in the welcome message sent to new members
                  </p>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Send className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No welcome packet configured</p>
                  <p className="text-sm mt-1">Click Edit to create one</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ======================= PROMOTIONS TAB ======================= */}
        {adminTab === 'promotions' && (
          <>
            {/* League Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {leagues.sort((a, b) => a.level - b.level).map(league => {
                const summary = getLeagueSummaryById(league.id);
                const qualifiedInLeague = qualifiedUsers.filter(u => u.current_league_id === league.id).length;
                return (
                  <Card key={league.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4 text-center">
                      <div 
                        className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
                        style={{ backgroundColor: league.color + '20' }}
                      >
                        <Trophy className="w-5 h-5" style={{ color: league.color }} />
                      </div>
                      <h3 className="font-semibold text-white">{league.name}</h3>
                      <p className="text-xs text-slate-400">Level {league.level}</p>
                      <div className="mt-2 text-sm">
                        <span className="text-slate-300">
                          {summary?.playerCount || 0} players
                        </span>
                        {qualifiedInLeague > 0 && (
                          <Badge variant="default" className="ml-2 bg-emerald-600 text-xs">
                            {qualifiedInLeague} ready
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Qualified for Promotion */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    Qualified for Promotion
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <select
                      value={promotionFilter}
                      onChange={(e) => setPromotionFilter(e.target.value)}
                      className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white"
                    >
                      <option value="all">All Leagues</option>
                      {leagues.sort((a, b) => a.level - b.level).map(league => (
                        <option key={league.id} value={league.id}>{league.name}</option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setIsLoadingPromotions(true);
                        const [qualifiedData, summaryData] = await Promise.all([
                          getQualifiedForPromotion(),
                          getLeagueSummary(),
                        ]);
                        const enrichedQualified = qualifiedData.map(ul => ({
                          ...ul,
                          user: users.find(u => u.id === ul.user_id)
                        }));
                        setQualifiedUsers(enrichedQualified);
                        setLeagueSummary(summaryData);
                        setIsLoadingPromotions(false);
                      }}
                      className="border-slate-600"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingPromotions ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingPromotions ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-400 mb-2" />
                    <p className="text-slate-400">Loading promotion data...</p>
                  </div>
                ) : qualifiedUsers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No players currently qualified for promotion</p>
                    <p className="text-sm mt-1">Players must meet all qualification metrics to appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {qualifiedUsers
                      .filter(ul => promotionFilter === 'all' || ul.current_league_id === promotionFilter)
                      .map(userLevel => {
                        const currentLeague = leagues.find(l => l.id === userLevel.current_league_id);
                        const nextLeague = leagues.find(l => l.level === (currentLeague?.level || 5) - 1);
                        const user = userLevel.user;
                        const teamId = userLevel.team_id || user?.team_id;
                        const team = teamId ? MLB_TEAMS.find(t => t.id === teamId) : null;
                        
                        return (
                          <div 
                            key={userLevel.id} 
                            className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                          >
                            <div className="flex items-center gap-4">
                              <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
                                style={{ 
                                  backgroundColor: currentLeague?.color + '20',
                                  color: currentLeague?.color 
                                }}
                              >
                                {currentLeague?.level || '?'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-white">
                                    {userLevel.display_name || user?.username || 'Unknown User'}
                                  </span>
                                  {team && (
                                    <Badge variant="outline" className="text-xs border-slate-500 text-slate-300">
                                      {team.name}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                  <span style={{ color: currentLeague?.color }}>
                                    {userLevel.current_league_name || currentLeague?.name}
                                  </span>
                                  <span>→</span>
                                  <span className="text-emerald-400 font-medium">
                                    {nextLeague?.name || 'Majors'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                  <span>{userLevel.games_at_current_level} games</span>
                                  <span>{Math.round((userLevel.wins_at_current_level / Math.max(userLevel.games_at_current_level, 1)) * 100)}% win rate</span>
                                  <span>{Math.round(userLevel.qualification_percent)}% qualified</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="bg-emerald-600">
                                {Math.round(userLevel.qualification_percent)}% Qualified
                              </Badge>
                              {nextLeague && (
                                <Button
                                  size="sm"
                                  onClick={() => handlePromoteUser(userLevel.user_id, userLevel.current_league_id)}
                                  disabled={actionLoading}
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                  <TrendingUp className="w-4 h-4 mr-1" />
                                  Promote
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Players by League */}
            <Card className="bg-slate-800/50 border-slate-700 mt-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" />
                  All Players by League Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {leagues.sort((a, b) => a.level - b.level).map(league => {
                    const summary = getLeagueSummaryById(league.id);
                    
                    return (
                      <div key={league.id}>
                        <div className="flex items-center gap-2 mb-3">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: league.color }}
                          />
                          <h4 className="font-semibold text-white">{league.name}</h4>
                          <span className="text-sm text-slate-400">
                            ({summary?.playerCount || 0} players)
                          </span>
                          {league.manager_name && (
                            <Badge variant="outline" className="text-xs border-slate-500 text-slate-300">
                              Director: {league.manager_name}
                            </Badge>
                          )}
                        </div>
                        {(summary?.playerCount || 0) === 0 ? (
                          <p className="text-sm text-slate-500 ml-5">No players in this league yet</p>
                        ) : (
                          <div className="ml-5">
                            <p className="text-sm text-slate-400">
                              {summary?.playerCount} active players • Monthly salary: {league.monthly_salary} tokens
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Perks: {league.perks?.join(', ') || 'None'}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ======================= SUPPORT TICKETS TAB ======================= */}
        {adminTab === 'support' && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-white">{ticketStats?.total || 0}</p>
                  <p className="text-xs text-slate-400">Total</p>
                </CardContent>
              </Card>
              <Card className="bg-emerald-500/10 border-emerald-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{ticketStats?.open || 0}</p>
                  <p className="text-xs text-emerald-400/70">Open</p>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 border-blue-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-blue-400">{ticketStats?.inProgress || 0}</p>
                  <p className="text-xs text-blue-400/70">In Progress</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-400">{ticketStats?.waiting || 0}</p>
                  <p className="text-xs text-amber-400/70">Waiting</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-500/10 border-purple-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-purple-400">{ticketStats?.resolved || 0}</p>
                  <p className="text-xs text-purple-400/70">Resolved</p>
                </CardContent>
              </Card>
              <Card className="bg-slate-500/10 border-slate-500/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-400">{ticketStats?.closed || 0}</p>
                  <p className="text-xs text-slate-400/70">Closed</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
              <select
                value={ticketFilter.status}
                onChange={(e) => setTicketFilter({ ...ticketFilter, status: e.target.value })}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="waiting">Waiting</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={ticketFilter.type}
                onChange={(e) => setTicketFilter({ ...ticketFilter, type: e.target.value })}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="question">Question</option>
                <option value="account">Account Issue</option>
                <option value="other">Other</option>
              </select>
              <select
                value={ticketFilter.priority}
                onChange={(e) => setTicketFilter({ ...ticketFilter, priority: e.target.value })}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Ticket List or Detail View */}
            {selectedTicket ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <button
                      onClick={() => { setSelectedTicket(null); setTicketResolution(''); setAdminReply(''); }}
                      className="text-sm text-slate-400 hover:text-white mb-2 flex items-center gap-1"
                    >
                      ← Back to tickets
                    </button>
                    <CardTitle className="text-white">{selectedTicket.subject}</CardTitle>
                    <p className="text-sm text-slate-400 mt-1">
                      From: @{selectedTicket.username} • {new Date(selectedTicket.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedTicket.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                      selectedTicket.priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                      selectedTicket.priority === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {selectedTicket.priority.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedTicket.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' :
                      selectedTicket.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                      selectedTicket.status === 'waiting' ? 'bg-amber-500/20 text-amber-400' :
                      selectedTicket.status === 'resolved' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {selectedTicket.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Original Description */}
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Description</p>
                    <div className="p-4 bg-slate-900/50 rounded-lg text-white whitespace-pre-wrap">
                      {selectedTicket.description}
                    </div>
                  </div>

                  {/* Attachments */}
                  {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-2">Attachments</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTicket.attachments.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-slate-700 rounded-lg text-blue-400 text-sm hover:bg-slate-600">
                            Attachment {idx + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conversation Thread */}
                  <div>
                    <p className="text-xs text-slate-400 mb-2">Conversation ({ticketComments.length})</p>
                    <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                      {ticketComments.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-4">No replies yet</p>
                      ) : (
                        ticketComments.map(comment => (
                          <div
                            key={comment.id}
                            className={`p-3 rounded-lg ${comment.is_admin ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-slate-700/50'}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium text-sm ${comment.is_admin ? 'text-purple-400' : 'text-white'}`}>
                                {comment.username}
                              </span>
                              {comment.is_admin && <span className="px-1.5 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">Staff</span>}
                              <span className="text-xs text-slate-500">{new Date(comment.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-white text-sm">{comment.comment}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Admin Reply */}
                    {selectedTicket.status !== 'closed' && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={adminReply}
                          onChange={(e) => setAdminReply(e.target.value)}
                          placeholder="Type a reply..."
                          className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
                        />
                        <Button
                          variant="primary"
                          onClick={async () => {
                            if (!adminReply.trim()) return;
                            setTicketActionLoading(true);
                            await addTicketComment({
                              ticket_id: selectedTicket.id,
                              user_id: user?.id,
                              username: user?.displayName || 'Admin',
                              is_admin: true,
                              comment: adminReply,
                            });
                            // If ticket is open, set to in_progress
                            if (selectedTicket.status === 'open') {
                              await updateTicketStatus(selectedTicket.id, 'in_progress');
                            }
                            const comments = await getTicketComments(selectedTicket.id);
                            setTicketComments(comments);
                            setAdminReply('');
                            // Refresh ticket list
                            const tickets = await getAllTickets(ticketFilter);
                            setSupportTickets(tickets);
                            setTicketActionLoading(false);
                          }}
                          disabled={ticketActionLoading || !adminReply.trim()}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Status Actions */}
                  <div className="pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-400 mb-3">Update Status</p>
                    <div className="flex flex-wrap gap-2">
                      {['open', 'in_progress', 'waiting', 'resolved', 'closed'].map(status => (
                        <Button
                          key={status}
                          variant={selectedTicket.status === status ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={async () => {
                            setTicketActionLoading(true);
                            await updateTicketStatus(selectedTicket.id, status as any, user?.id, status === 'resolved' ? ticketResolution : undefined);
                            // Refresh
                            const tickets = await getAllTickets(ticketFilter);
                            const stats = await getTicketStats();
                            setSupportTickets(tickets);
                            setTicketStats(stats);
                            setSelectedTicket({ ...selectedTicket, status: status as any });
                            setTicketActionLoading(false);
                          }}
                          disabled={ticketActionLoading}
                        >
                          {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                        </Button>
                      ))}
                    </div>
                    {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
                      <div className="mt-3">
                        <input
                          type="text"
                          value={ticketResolution}
                          onChange={(e) => setTicketResolution(e.target.value)}
                          placeholder="Resolution notes (optional)..."
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-purple-400" />
                    Support Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {supportTickets.length === 0 ? (
                    <div className="text-center py-12">
                      <Inbox className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">No tickets found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {supportTickets.map(ticket => (
                        <div
                          key={ticket.id}
                          onClick={() => setSelectedTicket(ticket)}
                          className="p-4 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  ticket.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' :
                                  ticket.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                                  ticket.status === 'waiting' ? 'bg-amber-500/20 text-amber-400' :
                                  ticket.status === 'resolved' ? 'bg-purple-500/20 text-purple-400' :
                                  'bg-slate-500/20 text-slate-400'
                                }`}>
                                  {ticket.status.replace('_', ' ')}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  ticket.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                                  ticket.priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                                  'text-slate-400'
                                }`}>
                                  {ticket.priority}
                                </span>
                                <span className="text-xs text-slate-500 capitalize">{ticket.ticket_type}</span>
                              </div>
                              <h4 className="font-medium text-white truncate">{ticket.subject}</h4>
                              <p className="text-sm text-slate-400 truncate">{ticket.description}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                @{ticket.username} • {new Date(ticket.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-slate-500 text-sm">→</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* ======================= NOTIFICATIONS TAB ======================= */}
        {adminTab === 'notifications' && (
          <>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-400" />
                  Notification Management
                </CardTitle>
                <Button
                  onClick={() => setShowNewNotificationForm(!showNewNotificationForm)}
                  variant={showNewNotificationForm ? 'secondary' : 'primary'}
                  size="sm"
                  icon={showNewNotificationForm ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                >
                  {showNewNotificationForm ? 'Cancel' : 'New Notification'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* New Notification Form */}
                {showNewNotificationForm && (
                  <div className="p-4 bg-slate-700/50 rounded-xl space-y-4 border border-blue-500/30">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-blue-400" />
                      Create New Notification
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Title *</label>
                        <input
                          type="text"
                          value={newNotification.title}
                          onChange={(e) => setNewNotification(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                          placeholder="Notification title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Icon (emoji)</label>
                        <input
                          type="text"
                          value={newNotification.icon}
                          onChange={(e) => setNewNotification(prev => ({ ...prev, icon: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                          placeholder="📢"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-slate-400 mb-1">Content *</label>
                      <textarea
                        value={newNotification.content}
                        onChange={(e) => setNewNotification(prev => ({ ...prev, content: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white min-h-[100px]"
                        placeholder="Notification message..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Category</label>
                        <select
                          value={newNotification.category}
                          onChange={(e) => setNewNotification(prev => ({ ...prev, category: e.target.value as NotificationCategory }))}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        >
                          <option value="announcement">Announcement</option>
                          <option value="system">System</option>
                          <option value="update">Update</option>
                          <option value="reminder">Reminder</option>
                          <option value="welcome">Welcome</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Priority</label>
                        <select
                          value={newNotification.priority}
                          onChange={(e) => setNewNotification(prev => ({ ...prev, priority: e.target.value as NotificationPriority }))}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Action URL (optional)</label>
                        <input
                          type="url"
                          value={newNotification.action_url}
                          onChange={(e) => setNewNotification(prev => ({ ...prev, action_url: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">Action Label</label>
                        <input
                          type="text"
                          value={newNotification.action_label}
                          onChange={(e) => setNewNotification(prev => ({ ...prev, action_label: e.target.value }))}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                          placeholder="e.g., View Details, Join Now"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button
                        onClick={async () => {
                          if (!newNotification.title || !newNotification.content) {
                            alert('Please fill in title and content');
                            return;
                          }
                          const result = await createNotification({
                            ...newNotification,
                            is_active: true,
                            created_by: user?.id,
                          });
                          if (result.success && result.notification) {
                            setNotifications(prev => [result.notification!, ...prev]);
                            setShowNewNotificationForm(false);
                            setNewNotification({
                              title: '',
                              content: '',
                              category: 'announcement',
                              priority: 'normal',
                              action_url: '',
                              action_label: '',
                              icon: '',
                            });
                          } else {
                            alert('Failed to create notification: ' + (result.error || 'Unknown error'));
                          }
                        }}
                        variant="primary"
                        icon={<Send className="w-4 h-4" />}
                      >
                        Send Notification
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notifications List */}
                <div>
                  <h3 className="font-semibold text-white mb-4">Active Notifications ({notifications.length})</h3>
                  
                  {isLoadingNotifications ? (
                    <div className="flex items-center justify-center py-8 text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications yet</p>
                      <p className="text-sm mt-1">Create your first notification above</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-4 bg-slate-700/50 rounded-xl border border-slate-600"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex gap-3">
                              <span className="text-2xl">{notification.icon || '📢'}</span>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium text-white">{notification.title}</h4>
                                  <Badge 
                                    variant={
                                      notification.priority === 'urgent' ? 'delinquent' :
                                      notification.priority === 'high' ? 'trade' :
                                      'outline'
                                    }
                                    className="text-xs"
                                  >
                                    {notification.priority}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {notification.category}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-400 mt-1">{notification.content}</p>
                                {notification.action_url && (
                                  <a 
                                    href={notification.action_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm text-blue-400 hover:underline mt-2"
                                  >
                                    {notification.action_label || 'View'} <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                <p className="text-xs text-slate-500 mt-2">
                                  Created: {new Date(notification.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={async () => {
                                  if (confirm('Delete this notification?')) {
                                    const result = await deleteNotification(notification.id);
                                    if (result.success) {
                                      setNotifications(prev => prev.filter(n => n.id !== notification.id));
                                    }
                                  }
                                }}
                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                title="Delete notification"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ======================= SETTINGS TAB ======================= */}
        {adminTab === 'settings' && (
          <>
        {/* Integration Settings */}
        <Card className="bg-slate-800/50 border-slate-700 mt-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" />
              Integration Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Zapier Webhook */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-orange-400" />
                <h3 className="text-white font-medium">Zapier Webhook (External Commissioners)</h3>
              </div>
              <p className="text-sm text-slate-400">
                When external commissioners register, their contact info will be sent to this webhook. 
                Use this to automatically add them to your EZ Texting list via Zapier.
              </p>
              <div className="flex gap-3">
                <input
                  type="url"
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  value={zapierWebhookUrl}
                  onChange={(e) => setZapierWebhookUrlState(e.target.value)}
                  className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <Button
                  variant="primary"
                  onClick={handleSaveWebhook}
                  className="gap-2"
                >
                  {webhookSaved ? (
                    <>
                      <Check className="w-4 h-4" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </Button>
              </div>
              <div className="p-4 bg-slate-700/30 rounded-xl space-y-2">
                <p className="text-sm font-medium text-slate-300">Webhook Payload:</p>
                <code className="block text-xs text-slate-400 bg-slate-800/50 p-3 rounded-lg overflow-x-auto">
{`{
  "name": "Commissioner Name",
  "email": "email@example.com",
  "phone": "+15551234567",
  "league_name": "Their League Name",
  "username": "their_username",
  "registered_at": "2024-01-15T12:00:00.000Z",
  "source": "JKAP League Tools"
}`}
                </code>
              </div>
              <a
                href="https://zapier.com/app/editor"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open Zapier Editor
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card className="bg-slate-800/50 border-slate-700 mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                Feature Visibility
                {flagsSaved && (
                  <Badge variant="active" className="ml-2 text-xs">Saved!</Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleToolsOnly}
                  className="text-xs"
                >
                  Tools Only
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleEnableAll}
                  className="text-xs"
                >
                  Enable All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-slate-400">
              Control what features your league members can see. As commissioner, you always have access to everything.
              Changes take effect immediately.
            </p>
            
            {/* Main Sections */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Main Sections</h3>
              <div className="grid gap-3">
                {(Object.keys(FEATURE_LABELS) as Array<keyof FeatureFlags>)
                  .filter(key => FEATURE_LABELS[key].category === 'Main Sections')
                  .map(key => (
                    <button
                      key={key}
                      onClick={() => handleToggleFeature(key)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        featureFlags[key]
                          ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-slate-700/30 border-slate-600 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${featureFlags[key] ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {FEATURE_LABELS[key].name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {FEATURE_LABELS[key].description}
                        </p>
                      </div>
                      <div className="ml-4">
                        {featureFlags[key] ? (
                          <ToggleRight className="w-8 h-8 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-500" />
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Individual Tools */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Individual Tools</h3>
              <div className="grid gap-3">
                {(Object.keys(FEATURE_LABELS) as Array<keyof FeatureFlags>)
                  .filter(key => FEATURE_LABELS[key].category === 'Tools')
                  .map(key => (
                    <button
                      key={key}
                      onClick={() => handleToggleFeature(key)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        featureFlags[key]
                          ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-slate-700/30 border-slate-600 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${featureFlags[key] ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {FEATURE_LABELS[key].name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {FEATURE_LABELS[key].description}
                        </p>
                      </div>
                      <div className="ml-4">
                        {featureFlags[key] ? (
                          <ToggleRight className="w-8 h-8 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-500" />
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Token Economy Features - HIDDEN UNTIL ROLLOUT */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                🪙 Token Economy (Coming Soon)
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                These features are being built in the background. Toggle them ON when you're ready to reveal them to the league.
              </p>
              <div className="grid gap-3">
                {(Object.keys(FEATURE_LABELS) as Array<keyof FeatureFlags>)
                  .filter(key => FEATURE_LABELS[key].category === 'Token Economy')
                  .map(key => (
                    <button
                      key={key}
                      onClick={() => handleToggleFeature(key)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        featureFlags[key]
                          ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                          : 'bg-slate-700/30 border-slate-600 hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <p className={`font-medium ${featureFlags[key] ? 'text-amber-400' : 'text-slate-300'}`}>
                          {FEATURE_LABELS[key].name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {FEATURE_LABELS[key].description}
                        </p>
                      </div>
                      <div className="ml-4">
                        {featureFlags[key] ? (
                          <ToggleRight className="w-8 h-8 text-amber-400" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-500" />
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <p className="text-sm text-amber-400">
                <strong>Note:</strong> As the commissioner, you'll always see all features regardless of these settings.
                These toggles only affect what regular league members can access.
              </p>
            </div>
          </CardContent>
        </Card>
          </>
        )}

        {/* ======================= ACTIVITY TAB ======================= */}
        {adminTab === 'activity' && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  Activity Monitor
                </CardTitle>
                <div className="flex items-center gap-2">
                  <select
                    value={activityPeriod}
                    onChange={(e) => setActivityPeriod(e.target.value as 'week' | 'month' | 'all')}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>
              <p className="text-slate-400 text-sm mt-1">
                Track player activity and identify inactive members. Minimum: {minGamesRequired} games per week.
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="text-center py-8 text-slate-400">Loading activity data...</div>
              ) : Object.keys(activitySummary).length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No activity data yet</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Activity will be tracked when members create game recaps or upload analyses.
                  </p>
                </div>
              ) : (
                <>
                  {/* Activity Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-green-400">
                        {users.filter(u => {
                          const summary = activitySummary[u.id];
                          return summary && summary.gamesPlayed >= minGamesRequired;
                        }).length}
                      </p>
                      <p className="text-xs text-slate-400">Active Players</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-red-400">
                        {users.filter(u => {
                          const summary = activitySummary[u.id];
                          return !summary || summary.gamesPlayed < minGamesRequired;
                        }).length}
                      </p>
                      <p className="text-xs text-slate-400">Inactive Players</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-blue-400">
                        {Object.values(activitySummary).reduce((sum, s) => sum + s.gamesPlayed, 0)}
                      </p>
                      <p className="text-xs text-slate-400">Total Games</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-emerald-400">
                        {Object.values(activitySummary).reduce((sum, s) => sum + (s.wins || 0), 0)}
                      </p>
                      <p className="text-xs text-slate-400">Total Wins</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-amber-400">
                        {(() => {
                          const totalGames = Object.values(activitySummary).reduce((sum, s) => sum + s.gamesPlayed, 0);
                          const totalWins = Object.values(activitySummary).reduce((sum, s) => sum + (s.wins || 0), 0);
                          return totalGames > 0 ? Math.round((totalWins / totalGames) * 100) + '%' : '0%';
                        })()}
                      </p>
                      <p className="text-xs text-slate-400">Avg Win Rate</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-2xl font-bold text-purple-400">
                        {Object.values(activitySummary).reduce((sum, s) => sum + s.recapsCreated, 0)}
                      </p>
                      <p className="text-xs text-slate-400">Recaps Created</p>
                    </div>
                  </div>

                  {/* Player of the Week & Hot/Cold Section */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Player of the Week */}
                    {(() => {
                      const sortedByActivity = Object.entries(activitySummary)
                        .map(([userId, summary]) => ({
                          userId,
                          totalActivity: summary.gamesPlayed + summary.recapsCreated + summary.analysisUploads,
                          ...summary,
                        }))
                        .sort((a, b) => b.totalActivity - a.totalActivity);
                      
                      const topPlayer = sortedByActivity[0];
                      const topUser = topPlayer ? users.find(u => u.id === topPlayer.userId) : null;
                      const topTeam = topUser ? MLB_TEAMS.find(t => t.id === topUser.team_id) : null;
                      
                      return (
                        <div className="p-4 bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border border-yellow-500/30 rounded-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            <span className="font-medium text-yellow-400">Player of the Week</span>
                          </div>
                          {topUser ? (
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                                <span className="text-2xl">👑</span>
                              </div>
                              <div>
                                <p className="font-bold text-white text-lg">{topUser.display_name}</p>
                                <p className="text-sm text-yellow-400/80">{topTeam?.name || 'Unknown Team'}</p>
                                <p className="text-xs text-slate-400">
                                  {topPlayer.gamesPlayed} games • {topPlayer.wins || 0}-{topPlayer.losses || 0} ({topPlayer.winRate || 0}%)
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-slate-400 text-sm">No activity yet</p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Hot Players */}
                    {(() => {
                      const hotPlayers = Object.entries(activitySummary)
                        .filter(([, summary]) => summary.gamesPlayed >= minGamesRequired)
                        .map(([userId, summary]) => ({
                          userId,
                          user: users.find(u => u.id === userId),
                          totalActivity: summary.gamesPlayed + summary.recapsCreated,
                        }))
                        .sort((a, b) => b.totalActivity - a.totalActivity)
                        .slice(0, 3);
                      
                      return (
                        <div className="p-4 bg-gradient-to-br from-orange-500/20 to-red-500/10 border border-orange-500/30 rounded-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <Flame className="w-5 h-5 text-orange-400" />
                            <span className="font-medium text-orange-400">Hot Streak 🔥</span>
                          </div>
                          {hotPlayers.length > 0 ? (
                            <div className="space-y-2">
                              {hotPlayers.map((player, i) => {
                                const team = MLB_TEAMS.find(t => t.id === player.user?.team_id);
                                return (
                                  <div key={player.userId} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                                      <span className="text-xs font-mono text-amber-400">{team?.abbreviation || '???'}</span>
                                      <span className="text-sm text-white">{player.user?.display_name || 'Unknown'}</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-400">
                                      {player.totalActivity} pts
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-slate-400 text-sm">No hot players yet</p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Cold Players */}
                    {(() => {
                      const coldPlayers = users
                        .filter(u => !u.is_admin)
                        .map(u => ({
                          user: u,
                          summary: activitySummary[u.id],
                          gamesPlayed: activitySummary[u.id]?.gamesPlayed || 0,
                        }))
                        .filter(p => p.gamesPlayed < minGamesRequired)
                        .sort((a, b) => a.gamesPlayed - b.gamesPlayed)
                        .slice(0, 3);
                      
                      return (
                        <div className="p-4 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 rounded-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <Star className="w-5 h-5 text-blue-400" />
                            <span className="font-medium text-blue-400">Needs Attention ❄️</span>
                          </div>
                          {coldPlayers.length > 0 ? (
                            <div className="space-y-2">
                              {coldPlayers.map(player => {
                                const team = MLB_TEAMS.find(t => t.id === player.user.team_id);
                                return (
                                  <div key={player.user.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-mono text-amber-400">{team?.abbreviation || '???'}</span>
                                      <span className="text-sm text-white">{player.user.display_name}</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400">
                                      {player.gamesPlayed} games
                                    </Badge>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-slate-400 text-sm">Everyone is active! 🎉</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Inactive Players Alert */}
                  {(() => {
                    const inactivePlayers = users.filter(u => {
                      const summary = activitySummary[u.id];
                      return !summary || summary.gamesPlayed < minGamesRequired;
                    });
                    
                    if (inactivePlayers.length > 0) {
                      return (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            <span className="font-medium text-red-400">
                              {inactivePlayers.length} Inactive Player{inactivePlayers.length > 1 ? 's' : ''} Detected
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {inactivePlayers.map(player => {
                              const team = MLB_TEAMS.find(t => t.id === player.team_id);
                              const summary = activitySummary[player.id];
                              return (
                                <div
                                  key={player.id}
                                  className="flex items-center justify-between px-3 py-2 bg-slate-800 rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-amber-400">
                                      {team?.abbreviation || '???'}
                                    </span>
                                    <span className="text-sm text-white truncate max-w-[100px]">
                                      {player.display_name}
                                    </span>
                                  </div>
                                  <Badge variant="outline" className="text-xs border-red-500/50 text-red-400">
                                    {summary?.gamesPlayed || 0} games
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Full Activity Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-600">
                          <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Player</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Team</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">Games</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">Record</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">Win %</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">Recaps</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Last Active</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users
                          .filter(u => !u.is_admin)
                          .sort((a, b) => {
                            const aSummary = activitySummary[a.id];
                            const bSummary = activitySummary[b.id];
                            const aGames = aSummary?.gamesPlayed || 0;
                            const bGames = bSummary?.gamesPlayed || 0;
                            return bGames - aGames; // Sort by most active first
                          })
                          .map(player => {
                            const team = MLB_TEAMS.find(t => t.id === player.team_id);
                            const summary = activitySummary[player.id];
                            const isActive = summary && summary.gamesPlayed >= minGamesRequired;
                            
                            return (
                              <tr key={player.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-medium">{player.display_name}</span>
                                    <span className="text-xs text-slate-500">@{player.username}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm text-slate-300">{team?.name || 'Unknown'}</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`font-medium ${isActive ? 'text-green-400' : 'text-red-400'}`}>
                                    {summary?.gamesPlayed || 0}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="text-emerald-400">{summary?.wins || 0}</span>
                                  <span className="text-slate-500">-</span>
                                  <span className="text-red-400">{summary?.losses || 0}</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`font-medium ${(summary?.winRate || 0) >= 50 ? 'text-green-400' : 'text-amber-400'}`}>
                                    {summary?.winRate || 0}%
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="text-blue-400">{summary?.recapsCreated || 0}</span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm text-slate-400">
                                    {summary?.lastActive 
                                      ? new Date(summary.lastActive).toLocaleDateString()
                                      : 'Never'
                                    }
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {isActive ? (
                                    <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="border-red-500/50 text-red-400">
                                      Inactive
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ======================= REWARDS TAB ======================= */}
        {adminTab === 'rewards' && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Rewards & Leaderboard
              </CardTitle>
              <p className="text-slate-400 text-sm mt-1">
                Track player achievements, badges, and rankings.
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingLeaderboard ? (
                <div className="text-center py-8 text-slate-400">Loading leaderboard...</div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No rewards data yet</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Players earn points by creating recaps and uploading analyses.
                  </p>
                </div>
              ) : (
                <>
                  {/* Badge Legend */}
                  <div className="mb-6 p-4 bg-slate-700/30 rounded-xl">
                    <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-purple-400" />
                      Available Badges
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {BADGES.map(badge => (
                        <div
                          key={badge.id}
                          className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg"
                          title={badge.description}
                        >
                          <span className="text-lg">{badge.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{badge.name}</p>
                            <p className="text-[10px] text-slate-500">+{badge.points_value} pts</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Leaderboard */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-600">
                          <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase w-12">#</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Player</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">Points</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">Streak</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">Games</th>
                          <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">Recaps</th>
                          <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Badges</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.map((player, index) => {
                          const playerUser = users.find(u => u.id === player.user_id);
                          const team = MLB_TEAMS.find(t => t.id === playerUser?.team_id);
                          const playerBadges = BADGES.filter(b => player.badges?.includes(b.id));
                          
                          return (
                            <tr key={player.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                              <td className="py-3 px-4 text-center">
                                {index === 0 ? (
                                  <span className="text-2xl">🥇</span>
                                ) : index === 1 ? (
                                  <span className="text-2xl">🥈</span>
                                ) : index === 2 ? (
                                  <span className="text-2xl">🥉</span>
                                ) : (
                                  <span className="text-slate-400 font-medium">{index + 1}</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-amber-400">
                                    {team?.abbreviation || '???'}
                                  </span>
                                  <span className="text-white font-medium">
                                    {playerUser?.display_name || 'Unknown'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="font-bold text-yellow-400">{player.total_points}</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Flame className="w-3 h-3 text-orange-400" />
                                  <span className="text-orange-400">{player.current_streak}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-blue-400">{player.games_played}</span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-purple-400">{player.recaps_created}</span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1 flex-wrap">
                                  {playerBadges.slice(0, 5).map(badge => (
                                    <span
                                      key={badge.id}
                                      title={`${badge.name}: ${badge.description}`}
                                      className="text-sm cursor-help"
                                    >
                                      {badge.icon}
                                    </span>
                                  ))}
                                  {playerBadges.length > 5 && (
                                    <span className="text-xs text-slate-400">+{playerBadges.length - 5}</span>
                                  )}
                                  {playerBadges.length === 0 && (
                                    <span className="text-xs text-slate-500">No badges yet</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ======================= STANDINGS TAB ======================= */}
        {adminTab === 'standings' && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                League Standings
              </CardTitle>
              <p className="text-slate-400 text-sm mt-1">
                Win/loss records from game recaps. Stats update automatically when recaps are created.
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingStandings ? (
                <div className="text-center py-8 text-slate-400">Loading standings...</div>
              ) : standings.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No game data yet</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Standings will populate as members create game recaps.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-600">
                        <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase w-12">#</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Team</th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">W</th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">L</th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">PCT</th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">RS</th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">RA</th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">DIFF</th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-slate-400 uppercase">STRK</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">L10</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team, index) => {
                        const teamInfo = MLB_TEAMS.find(t => t.id === team.teamId);
                        const pct = team.wins + team.losses > 0 
                          ? (team.wins / (team.wins + team.losses)).toFixed(3).replace('0.', '.')
                          : '.000';
                        const diff = team.runsScored - team.runsAllowed;
                        const l10 = team.lastGames.slice(0, 10);
                        const l10Wins = l10.filter(g => g.result === 'W').length;
                        const l10Losses = l10.filter(g => g.result === 'L').length;
                        
                        return (
                          <tr key={team.teamId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                            <td className="py-3 px-4 text-center">
                              <span className="text-slate-400 font-medium">{index + 1}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-amber-400">
                                  {teamInfo?.abbreviation || team.teamId.toUpperCase()}
                                </span>
                                <span className="text-white font-medium">
                                  {teamInfo?.name || team.teamId}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-medium text-green-400">{team.wins}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-medium text-red-400">{team.losses}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-mono text-white">{pct}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-blue-400">{team.runsScored}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-orange-400">{team.runsAllowed}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-400'}>
                                {diff > 0 ? '+' : ''}{diff}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {team.currentStreak > 0 ? (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    team.streakType === 'W' 
                                      ? 'border-green-500/50 text-green-400' 
                                      : 'border-red-500/50 text-red-400'
                                  }`}
                                >
                                  {team.streakType}{team.currentStreak}
                                </Badge>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-slate-300">
                                {l10.length > 0 ? `${l10Wins}-${l10Losses}` : '-'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ======================= INTEL TAB ======================= */}
        {adminTab === 'intel' && (
          <>
        {/* ============================================================= */}
        {/* LEAGUE INTEL CENTER - Central Scouting Database */}
        {/* ============================================================= */}
        <Card className="bg-slate-800/50 border-slate-700 mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                League Intel Center
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-emerald-500/50 text-emerald-400 ml-2">
                  {Object.keys(caseFiles).length} TEAMS
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-blue-500/50 text-blue-400 ml-1">
                  {scoutingData.length + supabaseReports.length} REPORTS
                </Badge>
                {isLoadingIntel && (
                  <span className="text-xs text-slate-400 animate-pulse">Loading...</span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                {(scoutingData.length > 0 || supabaseReports.length > 0) && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleExportScoutingData}
                    icon={<Download className="w-4 h-4" />}
                  >
                    Export All
                  </Button>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Comprehensive scouting intelligence on every team. Sell as premium reports later. 💰
            </p>
          </CardHeader>
          <CardContent>
            {Object.keys(caseFiles).length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-slate-500" />
                </div>
                <p className="text-slate-400 font-medium">No scouting data yet</p>
                <p className="text-sm text-slate-500 mt-1">
                  Case files build as users upload game analysis screenshots
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(caseFiles)
                  .sort((a, b) => (b[1].reportsAgainstThem.length + b[1].theirSubmissions.length) - (a[1].reportsAgainstThem.length + a[1].theirSubmissions.length))
                  .map(([teamId, caseFile]) => (
                  <div key={teamId} className="border border-slate-600 rounded-xl overflow-hidden">
                    {/* Team Header */}
                    <button
                      onClick={() => setExpandedCaseFile(expandedCaseFile === teamId ? null : teamId)}
                      className="w-full bg-slate-700/50 px-4 py-3 flex items-center justify-between hover:bg-slate-700/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 flex items-center justify-center">
                          <span className="text-2xl">📁</span>
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-white text-lg">{caseFile.teamName}</p>
                          <div className="flex gap-3 text-xs">
                            <span className="text-emerald-400">{caseFile.theirSubmissions.length} self-reports</span>
                            <span className="text-blue-400">{caseFile.reportsAgainstThem.length} intel reports</span>
                            <span className="text-amber-400">{caseFile.aggregatedWeaknesses.length} weaknesses found</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {caseFile.aggregatedWeaknesses.length > 0 && (
                          <Badge variant="outline" className="border-red-500/50 text-red-400">
                            {caseFile.aggregatedWeaknesses.length} Vulnerabilities
                          </Badge>
                        )}
                        {expandedCaseFile === teamId ? (
                          <ChevronUp className="w-6 h-6 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                    </button>
                    
                    {/* Expanded Case File */}
                    {expandedCaseFile === teamId && (
                      <div className="bg-slate-800/50 border-t border-slate-600">
                        {/* Tabs */}
                        <div className="flex border-b border-slate-600">
                          <button
                            onClick={() => setCaseFileTab('overview')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${
                              caseFileTab === 'overview' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500' 
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            📊 Scouting Overview
                          </button>
                          <button
                            onClick={() => setCaseFileTab('reports')}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${
                              caseFileTab === 'reports' 
                                ? 'bg-blue-500/10 text-blue-400 border-b-2 border-blue-500' 
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            📄 Raw Reports ({caseFile.theirSubmissions.length + caseFile.reportsAgainstThem.length})
                          </button>
                        </div>
                        
                        {caseFileTab === 'overview' ? (
                          <div className="p-4 space-y-4">
                            {/* Weaknesses */}
                            {caseFile.aggregatedWeaknesses.length > 0 && (
                              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                <h4 className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-2">
                                  🎯 WEAKNESSES ({caseFile.aggregatedWeaknesses.length})
                                </h4>
                                <ul className="space-y-1">
                                  {caseFile.aggregatedWeaknesses.slice(0, 10).map((w, i) => (
                                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                      <span className="text-red-400">•</span> {w}
                                    </li>
                                  ))}
                                  {caseFile.aggregatedWeaknesses.length > 10 && (
                                    <li className="text-xs text-slate-500">+{caseFile.aggregatedWeaknesses.length - 10} more...</li>
                                  )}
                                </ul>
                              </div>
                            )}
                            
                            {/* Strengths */}
                            {caseFile.aggregatedStrengths.length > 0 && (
                              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                <h4 className="text-emerald-400 font-semibold text-sm mb-2 flex items-center gap-2">
                                  💪 STRENGTHS ({caseFile.aggregatedStrengths.length})
                                </h4>
                                <ul className="space-y-1">
                                  {caseFile.aggregatedStrengths.slice(0, 8).map((s, i) => (
                                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                      <span className="text-emerald-400">•</span> {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Hitting Tendencies */}
                            {caseFile.hittingTendencies.length > 0 && (
                              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                <h4 className="text-blue-400 font-semibold text-sm mb-2 flex items-center gap-2">
                                  ⚾ HITTING TENDENCIES
                                </h4>
                                <ul className="space-y-1">
                                  {caseFile.hittingTendencies.slice(0, 8).map((t, i) => (
                                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                      <span className="text-blue-400">•</span> {t}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {/* Strategies */}
                            {caseFile.strategies.length > 0 && (
                              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                <h4 className="text-purple-400 font-semibold text-sm mb-2 flex items-center gap-2">
                                  🧠 RECOMMENDED STRATEGIES
                                </h4>
                                {caseFile.strategies.map((s, i) => (
                                  <p key={i} className="text-sm text-slate-300 mb-2 pl-2 border-l-2 border-purple-500/30">
                                    "{s}"
                                  </p>
                                ))}
                              </div>
                            )}
                            
                            {/* No Data */}
                            {caseFile.aggregatedWeaknesses.length === 0 && 
                             caseFile.aggregatedStrengths.length === 0 && 
                             caseFile.strategies.length === 0 && (
                              <div className="text-center py-6 text-slate-500">
                                <p>No detailed intel extracted yet.</p>
                                <p className="text-xs mt-1">Waiting for more analysis uploads...</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                            {/* All Reports */}
                            {[...caseFile.theirSubmissions, ...caseFile.reportsAgainstThem]
                              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                              .map((entry) => (
                              <div key={entry.id} className="bg-slate-700/30 rounded-lg overflow-hidden">
                                <button
                                  onClick={() => setExpandedScouting(expandedScouting === entry.id ? null : entry.id)}
                                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
                                >
                                  <div className="flex items-center gap-3 text-left">
                                    <span className="text-lg">{entry.analysisType === 'hitting' ? '⚾' : '🎯'}</span>
                                    <div>
                                      <p className="text-sm text-white">
                                        <span className="text-slate-400">From:</span> <span className="text-emerald-400">@{entry.uploadedBy}</span>
                                        <span className="text-slate-500 mx-2">vs</span>
                                        <span className="text-blue-400">{entry.opponentTeamName || getScoutingTeamName(entry.opponentTeamId)}</span>
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {new Date(entry.timestamp).toLocaleString()} • {entry.analysisType || 'pitching'}
                                      </p>
                                    </div>
                                  </div>
                                  {expandedScouting === entry.id ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  )}
                                </button>
                                
                                {expandedScouting === entry.id && (
                                  <div className="px-4 pb-4 space-y-3 border-t border-slate-600">
                                    {/* Image */}
                                    {entry.imageData && (
                                      <div className="rounded-lg overflow-hidden border border-slate-600 mt-3">
                                        <img 
                                          src={entry.imageData} 
                                          alt="Analysis" 
                                          className="w-full max-h-60 object-contain bg-slate-900"
                                        />
                                      </div>
                                    )}
                                    
                                    {/* User Feedback (what we showed them) */}
                                    {(entry.userFeedback || entry.aiFeedback) && (
                                      <div className="p-3 bg-slate-700/50 rounded-lg">
                                        <p className="text-xs font-semibold text-slate-400 mb-1">Shown to User:</p>
                                        <p className="text-xs text-slate-300 whitespace-pre-line line-clamp-4">
                                          {entry.userFeedback || entry.aiFeedback}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {/* Hidden Intel */}
                                    {entry.scoutingIntel && (
                                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                        <p className="text-xs font-semibold text-amber-400 mb-2">🔒 Hidden Intel Extracted:</p>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          {(entry.scoutingIntel.uploaderWeaknesses?.length ?? 0) > 0 && (
                                            <div>
                                              <p className="text-red-400 font-medium">Their Weaknesses:</p>
                                              <ul className="text-slate-400">
                                                {entry.scoutingIntel.uploaderWeaknesses?.slice(0, 3).map((w, i) => (
                                                  <li key={i}>• {w}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                          {(entry.scoutingIntel.opponentWeaknesses?.length ?? 0) > 0 && (
                                            <div>
                                              <p className="text-blue-400 font-medium">Opponent Weaknesses:</p>
                                              <ul className="text-slate-400">
                                                {entry.scoutingIntel.opponentWeaknesses?.slice(0, 3).map((w, i) => (
                                                  <li key={i}>• {w}</li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                        </div>
                                        {entry.scoutingIntel.recommendedStrategy && (
                                          <p className="mt-2 text-xs text-purple-400">
                                            <strong>Strategy:</strong> {entry.scoutingIntel.recommendedStrategy}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Actions */}
                                    <div className="flex gap-2">
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleDeleteScoutingEntry(entry.id)}
                                        icon={<Trash2 className="w-3 h-3" />}
                                        className="text-red-400 hover:bg-red-500/20"
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                Reset Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">
                Set a new password for <span className="font-semibold text-amber-400">@{resetPasswordModal.username}</span>
              </p>
              <input
                type="text"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setResetPasswordModal(null);
                    setNewPassword('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleResetPassword}
                  disabled={!newPassword || actionLoading}
                  className="flex-1"
                >
                  {actionLoading ? 'Saving...' : 'Reset Password'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal - Now opens enhanced removal modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-lg">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-400" />
                Remove or Ban Member
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">
                What action do you want to take on <span className="font-semibold text-red-400">@{deleteConfirm.username}</span>?
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Remove Option */}
                <button
                  onClick={() => {
                    const targetUser = users.find(u => u.id === deleteConfirm.userId);
                    if (targetUser) {
                      setRemovePlayerModal({
                        user: targetUser,
                        action: 'remove',
                        reason: '',
                      });
                      setDeleteConfirm(null);
                    }
                  }}
                  className="p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="font-bold text-amber-400">Remove</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Player can appeal and potentially return. Use for inactivity or minor issues.
                  </p>
                </button>
                
                {/* Ban Option */}
                <button
                  onClick={() => {
                    const targetUser = users.find(u => u.id === deleteConfirm.userId);
                    if (targetUser) {
                      setRemovePlayerModal({
                        user: targetUser,
                        action: 'ban',
                        reason: '',
                      });
                      setDeleteConfirm(null);
                    }
                  }}
                  className="p-4 rounded-xl border-2 border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-all text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Ban className="w-5 h-5 text-red-400" />
                    <span className="font-bold text-red-400">Ban</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Permanent block. Cannot re-register. Use for serious violations.
                  </p>
                </button>
              </div>
              
              <Button
                variant="secondary"
                onClick={() => setDeleteConfirm(null)}
                className="w-full"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Remove/Ban Modal */}
      {removePlayerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className={`bg-slate-800 border-slate-700 w-full max-w-md ${
            removePlayerModal.action === 'ban' ? 'border-red-500/50' : 'border-amber-500/50'
          }`}>
            <CardHeader>
              <CardTitle className={`text-white flex items-center gap-2 ${
                removePlayerModal.action === 'ban' ? 'text-red-400' : 'text-amber-400'
              }`}>
                {removePlayerModal.action === 'ban' ? <Ban className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                {removePlayerModal.action === 'ban' ? 'Ban Member' : 'Remove Member'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-slate-300">
                  <span className="font-bold">@{removePlayerModal.user.username}</span>
                </p>
                <p className="text-sm text-slate-400">{removePlayerModal.user.display_name}</p>
                {removePlayerModal.user.team_id && (
                  <p className="text-sm text-slate-500">Team: {getTeamName(removePlayerModal.user.team_id)}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Reason for {removePlayerModal.action === 'ban' ? 'ban' : 'removal'} *
                </label>
                <textarea
                  value={removePlayerModal.reason}
                  onChange={(e) => setRemovePlayerModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white h-24"
                  placeholder={removePlayerModal.action === 'ban' 
                    ? 'e.g., Repeated rule violations, toxic behavior...'
                    : 'e.g., Inactivity, failed to meet game minimums...'
                  }
                />
              </div>
              
              {removePlayerModal.action === 'ban' && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">
                    ⚠️ <strong>This is permanent.</strong> The player will be blocked from re-registering using their username, email, or phone number.
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setRemovePlayerModal(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleRemovePlayer}
                  disabled={actionLoading || !removePlayerModal.reason.trim()}
                  className={`flex-1 ${
                    removePlayerModal.action === 'ban' ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'
                  }`}
                >
                  {actionLoading ? 'Processing...' : removePlayerModal.action === 'ban' ? 'Ban Member' : 'Remove Member'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Approve Registration Modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-slate-700 border-green-500/50 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Approve Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="font-bold text-white">@{approveModal.username}</p>
                <p className="text-slate-300">{approveModal.display_name}</p>
                <p className="text-sm text-slate-400 mt-2">
                  Will be assigned: <span className="text-blue-400">{getTeamName(approveModal.requested_team_id)}</span>
                </p>
                {approveModal.approval_code && (
                  <p className="text-xs text-purple-400 mt-1">
                    Approval code: <code className="bg-slate-700 px-1 rounded">{approveModal.approval_code}</code>
                    {(() => {
                      const mapping = getLeagueFromApprovalCode(approveModal.approval_code);
                      return mapping ? ` → ${mapping.leagueName}` : '';
                    })()}
                  </p>
                )}
              </div>

              {/* Password Status */}
              {approveModal.password ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-sm text-emerald-400">
                    ✓ Player set their own password during registration
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-400">
                    ⚠ No password set - a random one will be generated for you to send
                  </p>
                </div>
              )}
              
              {/* League Level Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Trophy className="w-4 h-4 inline mr-1" />
                  Starting League Level
                </label>
                <select
                  value={selectedStartingLeague}
                  onChange={(e) => setSelectedStartingLeague(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-green-500"
                >
                  {leagues.sort((a, b) => a.level - b.level).map(league => (
                    <option key={league.id} value={league.id}>
                      {league.name} {league.level === 1 ? '⭐ (Main League)' : `(Level ${league.level})`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-2">
                  {selectedStartingLeague === 'majors' ? (
                    <span className="text-amber-400">⭐ Fast-track: Player joins the main Majors league immediately</span>
                  ) : (
                    <span className="text-blue-400">📈 Minor League: Player starts here and can earn promotions</span>
                  )}
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setApproveModal(null);
                    setSelectedStartingLeague('majors'); // Reset to default
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleApproveRegistration}
                  disabled={actionLoading}
                  className="flex-1 bg-green-600 hover:bg-green-500"
                >
                  {actionLoading ? 'Approving...' : 'Approve & Create Account'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Approval Success Modal - Shows credentials to copy */}
      {approvalSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-slate-700 border-emerald-500/50 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Member Created Successfully!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
                <p className="text-emerald-400 font-medium mb-1">🎉 Welcome to the league!</p>
                <p className="text-white font-bold text-lg">{approvalSuccess.teamName}</p>
                {approvalSuccess.leagueName && (
                  <p className="text-sm text-amber-400 mt-1">
                    Starting in: {approvalSuccess.leagueName}
                  </p>
                )}
              </div>
              
              {approvalSuccess.usedOwnPassword ? (
                <>
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <p className="text-sm text-emerald-400">
                      ✓ <strong>Player set their own password</strong> - no need to send credentials!
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      They can log in right now at jkapmemorialleague.com/login
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Username</label>
                    <p className="text-white font-mono">{approvalSuccess.username}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Email</label>
                    <p className="text-slate-300 text-sm">{approvalSuccess.email}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Username</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={approvalSuccess.username}
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono"
                        />
                        <button
                          className="p-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-600"
                          onClick={() => {
                            navigator.clipboard.writeText(approvalSuccess.username);
                            setCopiedId('username');
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                        >
                          {copiedId === 'username' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Password</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={approvalSuccess.password}
                          className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono"
                        />
                        <button
                          className="p-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-600"
                          onClick={() => {
                            navigator.clipboard.writeText(approvalSuccess.password);
                            setCopiedId('password');
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                        >
                          {copiedId === 'password' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Email</label>
                      <p className="text-slate-300 text-sm">{approvalSuccess.email}</p>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-xs text-amber-400">
                      <strong>📋 Copy & send these credentials</strong> to the new member. They'll complete onboarding on their first login.
                    </p>
                  </div>
                </>
              )}
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  icon={copiedId === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  onClick={() => {
                    // Generate comprehensive welcome message using packet data
                    let message = `🏆 Welcome to JKAP Memorial League! 🏆

Congratulations! You've been approved to join our league.

📋 YOUR ACCOUNT DETAILS
━━━━━━━━━━━━━━━━━━━━━
Team: ${approvalSuccess.teamName}
Username: ${approvalSuccess.username}
Password: ${approvalSuccess.password}

🔐 LOGIN HERE
━━━━━━━━━━━━━━━━━━━━━
https://jkapmemorial.com/login

📱 IMPORTANT FIRST STEPS
━━━━━━━━━━━━━━━━━━━━━
1. Log in and complete the onboarding walkthrough
2. Join the in-game league "Jkapmemorial" in MLB The Show`;

                    // Add Discord link if available
                    if (welcomePacket?.discord_link) {
                      message += `\n3. Join our Discord: ${welcomePacket.discord_link}`;
                    }
                    
                    // Add Facebook link if available
                    if (welcomePacket?.facebook_link) {
                      message += `\n4. Join our Facebook Group: ${welcomePacket.facebook_link}`;
                    }

                    message += `

📖 QUICK REMINDERS
━━━━━━━━━━━━━━━━━━━━━
• Minimum 3 games per week required
• Log your games after each one
• Check Discord for matchups & announcements
• IL placements require 5-game minimum

Questions? DM the commissioner!

Let's play ball! ⚾`;

                    navigator.clipboard.writeText(message);
                    setCopiedId('all');
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                >
                  {copiedId === 'all' ? 'Copied!' : 'Copy Welcome Message'}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setApprovalSuccess(null)}
                  className="flex-1"
                >
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reject Registration Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-slate-700 border-red-500/50 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                Reject Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="font-bold text-white">@{rejectModal.request.username}</p>
                <p className="text-slate-300">{rejectModal.request.display_name}</p>
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Reason for rejection (optional)
                </label>
                <textarea
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
                  className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white h-24"
                  placeholder="e.g., Team already taken, incomplete information..."
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setRejectModal(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleRejectRegistration}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 hover:bg-red-500"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

