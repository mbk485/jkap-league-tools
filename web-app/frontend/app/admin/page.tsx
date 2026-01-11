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
  DBBannedPlayer,
  getTeamStatuses,
  updateTeamStatus,
  DBTeamStatus,
  TeamStatus,
  getWelcomePacket,
  saveWelcomePacket,
  DBWelcomePacket,
  createUser,
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
  const [isLoadingMemberManagement, setIsLoadingMemberManagement] = useState(true);
  
  // Member management modals
  const [removePlayerModal, setRemovePlayerModal] = useState<{
    user: DBUser;
    action: 'remove' | 'ban';
    reason: string;
  } | null>(null);
  const [approveModal, setApproveModal] = useState<DBRegistrationRequest | null>(null);
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
  const [adminTab, setAdminTab] = useState<'members' | 'queue' | 'teams' | 'banlist' | 'welcome' | 'intel' | 'settings'>('members');
  
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
        if (packet) {
          setWelcomePacketForm({
            title: packet.title,
            welcome_message: packet.welcome_message,
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
    
    // Create the user
    const createResult = await createUser({
      username: approveModal.username,
      password: Math.random().toString(36).slice(-8), // Generate random password
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
    
    // Update registration status
    await updateRegistrationRequest(approveModal.id, {
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    });
    
    // Refresh data
    setRegistrationQueue(await getRegistrationQueue());
    setUsers(await getAllUsers());
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
      showInjuredList: true,
      showGameRecap: true,
      showDraftBoard: true,
      showPlayersAcademy: true,
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
      showInjuredList: true,
      showGameRecap: true,
      showDraftBoard: false,
      showPlayersAcademy: true,
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
            onClick={() => setAdminTab('intel')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              adminTab === 'intel' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Target className="w-4 h-4" />
            Intel
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
                    <label className="block text-sm text-slate-400 mb-1">Welcome Message</label>
                    <textarea
                      value={welcomePacketForm.welcome_message}
                      onChange={(e) => setWelcomePacketForm(prev => ({ ...prev, welcome_message: e.target.value }))}
                      className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white h-48"
                      placeholder="Use {{name}} and {{team}} as placeholders..."
                    />
                    <p className="text-xs text-slate-500 mt-1">Use {'{{name}}'} and {'{{team}}'} as placeholders</p>
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
                    <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">
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
              </div>
              
              <p className="text-sm text-slate-400">
                A random password will be generated. The welcome packet will be sent to their email.
              </p>
              
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setApproveModal(null)}
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

