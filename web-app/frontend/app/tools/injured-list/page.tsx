'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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
  Facebook,
  Share2,
  Timer,
  Megaphone,
  ExternalLink,
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
// MOCK DATA
// =============================================================================

const allTeams: { id: string; name: string; abbreviation: string }[] = [
  { id: 'ari', name: 'Arizona Diamondbacks', abbreviation: 'ARI' },
  { id: 'atl', name: 'Atlanta Braves', abbreviation: 'ATL' },
  { id: 'bal', name: 'Baltimore Orioles', abbreviation: 'BAL' },
  { id: 'bos', name: 'Boston Red Sox', abbreviation: 'BOS' },
  { id: 'chc', name: 'Chicago Cubs', abbreviation: 'CHC' },
  { id: 'cws', name: 'Chicago White Sox', abbreviation: 'CWS' },
  { id: 'cin', name: 'Cincinnati Reds', abbreviation: 'CIN' },
  { id: 'cle', name: 'Cleveland Guardians', abbreviation: 'CLE' },
  { id: 'col', name: 'Colorado Rockies', abbreviation: 'COL' },
  { id: 'det', name: 'Detroit Tigers', abbreviation: 'DET' },
  { id: 'hou', name: 'Houston Astros', abbreviation: 'HOU' },
  { id: 'kc', name: 'Kansas City Royals', abbreviation: 'KC' },
  { id: 'laa', name: 'Los Angeles Angels', abbreviation: 'LAA' },
  { id: 'lad', name: 'Los Angeles Dodgers', abbreviation: 'LAD' },
  { id: 'mia', name: 'Miami Marlins', abbreviation: 'MIA' },
  { id: 'mil', name: 'Milwaukee Brewers', abbreviation: 'MIL' },
  { id: 'min', name: 'Minnesota Twins', abbreviation: 'MIN' },
  { id: 'nym', name: 'New York Mets', abbreviation: 'NYM' },
  { id: 'nyy', name: 'New York Yankees', abbreviation: 'NYY' },
  { id: 'oak', name: 'Oakland Athletics', abbreviation: 'OAK' },
  { id: 'phi', name: 'Philadelphia Phillies', abbreviation: 'PHI' },
  { id: 'pit', name: 'Pittsburgh Pirates', abbreviation: 'PIT' },
  { id: 'sd', name: 'San Diego Padres', abbreviation: 'SD' },
  { id: 'sf', name: 'San Francisco Giants', abbreviation: 'SF' },
  { id: 'sea', name: 'Seattle Mariners', abbreviation: 'SEA' },
  { id: 'stl', name: 'St. Louis Cardinals', abbreviation: 'STL' },
  { id: 'tb', name: 'Tampa Bay Rays', abbreviation: 'TB' },
  { id: 'tex', name: 'Texas Rangers', abbreviation: 'TEX' },
  { id: 'tor', name: 'Toronto Blue Jays', abbreviation: 'TOR' },
  { id: 'wsh', name: 'Washington Nationals', abbreviation: 'WSH' },
];

// Sample IL placements for demo
const samplePlacements: ILPlacement[] = [
  {
    id: 'il-001',
    player: { id: 'p1', name: 'Zack Wheeler', position: 'SP', type: 'pitcher' },
    teamId: 'phi',
    startDate: '2026-01-01',
    startGame: 1,
    gamesOnIL: 8,
    endDate: '2026-01-10',
    endGame: 8,
    injury: 'Shoulder Strain',
    status: 'completed',
  },
  {
    id: 'il-002',
    player: { id: 'p2', name: 'Bryce Harper', position: 'RF', type: 'position' },
    teamId: 'phi',
    startDate: '2026-01-05',
    startGame: 5,
    gamesOnIL: 6,
    endDate: '2026-01-12',
    endGame: 10,
    injury: 'Hamstring Tightness',
    status: 'completed',
  },
  {
    id: 'il-003',
    player: { id: 'p3', name: 'Kyle Schwarber', position: 'LF', type: 'position' },
    teamId: 'phi',
    startDate: '2026-01-03',
    startGame: 3,
    gamesOnIL: 4,
    injury: 'Back Spasms',
    status: 'active',
  },
  {
    id: 'il-004',
    player: { id: 'p4', name: 'Aaron Judge', position: 'RF', type: 'position' },
    teamId: 'nyy',
    startDate: '2026-01-02',
    startGame: 2,
    gamesOnIL: 7,
    endDate: '2026-01-09',
    endGame: 8,
    injury: 'Oblique Strain',
    status: 'completed',
  },
  {
    id: 'il-005',
    player: { id: 'p5', name: 'Gerrit Cole', position: 'SP', type: 'pitcher' },
    teamId: 'nyy',
    startDate: '2026-01-04',
    startGame: 4,
    gamesOnIL: 5,
    injury: 'Elbow Inflammation',
    status: 'active',
  },
  {
    id: 'il-006',
    player: { id: 'p6', name: 'Ronald Acuna Jr', position: 'RF', type: 'position' },
    teamId: 'atl',
    startDate: '2026-01-01',
    startGame: 1,
    gamesOnIL: 10,
    endDate: '2026-01-12',
    endGame: 10,
    injury: 'Knee Soreness',
    status: 'completed',
  },
];

// =============================================================================
// CONSTANTS - IL RULES
// =============================================================================

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

function getGamesRemaining(placement: ILPlacement): number {
  if (placement.status === 'completed') return 0;
  const gamesNeeded = IL_RULES.MIN_GAMES_PER_PLACEMENT;
  const remaining = gamesNeeded - placement.gamesOnIL;
  return Math.max(0, remaining);
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
                  <Clock className="w-4 h-4 animate-spin" />
                ) : testStatus === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : testStatus === 'error' ? (
                  <X className="w-4 h-4 text-red-400" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Test
              </Button>
            </div>
          </div>

          {/* Auto-post toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium text-foreground">Auto-post to Discord</p>
              <p className="text-xs text-muted-foreground">
                Automatically announce IL moves when added/activated
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
                localSettings.autoPostToDiscord ? 'bg-emerald-500' : 'bg-muted'
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
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLocalSettings({ ...localSettings, announcementStyle: 'espn' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  localSettings.announcementStyle === 'espn'
                    ? 'border-jkap-red-500 bg-jkap-red-500/10'
                    : 'border-border hover:border-border-light'
                }`}
              >
                <p className="font-semibold text-foreground">ESPN Style</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Full announcement with emojis, hashtags, and details
                </p>
              </button>
              <button
                onClick={() => setLocalSettings({ ...localSettings, announcementStyle: 'simple' })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  localSettings.announcementStyle === 'simple'
                    ? 'border-jkap-red-500 bg-jkap-red-500/10'
                    : 'border-border hover:border-border-light'
                }`}
              >
                <p className="font-semibold text-foreground">Simple</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clean one-line transaction notice
                </p>
              </button>
            </div>
          </div>

          {/* Facebook Note */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Facebook className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-blue-400">Facebook Posting</span>
            </div>
            <p className="text-xs text-muted-foreground">
              For Facebook, use the "Copy Announcement" button when making IL moves. 
              You can then paste directly into your Facebook group. 
              Full Facebook API integration coming soon!
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} fullWidth>
              <Check className="w-4 h-4" />
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
  onPost: () => Promise<void>;
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
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          {/* Preview */}
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">
              {announcement}
            </pre>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={handleCopy} fullWidth>
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy for Facebook
                </>
              )}
            </Button>
            <Button
              variant="primary"
              onClick={onPost}
              disabled={!hasWebhook || isPosting}
              fullWidth
            >
              {isPosting ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  Post to Discord
                </>
              )}
            </Button>
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
  teams: typeof allTeams;
}

function AddPlacementModal({ isOpen, onClose, onAdd, teams }: AddPlacementModalProps) {
  const [selectedTeam, setSelectedTeam] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [position, setPosition] = useState('');
  const [playerType, setPlayerType] = useState<'pitcher' | 'position'>('position');
  const [injury, setInjury] = useState('');
  const [startGame, setStartGame] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [announceOnAdd, setAnnounceOnAdd] = useState(true);

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

    setSelectedTeam('');
    setPlayerName('');
    setPosition('');
    setPlayerType('position');
    setInjury('');
    setStartGame(1);
    onClose();
  };

  if (!isOpen) return null;

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
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Team</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:border-jkap-red-500 focus:outline-none"
              required
            >
              <option value="">Select a team...</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

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
}

function TeamCard({ teamData, onActivate, isExpanded, onToggle, currentGame }: TeamCardProps) {
  const [activateGameInput, setActivateGameInput] = useState<{ [key: string]: number }>({});

  return (
    <Card
      className={`overflow-hidden transition-all ${
        !teamData.isCompliant ? 'border-amber-500/50' : ''
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-jkap-navy-600 flex items-center justify-center font-display text-white">
            {teamData.abbreviation}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">{teamData.name}</h3>
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
          <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {teamData.completedPlacements.length}/{IL_RULES.MIN_PLACEMENTS_PER_SEASON}
              </p>
              <p className="text-xs text-muted-foreground">Required Stints</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{teamData.pitcherPlacements}</p>
              <p className="text-xs text-muted-foreground">Pitcher Stints</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{teamData.positionPlacements}</p>
              <p className="text-xs text-muted-foreground">Position Stints</p>
            </div>
            <div className="text-center">
              <p
                className={`text-2xl font-bold ${
                  teamData.penaltyLosses > 0 ? 'text-jkap-red-500' : 'text-emerald-400'
                }`}
              >
                {teamData.penaltyLosses > 0 ? `+${teamData.penaltyLosses}` : '0'}
              </p>
              <p className="text-xs text-muted-foreground">Penalty Losses</p>
            </div>
          </div>

          {teamData.complianceIssues.length > 0 && (
            <div className="p-4 bg-amber-500/10 border-y border-amber-500/30">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400">Compliance Issues</span>
              </div>
              <ul className="space-y-1">
                {teamData.complianceIssues.map((issue, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                    <XCircle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {teamData.activePlacements.length > 0 && (
            <div className="p-4 border-b border-border">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Active IL ({teamData.activePlacements.length})
              </h4>
              <div className="space-y-3">
                {teamData.activePlacements.map((placement) => {
                  const gamesRemaining = getGamesRemaining(placement);
                  const canActivate = gamesRemaining === 0;

                  return (
                    <div
                      key={placement.id}
                      className="p-4 bg-muted/50 rounded-lg border border-border"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold ${
                              placement.player.type === 'pitcher'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {placement.player.position}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{placement.player.name}</p>
                            <p className="text-sm text-muted-foreground">{placement.injury}</p>
                          </div>
                        </div>

                        {/* Games Remaining Badge */}
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                            canActivate
                              ? 'bg-emerald-500/20 border border-emerald-500/30'
                              : 'bg-amber-500/20 border border-amber-500/30'
                          }`}
                        >
                          <Timer className={`w-4 h-4 ${canActivate ? 'text-emerald-400' : 'text-amber-400'}`} />
                          <div className="text-right">
                            <p className={`text-lg font-bold ${canActivate ? 'text-emerald-400' : 'text-amber-400'}`}>
                              {gamesRemaining > 0 ? gamesRemaining : '✓'}
                            </p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {gamesRemaining > 0 ? 'Games Left' : 'Eligible'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Game {placement.startGame}</span>
                          <span>
                            {placement.gamesOnIL} / {IL_RULES.MIN_GAMES_PER_PLACEMENT} games
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              canActivate ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                (placement.gamesOnIL / IL_RULES.MIN_GAMES_PER_PLACEMENT) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Activate Controls */}
                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground block mb-1">
                            Activate at Game #
                          </label>
                          <input
                            type="number"
                            placeholder={`Min: ${placement.startGame + IL_RULES.MIN_GAMES_PER_PLACEMENT - 1}`}
                            value={activateGameInput[placement.id] || ''}
                            onChange={(e) =>
                              setActivateGameInput({
                                ...activateGameInput,
                                [placement.id]: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm text-foreground focus:border-jkap-red-500 focus:outline-none"
                            min={placement.startGame + IL_RULES.MIN_GAMES_PER_PLACEMENT - 1}
                          />
                        </div>
                        <Button
                          variant={canActivate ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => {
                            const endGame = activateGameInput[placement.id];
                            if (endGame) onActivate(placement.id, endGame);
                          }}
                          disabled={!activateGameInput[placement.id]}
                          className="mt-5"
                        >
                          <Check className="w-4 h-4" />
                          Activate
                        </Button>
                      </div>

                      {!canActivate && (
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
  const [placements, setPlacements] = useState<ILPlacement[]>(samplePlacements);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'compliant' | 'non-compliant'>('all');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentGame, setCurrentGame] = useState(10); // Track current season game number

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

  const filteredTeams = useMemo(() => {
    return teamData.filter((team) => {
      const matchesSearch =
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.abbreviation.toLowerCase().includes(searchTerm.toLowerCase());

      let matchesStatus = true;
      if (filterStatus === 'compliant') matchesStatus = team.isCompliant;
      if (filterStatus === 'non-compliant') matchesStatus = !team.isCompliant;

      return matchesSearch && matchesStatus;
    });
  }, [teamData, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const compliant = teamData.filter((t) => t.isCompliant).length;
    const nonCompliant = teamData.length - compliant;
    const totalPlacements = placements.length;
    const activePlacements = placements.filter((p) => p.status === 'active').length;
    return { compliant, nonCompliant, totalPlacements, activePlacements };
  }, [teamData, placements]);

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/tools"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Back to Tools</span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-display text-xl text-foreground">INJURED LIST MANAGER</h1>
                  <p className="text-xs text-muted-foreground">
                    Track IL compliance across all teams
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
              {user?.isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => setShowSettingsModal(true)}>
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={exportData}>
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4" />
                Add Placement
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search teams..."
              className="w-full pl-11 pr-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:border-jkap-red-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                filterStatus === 'all'
                  ? 'bg-jkap-red-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              All Teams
            </button>
            <button
              onClick={() => setFilterStatus('compliant')}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                filterStatus === 'compliant'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              Compliant
            </button>
            <button
              onClick={() => setFilterStatus('non-compliant')}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                filterStatus === 'non-compliant'
                  ? 'bg-amber-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Issues
            </button>
          </div>
        </div>

        <div
          className={`space-y-4 transition-all duration-700 delay-300 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {filteredTeams.map((team) => (
            <TeamCard
              key={team.id}
              teamData={team}
              onActivate={handleActivatePlayer}
              isExpanded={expandedTeams.has(team.id)}
              onToggle={() => toggleTeam(team.id)}
              currentGame={currentGame}
            />
          ))}

          {filteredTeams.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No teams match your search</p>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <AddPlacementModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddPlacement}
        teams={allTeams}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={webhookSettings}
        onSave={handleSaveSettings}
      />

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
