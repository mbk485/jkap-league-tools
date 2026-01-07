'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MLB_TEAMS } from '@/types/league';
import {
  ArrowLeft,
  Newspaper,
  Image as ImageIcon,
  Copy,
  Download,
  Sparkles,
  Trophy,
  Users,
  Clock,
  ChevronDown,
  Lock,
  Zap,
  Instagram,
  Share2,
  RefreshCw,
  Check,
  AlertCircle,
  Camera,
  FileText,
  Loader2,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface GameData {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  gameDate: string;
  gameNumber: number;
  innings: number;
  keyPlayers: KeyPlayer[];
  highlights: string[];
  winningPitcher?: string;
  losingPitcher?: string;
  saveBy?: string;
}

interface KeyPlayer {
  name: string;
  team: 'home' | 'away';
  stats: string;
  isStarOfGame?: boolean;
}

interface GeneratedRecap {
  headline: string;
  body: string;
  pullQuote?: string;
  timestamp: string;
}

type RecapStyle = 'espn' | 'newspaper' | 'social';
type ImageStyle = 'instagram' | 'realistic' | 'graphic';

// =============================================================================
// CONSTANTS
// =============================================================================

const RECAP_STYLES = [
  { id: 'espn', name: 'ESPN Style', description: 'Modern sports journalism with dynamic language' },
  { id: 'newspaper', name: 'Newspaper', description: 'Classic newspaper sports section style' },
  { id: 'social', name: 'Social Media', description: 'Quick, punchy recap for social sharing' },
];

const IMAGE_STYLES = [
  { id: 'instagram', name: 'Instagram Post', description: 'Social media ready with stats overlay' },
  { id: 'realistic', name: 'Hyper-Realistic', description: 'AI-generated game action image' },
  { id: 'graphic', name: 'Sports Graphic', description: 'Clean design with team colors and stats' },
];

const allTeams = MLB_TEAMS.map(t => ({ id: t.id, name: t.name, abbreviation: t.abbreviation }));

// =============================================================================
// MOCK RECAP GENERATION (Will be replaced with AI API)
// =============================================================================

function generateMockRecap(data: GameData, style: RecapStyle): GeneratedRecap {
  const winner = data.homeScore > data.awayScore ? 'home' : 'away';
  const winnerName = winner === 'home' 
    ? allTeams.find(t => t.id === data.homeTeam)?.name 
    : allTeams.find(t => t.id === data.awayTeam)?.name;
  const loserName = winner === 'home' 
    ? allTeams.find(t => t.id === data.awayTeam)?.name 
    : allTeams.find(t => t.id === data.homeTeam)?.name;
  const finalScore = `${Math.max(data.homeScore, data.awayScore)}-${Math.min(data.homeScore, data.awayScore)}`;
  
  const starPlayer = data.keyPlayers.find(p => p.isStarOfGame) || data.keyPlayers[0];
  
  const headlines: Record<RecapStyle, string> = {
    espn: `${winnerName} Cruise Past ${loserName} in Dominant ${finalScore} Victory`,
    newspaper: `${winnerName} Top ${loserName}, ${finalScore}`,
    social: `🔥 ${winnerName} WIN! ${finalScore} final 🏆`,
  };

  const bodies: Record<RecapStyle, string> = {
    espn: `The ${winnerName} put together a complete performance on ${new Date(data.gameDate).toLocaleDateString('en-US', { weekday: 'long' })}, defeating the ${loserName} ${finalScore} in Game ${data.gameNumber} of the season.

${starPlayer ? `${starPlayer.name} led the charge with ${starPlayer.stats}, setting the tone early and never looking back.` : ''}

${data.winningPitcher ? `On the mound, ${data.winningPitcher} earned the win with a stellar outing.` : ''} ${data.losingPitcher ? `${data.losingPitcher} took the loss for the ${loserName}.` : ''}

${data.highlights.length > 0 ? `Key moments: ${data.highlights.join('. ')}.` : ''}

With this victory, the ${winnerName} continue to build momentum as they push forward in the JKAP Memorial League standings.`,
    
    newspaper: `${allTeams.find(t => t.id === (winner === 'home' ? data.homeTeam : data.awayTeam))?.abbreviation} — The ${winnerName} defeated the ${loserName} ${finalScore} in JKAP Memorial League action on ${new Date(data.gameDate).toLocaleDateString()}.

${starPlayer ? `${starPlayer.name} paced the winners with ${starPlayer.stats}.` : ''}

${data.winningPitcher ? `${data.winningPitcher} (W) pitched effectively for the ${winnerName}.` : ''} ${data.losingPitcher ? `${data.losingPitcher} (L) was charged with the defeat.` : ''}

The game was played over ${data.innings} innings with no major delays.`,
    
    social: `${winnerName} take down ${loserName} ${finalScore}! 

${starPlayer ? `⭐ Star of the Game: ${starPlayer.name} (${starPlayer.stats})` : ''}

${data.highlights.length > 0 ? `📊 ${data.highlights[0]}` : ''}

#JKAPMemorialLeague #MLBTheShow`,
  };

  return {
    headline: headlines[style],
    body: bodies[style],
    pullQuote: starPlayer ? `"${starPlayer.name} was absolutely dominant tonight."` : undefined,
    timestamp: new Date().toISOString(),
  };
}

// =============================================================================
// COMPONENTS
// =============================================================================

function TeamSelect({ 
  value, 
  onChange, 
  label 
}: { 
  value: string; 
  onChange: (id: string) => void; 
  label: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50 focus:border-jkap-red-500"
        >
          <option value="">Select Team</option>
          {allTeams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.abbreviation} - {team.name}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

function KeyPlayerInput({
  player,
  index,
  onUpdate,
  onRemove,
}: {
  player: KeyPlayer;
  index: number;
  onUpdate: (index: number, player: KeyPlayer) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="p-4 bg-background/30 border border-border/50 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Player {index + 1}</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={player.isStarOfGame}
              onChange={(e) => onUpdate(index, { ...player, isStarOfGame: e.target.checked })}
              className="rounded border-border"
            />
            Star of Game
          </label>
          <button
            onClick={() => onRemove(index)}
            className="text-muted-foreground hover:text-red-400 transition-colors"
          >
            ×
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="text"
          placeholder="Player Name"
          value={player.name}
          onChange={(e) => onUpdate(index, { ...player, name: e.target.value })}
          className="bg-background/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
        />
        <select
          value={player.team}
          onChange={(e) => onUpdate(index, { ...player, team: e.target.value as 'home' | 'away' })}
          className="bg-background/50 border border-border rounded-lg px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
        >
          <option value="home">Home Team</option>
          <option value="away">Away Team</option>
        </select>
        <input
          type="text"
          placeholder="Stats (e.g., 3-4, 2 HR, 4 RBI)"
          value={player.stats}
          onChange={(e) => onUpdate(index, { ...player, stats: e.target.value })}
          className="bg-background/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
        />
      </div>
    </div>
  );
}

function RecapPreview({ recap, style }: { recap: GeneratedRecap; style: RecapStyle }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    const text = `${recap.headline}\n\n${recap.body}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-jkap-red-500" />
          Generated Recap
        </h3>
        <Button
          onClick={copyToClipboard}
          variant="outline"
          size="sm"
          icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      
      <Card className="bg-gradient-to-br from-background to-background/50 border-jkap-red-500/20">
        <CardContent className="p-6 space-y-4">
          {/* Headline */}
          <h2 className={`font-bold ${style === 'social' ? 'text-lg' : 'text-2xl'} text-foreground`}>
            {recap.headline}
          </h2>
          
          {/* Body */}
          <div className={`text-muted-foreground whitespace-pre-line ${style === 'social' ? 'text-sm' : ''}`}>
            {recap.body}
          </div>
          
          {/* Pull Quote */}
          {recap.pullQuote && style !== 'social' && (
            <blockquote className="border-l-4 border-jkap-red-500 pl-4 italic text-muted-foreground">
              {recap.pullQuote}
            </blockquote>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ImagePreview({ style, gameData }: { style: ImageStyle; gameData: GameData }) {
  const homeTeam = allTeams.find(t => t.id === gameData.homeTeam);
  const awayTeam = allTeams.find(t => t.id === gameData.awayTeam);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-jkap-red-500" />
          Generated Image Preview
        </h3>
        <Button
          variant="outline"
          size="sm"
          icon={<Download className="w-4 h-4" />}
        >
          Download
        </Button>
      </div>
      
      {/* Mock Image Preview */}
      <div className="relative aspect-square max-w-md mx-auto rounded-2xl overflow-hidden bg-gradient-to-br from-jkap-navy-800 via-jkap-navy-900 to-black border border-border">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)'
          }} />
        </div>
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          {/* League Logo Placeholder */}
          <div className="w-16 h-16 rounded-xl bg-jkap-red-500 flex items-center justify-center mb-4 font-bold text-white text-xl">
            JK
          </div>
          
          {/* Teams */}
          <div className="flex items-center gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{awayTeam?.abbreviation || 'AWY'}</div>
              <div className="text-4xl font-black text-jkap-red-500">{gameData.awayScore}</div>
            </div>
            <div className="text-muted-foreground text-sm">@</div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{homeTeam?.abbreviation || 'HME'}</div>
              <div className="text-4xl font-black text-jkap-red-500">{gameData.homeScore}</div>
            </div>
          </div>
          
          {/* Result Banner */}
          <div className="bg-jkap-red-500 px-6 py-2 rounded-full mb-4">
            <span className="font-bold text-white uppercase tracking-wide text-sm">
              {gameData.homeScore > gameData.awayScore ? homeTeam?.name : awayTeam?.name} Win
            </span>
          </div>
          
          {/* Star Player */}
          {gameData.keyPlayers.find(p => p.isStarOfGame) && (
            <div className="text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Star of the Game</div>
              <div className="text-lg font-bold text-white">
                {gameData.keyPlayers.find(p => p.isStarOfGame)?.name}
              </div>
              <div className="text-sm text-jkap-red-400">
                {gameData.keyPlayers.find(p => p.isStarOfGame)?.stats}
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <div className="text-xs text-muted-foreground">JKAP MEMORIAL LEAGUE</div>
            <div className="text-xs text-muted-foreground/50">Game {gameData.gameNumber} • {new Date(gameData.gameDate).toLocaleDateString()}</div>
          </div>
        </div>
        
        {/* Style Indicator */}
        <div className="absolute top-4 right-4">
          <Badge variant="success" className="text-xs">
            {style === 'instagram' && <Instagram className="w-3 h-3 mr-1" />}
            {style === 'realistic' && <Camera className="w-3 h-3 mr-1" />}
            {style === 'graphic' && <Zap className="w-3 h-3 mr-1" />}
            {style.charAt(0).toUpperCase() + style.slice(1)}
          </Badge>
        </div>
      </div>
      
      <p className="text-center text-xs text-muted-foreground">
        {style === 'realistic' 
          ? '🎨 AI-generated hyper-realistic images coming soon with API integration'
          : style === 'instagram'
          ? '📱 Instagram-ready format with optimal dimensions'
          : '🎯 Clean sports graphic with team colors'}
      </p>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function GameRecapPage() {
  const { isAuthenticated, user } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Game Data State
  const [gameData, setGameData] = useState<GameData>({
    homeTeam: '',
    awayTeam: '',
    homeScore: 0,
    awayScore: 0,
    gameDate: new Date().toISOString().split('T')[0],
    gameNumber: 1,
    innings: 9,
    keyPlayers: [],
    highlights: [],
    winningPitcher: '',
    losingPitcher: '',
    saveBy: '',
  });
  
  // Generation State
  const [recapStyle, setRecapStyle] = useState<RecapStyle>('espn');
  const [imageStyle, setImageStyle] = useState<ImageStyle>('instagram');
  const [generatedRecap, setGeneratedRecap] = useState<GeneratedRecap | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'recap' | 'image'>('recap');
  
  useEffect(() => {
    setIsLoaded(true);
  }, []);
  
  const handleAddPlayer = () => {
    setGameData(prev => ({
      ...prev,
      keyPlayers: [...prev.keyPlayers, { name: '', team: 'home', stats: '', isStarOfGame: false }],
    }));
  };
  
  const handleUpdatePlayer = (index: number, player: KeyPlayer) => {
    setGameData(prev => ({
      ...prev,
      keyPlayers: prev.keyPlayers.map((p, i) => i === index ? player : p),
    }));
  };
  
  const handleRemovePlayer = (index: number) => {
    setGameData(prev => ({
      ...prev,
      keyPlayers: prev.keyPlayers.filter((_, i) => i !== index),
    }));
  };
  
  const handleAddHighlight = () => {
    setGameData(prev => ({
      ...prev,
      highlights: [...prev.highlights, ''],
    }));
  };
  
  const handleUpdateHighlight = (index: number, value: string) => {
    setGameData(prev => ({
      ...prev,
      highlights: prev.highlights.map((h, i) => i === index ? value : h),
    }));
  };
  
  const handleRemoveHighlight = (index: number) => {
    setGameData(prev => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== index),
    }));
  };
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const recap = generateMockRecap(gameData, recapStyle);
    setGeneratedRecap(recap);
    setShowImagePreview(true);
    setIsGenerating(false);
  };
  
  const canGenerate = gameData.homeTeam && gameData.awayTeam && 
    (gameData.homeScore > 0 || gameData.awayScore > 0);

  // Not authenticated view
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-jkap-navy-950 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-jkap-red-500/10 border border-jkap-red-500/20 flex items-center justify-center mx-auto">
              <Lock className="w-10 h-10 text-jkap-red-500" />
            </div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              GAME RECAP CREATOR
            </h1>
            <p className="text-muted-foreground">
              Access to the Game Recap Creator requires authentication. Sign in with your JKAP Memorial League credentials.
            </p>
            <Button as="link" href="/login?redirect=/tools/game-recap" icon={<Lock className="w-4 h-4" />}>
              Sign In to Access
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-jkap-navy-950">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/tools"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back to Tools</span>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Game Recap Creator</h1>
                  <p className="text-xs text-muted-foreground">Generate ESPN-style recaps & images</p>
                </div>
              </div>
            </div>
            <Badge variant="info" className="hidden sm:flex">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`max-w-7xl mx-auto px-4 py-8 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input Form */}
          <div className="space-y-6">
            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-jkap-red-500" />
                  Game Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Teams */}
                <div className="grid grid-cols-2 gap-4">
                  <TeamSelect 
                    value={gameData.awayTeam} 
                    onChange={(id) => setGameData(prev => ({ ...prev, awayTeam: id }))}
                    label="Away Team"
                  />
                  <TeamSelect 
                    value={gameData.homeTeam} 
                    onChange={(id) => setGameData(prev => ({ ...prev, homeTeam: id }))}
                    label="Home Team"
                  />
                </div>
                
                {/* Score */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Away Score</label>
                    <input
                      type="number"
                      min="0"
                      value={gameData.awayScore}
                      onChange={(e) => setGameData(prev => ({ ...prev, awayScore: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Home Score</label>
                    <input
                      type="number"
                      min="0"
                      value={gameData.homeScore}
                      onChange={(e) => setGameData(prev => ({ ...prev, homeScore: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
                    />
                  </div>
                </div>
                
                {/* Game Details */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Date</label>
                    <input
                      type="date"
                      value={gameData.gameDate}
                      onChange={(e) => setGameData(prev => ({ ...prev, gameDate: e.target.value }))}
                      className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Game #</label>
                    <input
                      type="number"
                      min="1"
                      value={gameData.gameNumber}
                      onChange={(e) => setGameData(prev => ({ ...prev, gameNumber: parseInt(e.target.value) || 1 }))}
                      className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Innings</label>
                    <input
                      type="number"
                      min="1"
                      value={gameData.innings}
                      onChange={(e) => setGameData(prev => ({ ...prev, innings: parseInt(e.target.value) || 9 }))}
                      className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pitching */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-jkap-red-500" />
                  Pitching Decision
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Winning Pitcher</label>
                    <input
                      type="text"
                      placeholder="Pitcher name"
                      value={gameData.winningPitcher}
                      onChange={(e) => setGameData(prev => ({ ...prev, winningPitcher: e.target.value }))}
                      className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Losing Pitcher</label>
                    <input
                      type="text"
                      placeholder="Pitcher name"
                      value={gameData.losingPitcher}
                      onChange={(e) => setGameData(prev => ({ ...prev, losingPitcher: e.target.value }))}
                      className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Save (optional)</label>
                    <input
                      type="text"
                      placeholder="Pitcher name"
                      value={gameData.saveBy}
                      onChange={(e) => setGameData(prev => ({ ...prev, saveBy: e.target.value }))}
                      className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Players */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-jkap-red-500" />
                    Key Players
                  </CardTitle>
                  <Button onClick={handleAddPlayer} variant="ghost" size="sm">
                    + Add Player
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {gameData.keyPlayers.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Add key players who made an impact in the game
                  </p>
                ) : (
                  gameData.keyPlayers.map((player, index) => (
                    <KeyPlayerInput
                      key={index}
                      player={player}
                      index={index}
                      onUpdate={handleUpdatePlayer}
                      onRemove={handleRemovePlayer}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            {/* Highlights */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-jkap-red-500" />
                    Game Highlights
                  </CardTitle>
                  <Button onClick={handleAddHighlight} variant="ghost" size="sm">
                    + Add Highlight
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {gameData.highlights.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Add notable moments from the game
                  </p>
                ) : (
                  gameData.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g., Back-to-back home runs in the 5th"
                        value={highlight}
                        onChange={(e) => handleUpdateHighlight(index, e.target.value)}
                        className="flex-1 bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
                      />
                      <button
                        onClick={() => handleRemoveHighlight(index)}
                        className="text-muted-foreground hover:text-red-400 transition-colors p-2"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Generation Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-jkap-red-500" />
                  Generation Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recap Style */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Recap Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {RECAP_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setRecapStyle(style.id as RecapStyle)}
                        className={`p-3 rounded-xl border transition-all ${
                          recapStyle === style.id
                            ? 'border-jkap-red-500 bg-jkap-red-500/10'
                            : 'border-border hover:border-border/80'
                        }`}
                      >
                        <div className="text-sm font-medium text-foreground">{style.name}</div>
                        <div className="text-xs text-muted-foreground">{style.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Style */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Image Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {IMAGE_STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setImageStyle(style.id as ImageStyle)}
                        className={`p-3 rounded-xl border transition-all ${
                          imageStyle === style.id
                            ? 'border-jkap-red-500 bg-jkap-red-500/10'
                            : 'border-border hover:border-border/80'
                        }`}
                      >
                        <div className="text-sm font-medium text-foreground">{style.name}</div>
                        <div className="text-xs text-muted-foreground">{style.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate || isGenerating}
                  fullWidth
                  icon={isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                >
                  {isGenerating ? 'Generating...' : 'Generate Recap & Image'}
                </Button>
                
                {!canGenerate && (
                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Select both teams and enter a score to generate
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            {/* Tab Selector */}
            <div className="flex gap-2 p-1 bg-background/50 border border-border rounded-xl">
              <button
                onClick={() => setActiveTab('recap')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'recap'
                    ? 'bg-jkap-red-500 text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <FileText className="w-4 h-4" />
                Recap
              </button>
              <button
                onClick={() => setActiveTab('image')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'image'
                    ? 'bg-jkap-red-500 text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                Image
              </button>
            </div>

            {/* Content */}
            <Card className="min-h-[600px]">
              <CardContent className="p-6">
                {!generatedRecap && !showImagePreview ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                      <Newspaper className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Ready to Generate
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-xs">
                      Fill in the game details on the left and click &quot;Generate&quot; to create your ESPN-style recap and game image.
                    </p>
                  </div>
                ) : activeTab === 'recap' && generatedRecap ? (
                  <RecapPreview recap={generatedRecap} style={recapStyle} />
                ) : activeTab === 'image' && showImagePreview ? (
                  <ImagePreview style={imageStyle} gameData={gameData} />
                ) : null}
              </CardContent>
            </Card>

            {/* Share Options */}
            {generatedRecap && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Share to:</span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" icon={<Instagram className="w-4 h-4" />}>
                        Instagram
                      </Button>
                      <Button variant="ghost" size="sm" icon={<Share2 className="w-4 h-4" />}>
                        Discord
                      </Button>
                      <Button variant="ghost" size="sm" icon={<Copy className="w-4 h-4" />}>
                        Copy All
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

