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
  
  // Load scouting data from localStorage (harvested data)
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('jkap_scouting_data') || '[]');
    setScoutingData(data);
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
        
        {/* ============================================================= */}
        {/* SCOUTING DATABASE - Team Case Files */}
        {/* ============================================================= */}
        <Card className="bg-slate-800/50 border-slate-700 mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" />
                Team Case Files
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-emerald-500/50 text-emerald-400 ml-2">
                  {Object.keys(caseFiles).length} TEAMS
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-blue-500/50 text-blue-400 ml-1">
                  {scoutingData.length} REPORTS
                </Badge>
              </CardTitle>
              <div className="flex gap-2">
                {scoutingData.length > 0 && (
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserX className="w-5 h-5 text-red-400" />
                Remove Member
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">
                Are you sure you want to remove <span className="font-semibold text-red-400">@{deleteConfirm.username}</span>?
              </p>
              <p className="text-sm text-slate-400">
                This will free up their team for another member to claim.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDeleteUser}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 hover:bg-red-500"
                >
                  {actionLoading ? 'Removing...' : 'Remove Member'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

