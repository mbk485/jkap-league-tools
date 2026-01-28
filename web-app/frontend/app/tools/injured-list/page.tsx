'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MLB_TEAMS } from '@/types/league';
import {
  getILPlacements,
  addILPlacement,
  updateILPlacement,
  getLeagueSettings,
  saveLeagueSettings,
  DBILPlacement,
  submitRetroactiveILRequest,
  getTeamRetroactiveILRequests,
  RetroactiveILRequest,
} from '@/lib/supabase';
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
  Loader2,
  CalendarClock,
  History,
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

// ESPN-style reporters for rotation
const ESPN_REPORTERS = [
  'JeffPassan',
  'Buster_ESPN', 
  'KRavechESPN',
  'JonMorosi',
  'Ken_Rosenthal',
];

// Manager quotes for IL placements (disappointed/cautious tone)
const MANAGER_QUOTES_PLACEMENT = [
  "We're going to be cautious with this one. No need to rush him back.",
  "It's tough to lose him, but we've got guys ready to step up.",
  "We're hopeful it's nothing long-term. Just need to give him some time.",
  "Next man up. That's the mentality we have in this clubhouse.",
  "We've got to be smart here. His health comes first.",
  "It's a blow, no question. But we'll find a way to get it done.",
  "We're being proactive. Don't want to make it worse.",
  "Frustrating timing, but these things happen over a long season.",
];

// Manager quotes for IL activations (optimistic/excited tone)
const MANAGER_QUOTES_ACTIVATION = [
  "He looked great in his work. Ready to go.",
  "Having him back in the lineup is huge for us.",
  "He's been chomping at the bit to get back out there.",
  "We're excited to have him back. He's a big part of what we do.",
  "He's healthy and ready to contribute. That's all we can ask.",
  "Getting him back gives us a real boost down the stretch.",
  "He came through everything with flying colors. Good to go.",
  "The energy in the clubhouse picked up when he walked in today.",
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Get team nickname for natural reading (e.g., "D-backs", "Yanks", "Sox")
function getTeamNickname(teamName: string): string {
  const nicknames: Record<string, string> = {
    'Arizona Diamondbacks': 'D-backs',
    'Atlanta Braves': 'Braves',
    'Baltimore Orioles': 'Orioles',
    'Boston Red Sox': 'Red Sox',
    'Chicago Cubs': 'Cubs',
    'Chicago White Sox': 'White Sox',
    'Cincinnati Reds': 'Reds',
    'Cleveland Guardians': 'Guardians',
    'Colorado Rockies': 'Rockies',
    'Detroit Tigers': 'Tigers',
    'Houston Astros': 'Astros',
    'Kansas City Royals': 'Royals',
    'Los Angeles Angels': 'Angels',
    'Los Angeles Dodgers': 'Dodgers',
    'Miami Marlins': 'Marlins',
    'Milwaukee Brewers': 'Brewers',
    'Minnesota Twins': 'Twins',
    'New York Mets': 'Mets',
    'New York Yankees': 'Yankees',
    'Oakland Athletics': 'Athletics',
    'Philadelphia Phillies': 'Phillies',
    'Pittsburgh Pirates': 'Pirates',
    'San Diego Padres': 'Padres',
    'San Francisco Giants': 'Giants',
    'Seattle Mariners': 'Mariners',
    'St. Louis Cardinals': 'Cardinals',
    'Tampa Bay Rays': 'Rays',
    'Texas Rangers': 'Rangers',
    'Toronto Blue Jays': 'Blue Jays',
    'Washington Nationals': 'Nationals',
  };
  return nicknames[teamName] || teamName;
}

function generateESPNAnnouncement(
  type: 'placement' | 'activation',
  placement: ILPlacement,
  teamName: string,
  teamAbbr: string
): string {
  const reporter = getRandomItem(ESPN_REPORTERS);
  const nickname = getTeamNickname(teamName);
  const minGames = IL_RULES.MIN_GAMES_PER_PLACEMENT;
  const managerQuote = type === 'placement' 
    ? getRandomItem(MANAGER_QUOTES_PLACEMENT)
    : getRandomItem(MANAGER_QUOTES_ACTIVATION);
  
  if (type === 'placement') {
    // Variety of placement announcement styles - natural ESPN feel
    const templates = [
      // Breaking news style
      `🚨 BREAKING: The ${teamName} are placing ${placement.player.name} on the injured list with ${placement.injury.toLowerCase()}, sources tell @${reporter}.

"${managerQuote}" — ${nickname} manager

He's expected to miss a minimum of ${minGames} games.`,

      // Transaction wire style
      `⚾ TRANSACTION | ${teamAbbr}

${placement.player.name} (${placement.player.position}) → Injured List
Dealing with ${placement.injury.toLowerCase()}

"${managerQuote}"`,

      // News report style
      `⚾ The ${nickname} are placing ${placement.player.position} ${placement.player.name} on the IL with ${placement.injury.toLowerCase()}.

He'll be sidelined for at least ${minGames} games.

"${managerQuote}" — ${nickname} manager`,

      // Reporter tweet style
      `⚾ Source: ${placement.player.name} is heading to the injured list for the ${nickname}. ${placement.injury}. Looking at a minimum ${minGames}-game absence.

"${managerQuote}"`,

      // Short and clean
      `🏥 IL UPDATE: ${teamName} place ${placement.player.name} on the injured list.

${placement.injury.toLowerCase()} — out at least ${minGames} games.

"${managerQuote}"`,
    ];
    
    return `${getRandomItem(templates)}\n\n— JKAP Memorial League`;
  } else {
    // Variety of activation announcement styles - natural ESPN feel
    const templates = [
      // Good news style
      `✅ ROSTER MOVE: The ${teamName} have activated ${placement.player.name} from the injured list.

The ${placement.player.position} missed ${placement.gamesOnIL} games and is expected in the lineup tonight.

"${managerQuote}" — ${nickname} manager`,

      // He's back style
      `⚾ He's back. ${placement.player.name} has been activated from the IL.

The ${nickname} get their ${placement.player.position} back after missing ${placement.gamesOnIL} games.

"${managerQuote}"`,

      // Transaction wire style
      `✅ TRANSACTION | ${teamAbbr}

${placement.player.name} (${placement.player.position}) activated from IL
Missed ${placement.gamesOnIL} games

"${managerQuote}"`,

      // News style
      `⚾ ${placement.player.name} is back on the ${nickname} active roster after ${placement.gamesOnIL} games on the shelf.

"${managerQuote}" — ${nickname} manager`,

      // Simple and clean
      `✅ The ${teamName} have activated ${placement.player.name} from the injured list.

The ${placement.player.position} returns after a ${placement.gamesOnIL}-game absence.

"${managerQuote}"`,
    ];
    
    return `${getRandomItem(templates)}\n\n— JKAP Memorial League`;
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

async function postToDiscord(webhookUrl: string, message: string): Promise<{ success: boolean; error?: string }> {
  console.log('[IL Manager] Attempting to post to Discord...');
  console.log('[IL Manager] Webhook URL:', webhookUrl ? 'SET' : 'NOT SET');
  
  if (!webhookUrl) {
    console.error('[IL Manager] No webhook URL provided');
    return { success: false, error: 'No webhook URL configured' };
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message,
        username: 'JKAP Transaction Wire',
        avatar_url: 'https://i.imgur.com/JN8RfHQ.png', // Baseball icon
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[IL Manager] Discord webhook failed:', response.status, errorText);
      return { success: false, error: `Discord error: ${response.status}` };
    }
    
    console.log('[IL Manager] Successfully posted to Discord!');
    return { success: true };
  } catch (error) {
    console.error('[IL Manager] Discord webhook error:', error);
    return { success: false, error: 'Network error posting to Discord' };
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
    const result = await postToDiscord(
      localSettings.discordWebhookUrl,
      '⚾ **Test Message** - JKAP Transaction Wire is connected and ready to broadcast IL moves!\n\n— JKAP Memorial League'
    );
    setTestStatus(result.success ? 'success' : 'error');
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
  const { user } = useAuth();
  const [selectedTeam, setSelectedTeam] = useState(userTeamId || '');
  const [playerName, setPlayerName] = useState('');
  const [position, setPosition] = useState('');
  const [playerType, setPlayerType] = useState<'pitcher' | 'position'>('position');
  const [injury, setInjury] = useState('');
  const [startGame, setStartGame] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [announceOnAdd, setAnnounceOnAdd] = useState(true);
  
  // Retroactive placement state
  const [retroactiveReason, setRetroactiveReason] = useState('');
  const [isSubmittingRetro, setIsSubmittingRetro] = useState(false);
  const [retroSubmitResult, setRetroSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  // Check if the selected date is in the past
  const today = new Date().toISOString().split('T')[0];
  const isRetroactive = startDate < today;

  // Reset to user's team when modal opens
  useEffect(() => {
    if (isOpen && userTeamId && !isAdmin) {
      setSelectedTeam(userTeamId);
    }
    // Clear retroactive state when modal opens
    if (isOpen) {
      setRetroactiveReason('');
      setRetroSubmitResult(null);
    }
  }, [isOpen, userTeamId, isAdmin]);

  const positions = ['SP', 'RP', 'CP', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam || !playerName || !position || !injury) return;
    
    // If retroactive and not admin, submit as request
    if (isRetroactive && !isAdmin) {
      if (!retroactiveReason.trim()) {
        setRetroSubmitResult({ success: false, message: 'Please provide a reason for the retroactive placement.' });
        return;
      }
      
      setIsSubmittingRetro(true);
      
      const teamInfo = allTeams.find(t => t.id === selectedTeam);
      
      submitRetroactiveILRequest({
        team_id: selectedTeam,
        team_name: teamInfo?.name || selectedTeam,
        player_id: `player-${Date.now()}`,
        player_name: playerName,
        player_position: position,
        player_type: playerType,
        injury_type: injury,
        requested_start_date: startDate,
        requested_start_game: startGame,
        reason: retroactiveReason,
        requested_by: user?.id || '',
        requested_by_name: user?.displayName || user?.username || 'Unknown',
      });
      
      setRetroSubmitResult({ 
        success: true, 
        message: 'Retroactive IL request submitted! A commissioner will review and approve it.' 
      });
      
      setIsSubmittingRetro(false);
      
      // Clear form after short delay
      setTimeout(() => {
        setPlayerName('');
        setPosition('');
        setPlayerType('position');
        setInjury('');
        setStartGame(1);
        setStartDate(new Date().toISOString().split('T')[0]);
        setRetroactiveReason('');
        setRetroSubmitResult(null);
        onClose();
      }, 2000);
      
      return;
    }

    // Normal placement (today or future, or admin doing retroactive)
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
    setStartDate(new Date().toISOString().split('T')[0]);
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

          {/* Retroactive Placement Warning & Reason */}
          {isRetroactive && !isAdmin && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-amber-400" />
                <p className="font-medium text-amber-400 text-sm">Retroactive Placement</p>
              </div>
              <p className="text-xs text-muted-foreground">
                The date you selected ({startDate}) is in the past. Retroactive IL placements require commissioner approval.
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reason for Retroactive Placement *
                </label>
                <textarea
                  value={retroactiveReason}
                  onChange={(e) => setRetroactiveReason(e.target.value)}
                  placeholder="Explain why this placement needs to be backdated (e.g., 'Forgot to log it on game day', 'Player was injured last week but just reported it')..."
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder-muted-foreground focus:border-amber-500 focus:outline-none resize-none"
                  rows={3}
                  required
                />
              </div>
              {retroSubmitResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  retroSubmitResult.success 
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  {retroSubmitResult.message}
                </div>
              )}
            </div>
          )}
          
          {isRetroactive && isAdmin && (
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <p className="font-medium text-purple-400 text-sm">Admin: Direct Retroactive Placement</p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                As commissioner, you can add retroactive placements directly without approval.
              </p>
            </div>
          )}

          {/* Announcement Toggle - only show for non-retroactive or admin */}
          {(!isRetroactive || isAdmin) && (
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
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant={isRetroactive && !isAdmin ? 'outline' : 'primary'} 
              fullWidth
              disabled={isSubmittingRetro}
              className={isRetroactive && !isAdmin ? 'border-amber-500 text-amber-400 hover:bg-amber-500/10' : ''}
            >
              {isSubmittingRetro ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRetroactive && !isAdmin ? (
                <>
                  <History className="w-4 h-4" />
                  Submit for Approval
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add to IL
                </>
              )}
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
  onLogGame: (placementId: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
  currentGame: number;
  canEdit: boolean;
  isUserTeam: boolean;
}

function TeamCard({ teamData, onActivate, onLogGame, isExpanded, onToggle, currentGame, canEdit, isUserTeam }: TeamCardProps) {
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

                      {/* Game Tracking & Activate Controls - Only show if can edit */}
                      {canEdit && (
                        <div className="space-y-3 pt-3 border-t border-border/50">
                          {/* Log Game Button */}
                          <div className="flex items-center justify-between p-3 bg-blue-500/5 rounded-lg border border-blue-500/20">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4 text-blue-400" />
                              <span className="text-sm text-foreground">Track Games Played</span>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => onLogGame(placement.id)}
                              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/30"
                            >
                              <Plus className="w-4 h-4" />
                              Log Game (+1)
                            </Button>
                          </div>

                          {/* Activate Controls */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <label className="text-xs text-muted-foreground block mb-1">
                                Ending Game # (when activating)
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
  const [isLoadingPlacements, setIsLoadingPlacements] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentGame, setCurrentGame] = useState(10);

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

  // Convert DB placement to UI placement format
  const convertDBToUI = (dbPlacement: DBILPlacement): ILPlacement => ({
    id: dbPlacement.id,
    player: {
      id: dbPlacement.player_id,
      name: dbPlacement.player_name,
      position: dbPlacement.player_position,
      type: dbPlacement.player_type as 'pitcher' | 'position',
    },
    teamId: dbPlacement.team_id,
    startDate: dbPlacement.start_date,
    startGame: dbPlacement.start_game,
    endDate: dbPlacement.end_date || undefined,
    endGame: dbPlacement.end_game || undefined,
    gamesOnIL: dbPlacement.games_on_il,
    injury: dbPlacement.injury_type,
    status: dbPlacement.status as 'active' | 'completed',
  });

  // Load placements and settings from Supabase
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingPlacements(true);
      try {
        // Load placements from Supabase
        const dbPlacements = await getILPlacements();
        const uiPlacements = dbPlacements.map(convertDBToUI);
        setPlacements(uiPlacements);

        // Load webhook settings from Supabase
        const settings = await getLeagueSettings();
        if (settings) {
          setWebhookSettings({
            discordWebhookUrl: settings.discord_webhook_url || '',
            autoPostToDiscord: settings.auto_post_discord || false,
            announcementStyle: settings.announcement_style || 'espn',
          });
        }
      } catch (err) {
        console.error('Error loading IL data:', err);
      } finally {
        setIsLoadingPlacements(false);
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  // Save settings to Supabase
  const handleSaveSettings = async (settings: WebhookSettings) => {
    setWebhookSettings(settings);
    try {
      await saveLeagueSettings({
        discord_webhook_url: settings.discordWebhookUrl,
        auto_post_discord: settings.autoPostToDiscord,
        announcement_style: settings.announcementStyle,
      });
    } catch (err) {
      console.error('Error saving webhook settings:', err);
    }
  };

  // Note: gamesOnIL is now tracked manually via "Log Game" button
  // Removed automatic calculation based on currentGame

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
      setSaveError(null);
      
      const placementId = `il-${Date.now()}`;
      const gamesOnIL = 0; // Starts at 0, user logs games manually
      
      // Save to Supabase first
      const result = await addILPlacement({
        id: placementId,
        team_id: newPlacement.teamId,
        player_id: newPlacement.player.id,
        player_name: newPlacement.player.name,
        player_position: newPlacement.player.position,
        player_type: newPlacement.player.type,
        injury_type: newPlacement.injury,
        start_game: newPlacement.startGame,
        start_date: newPlacement.startDate,
        end_game: null,
        end_date: null,
        games_on_il: gamesOnIL,
        status: 'active',
        created_by: user?.id || null,
      });

      if (!result.success) {
        setSaveError(result.error || 'Failed to save placement. Please try again.');
        console.error('Error saving IL placement:', result.error);
        return;
      }

      // Update local state after successful save
      const placement: ILPlacement = {
        ...newPlacement,
        id: placementId,
        gamesOnIL,
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

        let alreadyPosted = false;
        if (webhookSettings.autoPostToDiscord && webhookSettings.discordWebhookUrl) {
          console.log('[IL Manager] Auto-posting enabled, sending to Discord...');
          const result = await postToDiscord(webhookSettings.discordWebhookUrl, announcement);
          if (result.success) {
            console.log('[IL Manager] Auto-post successful!');
            alreadyPosted = true;
          } else {
            console.error('[IL Manager] Auto-post failed:', result.error);
          }
        }

        // Only show preview if NOT auto-posted (to avoid duplicate posting)
        if (!alreadyPosted) {
          setPendingAnnouncement(announcement);
          setShowAnnouncementPreview(true);
        }
      }
    },
    [currentGame, webhookSettings, user?.id]
  );

  const handleActivatePlayer = useCallback(
    async (placementId: string, endGame: number) => {
      setSaveError(null);
      
      const placement = placements.find(p => p.id === placementId);
      if (!placement) return;

      const gamesOnIL = endGame - placement.startGame + 1;
      const endDate = new Date().toISOString().split('T')[0];

      // Update in Supabase first
      const result = await updateILPlacement(placementId, {
        status: 'completed',
        end_game: endGame,
        end_date: endDate,
        games_on_il: gamesOnIL,
      });

      if (!result.success) {
        setSaveError(result.error || 'Failed to activate player. Please try again.');
        console.error('Error updating IL placement:', result.error);
        return;
      }

      // Update local state after successful save
      let activatedPlacement: ILPlacement | null = null;

      setPlacements((prev) =>
        prev.map((p) => {
          if (p.id === placementId) {
            activatedPlacement = {
              ...p,
              status: 'completed',
              endGame,
              endDate,
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

          let alreadyPosted = false;
          if (webhookSettings.autoPostToDiscord && webhookSettings.discordWebhookUrl) {
            console.log('[IL Manager] Auto-posting activation to Discord...');
            const result = await postToDiscord(webhookSettings.discordWebhookUrl, announcement);
            if (result.success) {
              console.log('[IL Manager] Activation auto-post successful!');
              alreadyPosted = true;
            } else {
              console.error('[IL Manager] Activation auto-post failed:', result.error);
            }
          }

          // Only show preview if NOT auto-posted (to avoid duplicate posting)
          if (!alreadyPosted) {
            setPendingAnnouncement(announcement);
            setShowAnnouncementPreview(true);
          }
        }
      }
    },
    [webhookSettings, placements]
  );

  // Log a game played while player is on IL
  const handleLogGame = useCallback(
    async (placementId: string) => {
      setSaveError(null);
      
      const placement = placements.find(p => p.id === placementId);
      if (!placement || placement.status !== 'active') return;

      const newGamesOnIL = placement.gamesOnIL + 1;

      // Update in Supabase
      const result = await updateILPlacement(placementId, {
        games_on_il: newGamesOnIL,
      });

      if (!result.success) {
        setSaveError(result.error || 'Failed to log game. Please try again.');
        console.error('Error logging game:', result.error);
        return;
      }

      // Update local state
      setPlacements((prev) =>
        prev.map((p) => {
          if (p.id === placementId) {
            return { ...p, gamesOnIL: newGamesOnIL };
          }
          return p;
        })
      );
    },
    [placements]
  );

  const handlePostAnnouncement = async () => {
    if (!webhookSettings.discordWebhookUrl || !pendingAnnouncement) return;
    setIsPostingAnnouncement(true);
    const result = await postToDiscord(webhookSettings.discordWebhookUrl, pendingAnnouncement);
    setIsPostingAnnouncement(false);
    if (result.success) {
      setShowAnnouncementPreview(false);
    } else {
      console.error('[IL Manager] Manual post failed:', result.error);
      // Could add a toast notification here
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
        {/* Loading state */}
        {isLoadingPlacements && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading IL placements...</span>
            </div>
          </div>
        )}

        {/* Error display */}
        {saveError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-400 font-medium">Error Saving</p>
                <p className="text-red-400/80 text-sm">{saveError}</p>
              </div>
              <button
                onClick={() => setSaveError(null)}
                className="text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* User's Team Summary Card (non-admin only) */}
        {!isLoadingPlacements && !isAdmin && userTeamData && (
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
                onLogGame={handleLogGame}
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

