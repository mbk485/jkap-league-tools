'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MLB_TEAMS } from '@/types/league';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Download,
  Lock,
  Plus,
  Search,
  Users,
  X,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Settings,
  Copy,
  Send,
  MessageSquare,
  Share2,
  Timer,
  Megaphone,
  ExternalLink,
  Shield,
  Eye,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface Player {
  id: string;
  name: string;
  position: string;
  type: 'pitcher' | 'position';
  rating?: number;
}

interface ILPlacement {
  id: string;
  player: Player;
  teamId: string;
  startDate: string;
  startGame: number;
  endDate?: string;
  endGame?: number;
  gamesOnIL: number;
  injury: string;
  status: 'active' | 'completed';
}

interface TeamILData {
  id: string;
  name: string;
  abbreviation: string;
  totalPlacements: number;
  activePlacements: ILPlacement[];
  completedPlacements: ILPlacement[];
  pitcherPlacements: number;
  positionPlacements: number;
  isCompliant: boolean;
  complianceIssues: string[];
  penaltyLosses: number;
}

interface WebhookSettings {
  discordWebhookUrl: string;
  autoPostToDiscord: boolean;
  announcementStyle: 'espn' | 'simple';
}

// =============================================================================
// CONSTANTS
// =============================================================================

const allTeams = MLB_TEAMS.map(t => ({ id: t.id, name: t.name, abbreviation: t.abbreviation }));

// IL Placements - starts empty for clean rollout
const IL_STORAGE_KEY = 'jkap_il_placements';

// Load placements from localStorage or start with empty array
const loadPlacements = (): ILPlacement[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(IL_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

// Save placements to localStorage
const savePlacements = (placements: ILPlacement[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(IL_STORAGE_KEY, JSON.stringify(placements));
};

// IL Rules
const IL_RULES = {
  MIN_PLACEMENTS_PER_SEASON: 3,
  MIN_GAMES_PER_PLACEMENT: 5,
  REQUIRES_PITCHER: true,
  REQUIRES_POSITION_PLAYER: true,
  PENALTY_LOSSES: 10,
};

const STORAGE_KEYS = {
  WEBHOOK_SETTINGS: 'jkap_il_webhook_settings',
  PLACEMENTS: 'jkap_il_placements',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateTeamCompliance(
  teamId: string,
  placements: ILPlacement[]
): TeamILData {
  const team = allTeams.find((t) => t.id === teamId) || {
    id: teamId,
    name: 'Unknown',
    abbreviation: '???',
  };

  const teamPlacements = placements.filter((p) => p.teamId === teamId);
  const activePlacements = teamPlacements.filter((p) => p.status === 'active');
  const completedPlacements = teamPlacements.filter((p) => p.status === 'completed');

  const pitcherPlacements = teamPlacements.filter(
    (p) => p.player.type === 'pitcher' && p.status === 'completed'
  ).length;
  const positionPlacements = teamPlacements.filter(
    (p) => p.player.type === 'position' && p.status === 'completed'
  ).length;

  const complianceIssues: string[] = [];

  if (completedPlacements.length < IL_RULES.MIN_PLACEMENTS_PER_SEASON) {
    const remaining = IL_RULES.MIN_PLACEMENTS_PER_SEASON - completedPlacements.length;
    complianceIssues.push(`Need ${remaining} more IL placement${remaining > 1 ? 's' : ''}`);
  }

  if (pitcherPlacements < 1) {
    complianceIssues.push('Must place at least 1 pitcher on IL');
  }

  if (positionPlacements < 1) {
    complianceIssues.push('Must place at least 1 position player on IL');
  }

  const shortPlacements = completedPlacements.filter(
    (p) => p.gamesOnIL < IL_RULES.MIN_GAMES_PER_PLACEMENT
  );
  if (shortPlacements.length > 0) {
    complianceIssues.push(
      `${shortPlacements.length} placement(s) under ${IL_RULES.MIN_GAMES_PER_PLACEMENT}-game minimum`
    );
  }

  const isCompliant = complianceIssues.length === 0;
  const penaltyLosses = isCompliant ? 0 : IL_RULES.PENALTY_LOSSES;

  return {
    id: team.id,
    name: team.name,
    abbreviation: team.abbreviation,
    totalPlacements: teamPlacements.length,
    activePlacements,
    completedPlacements,
    pitcherPlacements,
    positionPlacements,
    isCompliant,
    complianceIssues,
    penaltyLosses,
  };
}

function generateESPNAnnouncement(
  type: 'placement' | 'activation',
  placement: ILPlacement,
  teamName: string,
  teamAbbr: string
): string {
  const date = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (type === 'placement') {
    return `🚨 JKAP MEMORIAL LEAGUE TRANSACTION 🚨

📋 INJURED LIST PLACEMENT

${teamName} have placed ${placement.player.type === 'pitcher' ? '⚾' : '🏃'} ${placement.player.name} (${placement.player.position}) on the Injured List.

💊 Injury: ${placement.injury}
📅 Effective: Game ${placement.startGame}
⏱️ Minimum IL stint: ${IL_RULES.MIN_GAMES_PER_PLACEMENT} games

${teamAbbr} | ${date}
#JKAPMemorialLeague #InjuredList`;
  } else {
    return `✅ JKAP MEMORIAL LEAGUE TRANSACTION ✅

🔄 INJURED LIST ACTIVATION

${teamName} have activated ${placement.player.type === 'pitcher' ? '⚾' : '🏃'} ${placement.player.name} (${placement.player.position}) from the Injured List.

💊 Injury: ${placement.injury} (recovered)
📅 IL stint: Games ${placement.startGame}-${placement.endGame} (${placement.gamesOnIL} games)
${placement.gamesOnIL >= IL_RULES.MIN_GAMES_PER_PLACEMENT ? '✓ Meets minimum requirement' : '⚠️ Below minimum (5 games required)'}

${teamAbbr} | ${date}
#JKAPMemorialLeague #InjuredList`;
  }
}

function generateSimpleAnnouncement(
  type: 'placement' | 'activation',
  placement: ILPlacement,
  teamName: string
): string {
  if (type === 'placement') {
    return `IL MOVE: ${teamName} place ${placement.player.name} (${placement.player.position}) on Injured List - ${placement.injury}`;
  } else {
    return `IL MOVE: ${teamName} activate ${placement.player.name} (${placement.player.position}) from Injured List after ${placement.gamesOnIL} games`;
  }
}

async function postToDiscord(webhookUrl: string, message: string): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        username: 'JKAP IL Manager',
        avatar_url: 'https://i.imgur.com/AfFp7pu.png',
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Discord webhook error:', error);
    return false;
  }
}

// =============================================================================
// COMPONENTS
// =============================================================================

function RulesCard() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="p-6 border-l-4 border-l-jkap-red-500">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-jkap-red-500" />
          <span className="font-semibold text-foreground">IL Rules & Requirements</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-jkap-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-jkap-red-500 font-semibold text-xs">1</span>
            </div>
            <p className="text-muted-foreground">
              Every team must use the Injured List (IL) at least{' '}
              <span className="text-foreground font-medium">three times</span> per season.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-jkap-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-jkap-red-500 font-semibold text-xs">2</span>
            </div>
            <p className="text-muted-foreground">
              Each IL placement must last a minimum of{' '}
              <span className="text-foreground font-medium">5 games</span>.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-jkap-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-jkap-red-500 font-semibold text-xs">3</span>
            </div>
            <p className="text-muted-foreground">
              Use at least <span className="text-foreground font-medium">one pitcher</span> and{' '}
              <span className="text-foreground font-medium">one position player</span>.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-jkap-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-jkap-red-500 font-semibold text-xs">4</span>
            </div>
            <p className="text-muted-foreground">
              Players on the IL must be{' '}
              <span className="text-foreground font-medium">removed from the active roster</span>.
            </p>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-semibold text-sm">Penalty</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Failure to use the IL three times each season will result in{' '}
              <span className="text-amber-400 font-medium">10 losses</span> added to your record.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: WebhookSettings;
  onSave: (settings: WebhookSettings) => void;
}

function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleTestWebhook = async () => {
    if (!localSettings.discordWebhookUrl) return;
    setTestStatus('testing');
    const success = await postToDiscord(
      localSettings.discordWebhookUrl,
      '🔔 **Test Message** - JKAP IL Manager webhook is connected successfully!'
    );
    setTestStatus(success ? 'success' : 'error');
    setTimeout(() => setTestStatus('idle'), 3000);
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-slide-in-up">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6" />
            ANNOUNCEMENT SETTINGS
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Admin Only Notice */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-semibold text-sm">Commissioner Only</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              These settings affect all league announcements
            </p>
          </div>

          {/* Discord Webhook */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Discord Webhook URL
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Create a webhook in your Discord server settings → Integrations → Webhooks
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={localSettings.discordWebhookUrl}
                onChange={(e) =>
                  setLocalSettings({ ...localSettings, discordWebhookUrl: e.target.value })
                }
                placeholder="https://discord.com/api/webhooks/..."
                className="flex-1 px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:border-jkap-red-500 focus:outline-none text-sm"
              />
              <Button
                variant="secondary"
                onClick={handleTestWebhook}
                disabled={!localSettings.discordWebhookUrl || testStatus === 'testing'}
              >
                {testStatus === 'testing' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : testStatus === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : testStatus === 'error' ? (
                  <XCircle className="w-4 h-4 text-red-400" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>
          </div>

          {/* Auto-post toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium text-foreground text-sm">Auto-post to Discord</p>
              <p className="text-xs text-muted-foreground">
                Automatically post announcements when placements are added
              </p>
            </div>
            <button
              onClick={() =>
                setLocalSettings({
                  ...localSettings,
                  autoPostToDiscord: !localSettings.autoPostToDiscord,
                })
              }
              className={`relative w-12 h-6 rounded-full transition-colors ${
                localSettings.autoPostToDiscord ? 'bg-jkap-red-500' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  localSettings.autoPostToDiscord ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Announcement Style */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Announcement Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  setLocalSettings({ ...localSettings, announcementStyle: 'espn' })
                }
                className={`p-3 rounded-lg border text-left transition-all ${
                  localSettings.announcementStyle === 'espn'
                    ? 'border-jkap-red-500 bg-jkap-red-500/10'
                    : 'border-border bg-muted/50 hover:border-border/80'
                }`}
              >
                <p className="font-medium text-foreground text-sm">ESPN Style</p>
                <p className="text-xs text-muted-foreground">Full format with emojis & hashtags</p>
              </button>
              <button
                onClick={() =>
                  setLocalSettings({ ...localSettings, announcementStyle: 'simple' })
                }
                className={`p-3 rounded-lg border text-left transition-all ${
                  localSettings.announcementStyle === 'simple'
                    ? 'border-jkap-red-500 bg-jkap-red-500/10'
                    : 'border-border bg-muted/50 hover:border-border/80'
                }`}
              >
                <p className="font-medium text-foreground text-sm">Simple</p>
                <p className="text-xs text-muted-foreground">Clean one-liner format</p>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleSave} fullWidth>
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AnnouncementPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: string;
  onPost: () => void;
  onCopy: () => void;
  isPosting: boolean;
  hasWebhook: boolean;
}

function AnnouncementPreview({
  isOpen,
  onClose,
  announcement,
  onPost,
  onCopy,
  isPosting,
  hasWebhook,
}: AnnouncementPreviewProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-slide-in-up">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-jkap-red-500" />
            ANNOUNCEMENT
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap text-foreground mb-6 max-h-[300px] overflow-y-auto">
            {announcement}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onCopy} fullWidth>
              <Copy className="w-4 h-4" />
              Copy to Clipboard
            </Button>
            {hasWebhook && (
              <Button variant="primary" onClick={onPost} disabled={isPosting} fullWidth>
                {isPosting ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Post to Discord
              </Button>
            )}
          </div>

          {!hasWebhook && (
            <p className="text-xs text-muted-foreground text-center mt-3">
              Configure Discord webhook in Settings to enable auto-posting
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface AddPlacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (placement: Omit<ILPlacement, 'id' | 'gamesOnIL' | 'status'>, showAnnouncement: boolean) => void;
  userTeamId?: string;
  isAdmin: boolean;
}

function AddPlacementModal({ isOpen, onClose, onAdd, userTeamId, isAdmin }: AddPlacementModalProps) {
  const [selectedTeam, setSelectedTeam] = useState(userTeamId || '');
  const [playerName, setPlayerName] = useState('');
  const [position, setPosition] = useState('');
  const [playerType, setPlayerType] = useState<'pitcher' | 'position'>('position');
  const [injury, setInjury] = useState('');
  const [startGame, setStartGame] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [announceOnAdd, setAnnounceOnAdd] = useState(true);

  // Reset to user's team when modal opens
  useEffect(() => {
    if (isOpen && userTeamId && !isAdmin) {
      setSelectedTeam(userTeamId);
    }
  }, [isOpen, userTeamId, isAdmin]);

  const positions = ['SP', 'RP', 'CP', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !playerName || !position || !injury) return;

    onAdd(
      {
        player: {
          id: `player-${Date.now()}`,
          name: playerName,
          position,
          type: playerType,
        },
        teamId: selectedTeam,
        startDate,
        startGame,
        injury,
      },
      announceOnAdd
    );

    setPlayerName('');
    setPosition('');
    setPlayerType('position');
    setInjury('');
    setStartGame(1);
    onClose();
  };

  if (!isOpen) return null;

  const userTeam = allTeams.find(t => t.id === userTeamId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl animate-slide-in-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <h2 className="font-display text-2xl text-foreground">ADD IL PLACEMENT</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Team Display/Select */}
          {isAdmin ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:border-jkap-red-500 focus:outline-none"
                required
              >
                <option value="">Select a team...</option>
                {allTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-jkap-red-500/10 border border-jkap-red-500/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-jkap-navy-600 flex items-center justify-center font-display text-white">
                  {userTeam?.abbreviation || '???'}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{userTeam?.name || 'Your Team'}</p>
                  <p className="text-xs text-muted-foreground">Adding placement for your team</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Player Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter player name..."
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:border-jkap-red-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Position</label>
              <select
                value={position}
                onChange={(e) => {
                  setPosition(e.target.value);
                  setPlayerType(
                    ['SP', 'RP', 'CP'].includes(e.target.value) ? 'pitcher' : 'position'
                  );
                }}
                className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:border-jkap-red-500 focus:outline-none"
                required
              >
                <option value="">Select...</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Player Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPlayerType('pitcher')}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    playerType === 'pitcher'
                      ? 'bg-jkap-red-500 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Pitcher
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerType('position')}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    playerType === 'position'
                      ? 'bg-jkap-red-500 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Position
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Injury Description
            </label>
            <input
              type="text"
              value={injury}
              onChange={(e) => setInjury(e.target.value)}
              placeholder="e.g., Shoulder Strain, Hamstring Tightness..."
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:border-jkap-red-500 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:border-jkap-red-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Starting Game #
              </label>
              <input
                type="number"
                value={startGame}
                onChange={(e) => setStartGame(parseInt(e.target.value) || 1)}
                min={1}
                className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:border-jkap-red-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Announcement Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Megaphone className="w-5 h-5 text-jkap-red-500" />
              <div>
                <p className="font-medium text-foreground text-sm">Announce placement</p>
                <p className="text-xs text-muted-foreground">
                  Show announcement preview after adding
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAnnounceOnAdd(!announceOnAdd)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                announceOnAdd ? 'bg-jkap-red-500' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  announceOnAdd ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth>
              <Plus className="w-4 h-4" />
              Add to IL
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface TeamCardProps {
  teamData: TeamILData;
  onActivate: (placementId: string, currentGame: number) => void;
  isExpanded: boolean;
  onToggle: () => void;
  currentGame: number;
  canEdit: boolean;
  isUserTeam: boolean;
}

function TeamCard({ teamData, onActivate, isExpanded, onToggle, currentGame, canEdit, isUserTeam }: TeamCardProps) {
  const [activateGameInput, setActivateGameInput] = useState<{ [key: string]: number }>({});

  return (
    <Card
      className={`overflow-hidden transition-all ${
        isUserTeam ? 'ring-2 ring-jkap-red-500 ring-offset-2 ring-offset-background' : ''
      } ${!teamData.isCompliant ? 'border-amber-500/50' : ''}`}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-display text-white ${
            isUserTeam ? 'bg-gradient-to-br from-jkap-red-500 to-jkap-red-600' : 'bg-jkap-navy-600'
          }`}>
            {teamData.abbreviation}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{teamData.name}</h3>
              {isUserTeam && (
                <Badge variant="active" className="text-xs">Your Team</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {teamData.totalPlacements} placement{teamData.totalPlacements !== 1 ? 's' : ''}
              </span>
              {teamData.activePlacements.length > 0 && (
                <Badge variant="active" className="text-xs">
                  {teamData.activePlacements.length} Active
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!canEdit && !isUserTeam && (
            <Eye className="w-4 h-4 text-muted-foreground" />
          )}
          {teamData.isCompliant ? (
            <div className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Compliant</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">
                {teamData.complianceIssues.length} Issue
                {teamData.complianceIssues.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          <ChevronDown
            className={`w-5 h-5 text-muted-foreground transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          {/* Stats Bar */}
          <div className="grid grid-cols-5 gap-4 p-4 bg-muted/30">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">
                {teamData.completedPlacements.length}/{IL_RULES.MIN_PLACEMENTS_PER_SEASON}
              </p>
              <p className="text-xs text-muted-foreground">Required Stints</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{teamData.pitcherPlacements}</p>
              <p className="text-xs text-muted-foreground">Pitcher Stints</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{teamData.positionPlacements}</p>
              <p className="text-xs text-muted-foreground">Position Stints</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{teamData.activePlacements.length}</p>
              <p className="text-xs text-muted-foreground">Currently on IL</p>
            </div>
            <div className="text-center">
              <p
                className={`text-lg font-bold ${
                  teamData.penaltyLosses > 0 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {teamData.penaltyLosses > 0 ? `+${teamData.penaltyLosses}` : '0'}
              </p>
              <p className="text-xs text-muted-foreground">Penalty Losses</p>
            </div>
          </div>

          {/* Compliance Issues */}
          {teamData.complianceIssues.length > 0 && (
            <div className="p-4 bg-amber-500/5 border-b border-amber-500/20">
              <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Compliance Issues
              </h4>
              <ul className="space-y-1">
                {teamData.complianceIssues.map((issue, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Active IL Placements */}
          {teamData.activePlacements.length > 0 && (
            <div className="p-4 border-b border-border">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-jkap-red-500" />
                Active IL ({teamData.activePlacements.length})
              </h4>
              <div className="space-y-3">
                {teamData.activePlacements.map((placement) => {
                  const gamesRemaining = Math.max(0, IL_RULES.MIN_GAMES_PER_PLACEMENT - placement.gamesOnIL);
                  const canActivate = gamesRemaining === 0;
                  const progress = Math.min(100, (placement.gamesOnIL / IL_RULES.MIN_GAMES_PER_PLACEMENT) * 100);

                  return (
                    <div
                      key={placement.id}
                      className="p-4 rounded-lg bg-muted/50 border border-border"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold ${
                              placement.player.type === 'pitcher'
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}
                          >
                            {placement.player.position}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{placement.player.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {placement.injury} • Started Game {placement.startGame}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {canActivate ? (
                            <Badge variant="active" className="text-xs flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              ELIGIBLE
                            </Badge>
                          ) : (
                            <Badge variant="delinquent" className="text-xs flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {gamesRemaining} Games Left
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">IL Progress</span>
                          <span className="text-foreground font-medium">
                            {placement.gamesOnIL} / {IL_RULES.MIN_GAMES_PER_PLACEMENT} games
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              canActivate ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Activate Controls - Only show if can edit */}
                      {canEdit && (
                        <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                          <div className="flex-1">
                            <label className="text-xs text-muted-foreground block mb-1">
                              Activate at Game #
                            </label>
                            <input
                              type="number"
                              min={placement.startGame + IL_RULES.MIN_GAMES_PER_PLACEMENT - 1}
                              value={activateGameInput[placement.id] || currentGame}
                              onChange={(e) =>
                                setActivateGameInput({
                                  ...activateGameInput,
                                  [placement.id]: parseInt(e.target.value) || currentGame,
                                })
                              }
                              className="w-full px-3 py-2 bg-muted border border-border rounded text-sm text-foreground focus:border-jkap-red-500 focus:outline-none"
                            />
                          </div>
                          <Button
                            variant={canActivate ? 'primary' : 'secondary'}
                            size="sm"
                            disabled={!canActivate}
                            onClick={() =>
                              onActivate(
                                placement.id,
                                activateGameInput[placement.id] || currentGame
                              )
                            }
                            className="mt-5"
                          >
                            <Check className="w-4 h-4" />
                            Activate
                          </Button>
                        </div>
                      )}

                      {!canActivate && canEdit && (
                        <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Cannot activate until minimum {IL_RULES.MIN_GAMES_PER_PLACEMENT} games served
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {teamData.completedPlacements.length > 0 && (
            <div className="p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                Completed Stints ({teamData.completedPlacements.length})
              </h4>
              <div className="space-y-2">
                {teamData.completedPlacements.map((placement) => (
                  <div
                    key={placement.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg opacity-80"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          placement.player.type === 'pitcher'
                            ? 'bg-blue-500/10 text-blue-400/70'
                            : 'bg-emerald-500/10 text-emerald-400/70'
                        }`}
                      >
                        {placement.player.position}
                      </div>
                      <div>
                        <p className="font-medium text-foreground/80">{placement.player.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {placement.injury} • Games {placement.startGame}-{placement.endGame} •{' '}
                          <span
                            className={
                              placement.gamesOnIL < IL_RULES.MIN_GAMES_PER_PLACEMENT
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }
                          >
                            {placement.gamesOnIL} games
                          </span>
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        placement.gamesOnIL >= IL_RULES.MIN_GAMES_PER_PLACEMENT
                          ? 'active'
                          : 'delinquent'
                      }
                      className="text-xs"
                    >
                      {placement.gamesOnIL >= IL_RULES.MIN_GAMES_PER_PLACEMENT ? 'Valid' : 'Short'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {teamData.totalPlacements === 0 && (
            <div className="p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-muted-foreground">No IL placements recorded</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function InjuredListPage() {
  const { isAuthenticated, user } = useAuth();
  const [placements, setPlacements] = useState<ILPlacement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'compliant' | 'non-compliant'>('all');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentGame, setCurrentGame] = useState(10);

  // Load placements from localStorage on mount
  useEffect(() => {
    const stored = loadPlacements();
    setPlacements(stored);
  }, []);

  // Save placements to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
      savePlacements(placements);
    }
  }, [placements, isLoaded]);

  const isAdmin = user?.isAdmin ?? false;
  const userTeamId = user?.teamId;

  // Webhook settings
  const [webhookSettings, setWebhookSettings] = useState<WebhookSettings>({
    discordWebhookUrl: '',
    autoPostToDiscord: false,
    announcementStyle: 'espn',
  });

  // Announcement state
  const [showAnnouncementPreview, setShowAnnouncementPreview] = useState(false);
  const [pendingAnnouncement, setPendingAnnouncement] = useState('');
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);

  // Auto-expand user's team on load
  useEffect(() => {
    if (userTeamId && !isAdmin) {
      setExpandedTeams(new Set([userTeamId]));
    }
  }, [userTeamId, isAdmin]);

  // Load settings from localStorage
  useEffect(() => {
    setIsLoaded(true);
    const storedSettings = localStorage.getItem(STORAGE_KEYS.WEBHOOK_SETTINGS);
    if (storedSettings) {
      try {
        setWebhookSettings(JSON.parse(storedSettings));
      } catch {}
    }
  }, []);

  // Save settings to localStorage
  const handleSaveSettings = (settings: WebhookSettings) => {
    setWebhookSettings(settings);
    localStorage.setItem(STORAGE_KEYS.WEBHOOK_SETTINGS, JSON.stringify(settings));
  };

  // Update gamesOnIL for active placements based on current game
  useEffect(() => {
    setPlacements((prev) =>
      prev.map((p) => {
        if (p.status === 'active') {
          return { ...p, gamesOnIL: Math.max(0, currentGame - p.startGame + 1) };
        }
        return p;
      })
    );
  }, [currentGame]);

  const teamData = useMemo(() => {
    return allTeams.map((team) => calculateTeamCompliance(team.id, placements));
  }, [placements]);

  // Sort teams: user's team first, then alphabetically
  const sortedTeamData = useMemo(() => {
    return [...teamData].sort((a, b) => {
      if (a.id === userTeamId) return -1;
      if (b.id === userTeamId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [teamData, userTeamId]);

  const filteredTeams = useMemo(() => {
    return sortedTeamData.filter((team) => {
      const matchesSearch =
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.abbreviation.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (filterStatus === 'compliant') matchesStatus = team.isCompliant;
      if (filterStatus === 'non-compliant') matchesStatus = !team.isCompliant;

      return matchesSearch && matchesStatus;
    });
  }, [sortedTeamData, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const compliant = teamData.filter((t) => t.isCompliant).length;
    const nonCompliant = teamData.length - compliant;
    const totalPlacements = placements.length;
    const activePlacements = placements.filter((p) => p.status === 'active').length;
    return { compliant, nonCompliant, totalPlacements, activePlacements };
  }, [teamData, placements]);

  const userTeamData = useMemo(() => {
    return teamData.find((t) => t.id === userTeamId);
  }, [teamData, userTeamId]);

  const toggleTeam = (teamId: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

  const handleAddPlacement = useCallback(
    async (
      newPlacement: Omit<ILPlacement, 'id' | 'gamesOnIL' | 'status'>,
      showAnnouncement: boolean
    ) => {
      const placement: ILPlacement = {
        ...newPlacement,
        id: `il-${Date.now()}`,
        gamesOnIL: Math.max(0, currentGame - newPlacement.startGame + 1),
        status: 'active',
      };
      setPlacements((prev) => [...prev, placement]);

      // Generate announcement
      const team = allTeams.find((t) => t.id === newPlacement.teamId);
      if (team && showAnnouncement) {
        const announcement =
          webhookSettings.announcementStyle === 'espn'
            ? generateESPNAnnouncement('placement', placement, team.name, team.abbreviation)
            : generateSimpleAnnouncement('placement', placement, team.name);

        if (webhookSettings.autoPostToDiscord && webhookSettings.discordWebhookUrl) {
          await postToDiscord(webhookSettings.discordWebhookUrl, announcement);
        }

        setPendingAnnouncement(announcement);
        setShowAnnouncementPreview(true);
      }
    },
    [currentGame, webhookSettings]
  );

  const handleActivatePlayer = useCallback(
    async (placementId: string, endGame: number) => {
      let activatedPlacement: ILPlacement | null = null;

      setPlacements((prev) =>
        prev.map((p) => {
          if (p.id === placementId) {
            const gamesOnIL = endGame - p.startGame + 1;
            activatedPlacement = {
              ...p,
              status: 'completed',
              endGame,
              endDate: new Date().toISOString().split('T')[0],
              gamesOnIL,
            };
            return activatedPlacement;
          }
          return p;
        })
      );

      // Generate activation announcement
      if (activatedPlacement) {
        const team = allTeams.find((t) => t.id === activatedPlacement!.teamId);
        if (team) {
          const announcement =
            webhookSettings.announcementStyle === 'espn'
              ? generateESPNAnnouncement('activation', activatedPlacement, team.name, team.abbreviation)
              : generateSimpleAnnouncement('activation', activatedPlacement, team.name);

          if (webhookSettings.autoPostToDiscord && webhookSettings.discordWebhookUrl) {
            await postToDiscord(webhookSettings.discordWebhookUrl, announcement);
          }

          setPendingAnnouncement(announcement);
          setShowAnnouncementPreview(true);
        }
      }
    },
    [webhookSettings]
  );

  const handlePostAnnouncement = async () => {
    if (!webhookSettings.discordWebhookUrl || !pendingAnnouncement) return;
    setIsPostingAnnouncement(true);
    const success = await postToDiscord(webhookSettings.discordWebhookUrl, pendingAnnouncement);
    setIsPostingAnnouncement(false);
    if (success) {
      setShowAnnouncementPreview(false);
    }
  };

  const handleCopyAnnouncement = () => {
    navigator.clipboard.writeText(pendingAnnouncement);
  };

  const exportData = () => {
    const data = {
      exportDate: new Date().toISOString(),
      teams: teamData,
      placements,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JKAP_IL_Data_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-jkap-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-jkap-red-500" />
          </div>
          <h1 className="font-display text-3xl text-foreground mb-2">ACCESS REQUIRED</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to access the Injured List Manager.
          </p>
          <Button as="link" href="/login" variant="primary">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/tools"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Tools</span>
              </Link>
              <div className="h-6 w-px bg-border hidden sm:block" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-display text-xl text-foreground">INJURED LIST MANAGER</h1>
                  <p className="text-xs text-muted-foreground">
                    {isAdmin ? 'Commissioner View - All Teams' : `Managing ${user?.teamName || 'Your Team'}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Current Game Tracker */}
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Game</span>
                <input
                  type="number"
                  value={currentGame}
                  onChange={(e) => setCurrentGame(parseInt(e.target.value) || 1)}
                  className="w-14 px-2 py-1 bg-background border border-border rounded text-sm text-foreground text-center focus:border-jkap-red-500 focus:outline-none"
                  min={1}
                />
              </div>

              {/* Admin-only settings button */}
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => setShowSettingsModal(true)}>
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              {isAdmin && (
                <Button variant="secondary" size="sm" onClick={exportData}>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4" />
                Add Placement
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User's Team Summary Card (non-admin only) */}
        {!isAdmin && userTeamData && (
          <div
            className={`mb-8 transition-all duration-700 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <Card className="p-6 border-2 border-jkap-red-500/50 bg-gradient-to-br from-jkap-red-500/5 to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-jkap-red-500 to-jkap-red-600 flex items-center justify-center font-display text-white text-xl">
                    {userTeamData.abbreviation}
                  </div>
                  <div>
                    <h2 className="font-display text-2xl text-foreground">{userTeamData.name}</h2>
                    <p className="text-muted-foreground">Your Team IL Status</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {userTeamData.isCompliant ? (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="font-medium text-emerald-400">Compliant</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                      <span className="font-medium text-amber-400">
                        {userTeamData.complianceIssues.length} Issue{userTeamData.complianceIssues.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">
                      {userTeamData.completedPlacements.length}/{IL_RULES.MIN_PLACEMENTS_PER_SEASON}
                    </p>
                    <p className="text-xs text-muted-foreground">IL Stints Completed</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Stats Grid (admin view) */}
        {isAdmin && (
          <div
            className={`grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 transition-all duration-700 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{stats.totalPlacements}</p>
              <p className="text-sm text-muted-foreground">Total Placements</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-emerald-400">{stats.activePlacements}</p>
              <p className="text-sm text-muted-foreground">Currently on IL</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-emerald-400">{stats.compliant}</p>
              <p className="text-sm text-muted-foreground">Teams Compliant</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-400">{stats.nonCompliant}</p>
              <p className="text-sm text-muted-foreground">Need Attention</p>
            </Card>
          </div>
        )}

        <div
          className={`mb-8 transition-all duration-700 delay-100 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <RulesCard />
        </div>

        <div
          className={`flex flex-col sm:flex-row gap-4 mb-6 transition-all duration-700 delay-200 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:border-jkap-red-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'compliant', 'non-compliant'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as typeof filterStatus)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-jkap-red-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {status === 'all' ? 'All Teams' : status === 'compliant' ? 'Compliant' : 'Non-Compliant'}
              </button>
            ))}
          </div>
        </div>

        {/* View-only notice for non-admins */}
        {!isAdmin && (
          <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-400" />
            <p className="text-sm text-blue-400">
              You can view all teams but can only manage your own team ({user?.teamAbbreviation})
            </p>
          </div>
        )}

        <div className="space-y-4">
          {filteredTeams.map((team, index) => (
            <div
              key={team.id}
              className={`transition-all duration-500 ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <TeamCard
                teamData={team}
                onActivate={handleActivatePlayer}
                isExpanded={expandedTeams.has(team.id)}
                onToggle={() => toggleTeam(team.id)}
                currentGame={currentGame}
                canEdit={isAdmin || team.id === userTeamId}
                isUserTeam={team.id === userTeamId}
              />
            </div>
          ))}
        </div>
      </main>

      {/* Modals */}
      <AddPlacementModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddPlacement}
        userTeamId={userTeamId}
        isAdmin={isAdmin}
      />

      {isAdmin && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          settings={webhookSettings}
          onSave={handleSaveSettings}
        />
      )}

      <AnnouncementPreview
        isOpen={showAnnouncementPreview}
        onClose={() => setShowAnnouncementPreview(false)}
        announcement={pendingAnnouncement}
        onPost={handlePostAnnouncement}
        onCopy={handleCopyAnnouncement}
        isPosting={isPostingAnnouncement}
        hasWebhook={!!webhookSettings.discordWebhookUrl}
      />
    </div>
  );
}

