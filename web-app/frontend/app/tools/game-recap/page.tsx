'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MLB_TEAMS } from '@/types/league';
import { 
  generateRecap as generateAIRecap, 
  isOpenAIConfigured, 
  saveApiKey, 
  removeApiKey 
} from '@/lib/openai';
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
  Settings,
  Key,
  X,
  Upload,
  Smartphone,
  Monitor,
  Gamepad2,
  Info,
  Trash2,
  MessageSquare,
  Mic,
  Lightbulb,
  TrendingUp,
  Target,
  BarChart3,
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
          <Badge variant="active" className="text-xs">
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
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // Image Upload State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadHelp, setShowUploadHelp] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Text Description State
  const [gameDescription, setGameDescription] = useState('');
  const [isAnalyzingText, setIsAnalyzingText] = useState(false);
  const [textAnalysisError, setTextAnalysisError] = useState<string | null>(null);
  
  // Pitching Analysis Upload State (for scouting data collection)
  const [pitchingAnalysisImage, setPitchingAnalysisImage] = useState<string | null>(null);
  const [pitchingAnalysisFileName, setPitchingAnalysisFileName] = useState('');
  const [isPitchingDragging, setIsPitchingDragging] = useState(false);
  const [pitchingFeedback, setPitchingFeedback] = useState<string | null>(null);
  const [isAnalyzingPitching, setIsAnalyzingPitching] = useState(false);
  const [analysisOpponent, setAnalysisOpponent] = useState(''); // Who they played against
  const [analysisContext, setAnalysisContext] = useState<'pitching' | 'hitting'>('pitching'); // Were they pitching or hitting
  
  // API Settings State (admin only)
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  
  const isAdmin = user?.isAdmin ?? false;
  
  // For now, only admins have "PRO" access (will be replaced with payment system)
  const isPremiumUser = isAdmin;
  
  useEffect(() => {
    setIsLoaded(true);
    // Check if API key is configured
    setHasApiKey(isOpenAIConfigured());
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
  
  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      saveApiKey(apiKeyInput.trim());
      setHasApiKey(true);
      setApiKeyInput('');
      setShowApiSettings(false);
    }
  };
  
  const handleRemoveApiKey = () => {
    removeApiKey();
    setHasApiKey(false);
    setApiKeyInput('');
  };
  
  // Image Upload Handlers
  const handleImageUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setUploadedFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };
  
  const handleRemoveImage = () => {
    setUploadedImage(null);
    setUploadedFileName('');
    setAnalysisError(null);
  };
  
  // Text Description Analysis - AI extracts game data from natural language
  const handleAnalyzeDescription = async () => {
    if (!gameDescription.trim() || !hasApiKey) return;
    
    setIsAnalyzingText(true);
    setTextAnalysisError(null);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jkap_openai_key')}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: `Extract game information from this description and return as JSON:

"${gameDescription}"

Return this exact JSON structure (use null for unknown values):
{
  "homeTeam": "team abbreviation (NYY, BOS, LAD, etc.) or null",
  "awayTeam": "team abbreviation or null", 
  "homeScore": number or null,
  "awayScore": number or null,
  "keyPlayers": [
    { "name": "player name", "team": "home or away", "stats": "stats string", "isStarOfGame": true/false }
  ],
  "winningPitcher": "name or null",
  "losingPitcher": "name or null",
  "saveBy": "name or null",
  "highlights": ["highlight 1", "highlight 2"]
}

MLB team abbreviations: ARI, ATL, BAL, BOS, CHC, CWS, CIN, CLE, COL, DET, HOU, KC, LAA, LAD, MIA, MIL, MIN, NYM, NYY, OAK, PHI, PIT, SD, SF, SEA, STL, TB, TEX, TOR, WSH

Return ONLY the JSON, no other text.`
            }
          ],
          max_tokens: 800,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to analyze description');
      
      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      const jsonMatch = content?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse game data');
      
      const extracted = JSON.parse(jsonMatch[0]);
      
      const findTeamId = (abbr: string | null) => {
        if (!abbr) return '';
        const team = allTeams.find(t => 
          t.abbreviation.toLowerCase() === abbr.toLowerCase()
        );
        return team?.id || '';
      };
      
      setGameData(prev => ({
        ...prev,
        homeTeam: findTeamId(extracted.homeTeam) || prev.homeTeam,
        awayTeam: findTeamId(extracted.awayTeam) || prev.awayTeam,
        homeScore: extracted.homeScore ?? prev.homeScore,
        awayScore: extracted.awayScore ?? prev.awayScore,
        keyPlayers: extracted.keyPlayers?.length > 0 ? extracted.keyPlayers.map((p: any) => ({
          name: p.name || '',
          team: p.team === 'home' ? 'home' : 'away',
          stats: p.stats || '',
          isStarOfGame: p.isStarOfGame || false,
        })) : prev.keyPlayers,
        winningPitcher: extracted.winningPitcher || prev.winningPitcher,
        losingPitcher: extracted.losingPitcher || prev.losingPitcher,
        saveBy: extracted.saveBy || prev.saveBy,
        highlights: extracted.highlights?.length > 0 ? extracted.highlights : prev.highlights,
      }));
      
    } catch (error) {
      setTextAnalysisError(error instanceof Error ? error.message : 'Failed to analyze');
    } finally {
      setIsAnalyzingText(false);
    }
  };
  
  // Pitching Analysis Handlers
  const handlePitchingUpload = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPitchingAnalysisImage(reader.result as string);
        setPitchingAnalysisFileName(file.name);
        setPitchingFeedback(null);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handlePitchingDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsPitchingDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handlePitchingUpload(file);
  };
  
  const handlePitchingFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePitchingUpload(file);
  };
  
  const handleRemovePitchingAnalysis = () => {
    setPitchingAnalysisImage(null);
    setPitchingAnalysisFileName('');
    setPitchingFeedback(null);
  };
  
  // Analyze pitching and save to admin database (data harvesting)
  const handleAnalyzePitching = async () => {
    if (!pitchingAnalysisImage || !hasApiKey || !analysisOpponent) return;
    
    setIsAnalyzingPitching(true);
    
    const userTeamId = user?.teamId || gameData.homeTeam || 'unknown';
    const userTeamName = allTeams.find(t => t.id === userTeamId)?.name || 'Your team';
    const opponentTeamName = allTeams.find(t => t.id === analysisOpponent)?.name || 'Opponent';
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jkap_openai_key')}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this MLB The Show ${analysisContext} analysis screenshot. The user (${userTeamName}) played against ${opponentTeamName}.

Provide helpful coaching feedback (2-3 paragraphs):
1. What the data shows overall
2. 2-3 specific tips for the user to improve
3. Encouraging conclusion

Be specific about pitch types, locations, and tendencies you can see in the data. Format nicely with clear sections.`
                },
                {
                  type: 'image_url',
                  image_url: { url: pitchingAnalysisImage },
                },
              ],
            },
          ],
          max_tokens: 600,
        }),
      });
      
      if (!response.ok) throw new Error('Analysis failed');
      
      const data = await response.json();
      const feedback = data.choices[0]?.message?.content;
      
      setPitchingFeedback(feedback || 'Analysis complete. Keep working on your game!');
      
      // SECOND API CALL - Extract structured scouting data (hidden from user)
      const scoutingResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jkap_openai_key')}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this MLB The Show ${analysisContext} analysis screenshot and extract detailed scouting intelligence.

Return ONLY this JSON structure:
{
  "uploaderWeaknesses": ["specific weakness 1", "specific weakness 2", "specific weakness 3"],
  "uploaderStrengths": ["specific strength 1", "specific strength 2"],
  "opponentWeaknesses": ["what the opponent struggled with 1", "what opponent struggled with 2"],
  "opponentStrengths": ["what opponent did well 1", "what opponent did well 2"],
  "pitchTendencies": {
    "mostUsedPitches": ["pitch type 1", "pitch type 2"],
    "effectivePitches": ["pitch type that worked"],
    "ineffectivePitches": ["pitch type that didn't work"],
    "preferredLocations": ["zone or location tendency"]
  },
  "hittingTendencies": {
    "hotZones": ["zone where they hit well"],
    "coldZones": ["zone where they struggle"],
    "pitchesTheyHit": ["pitch types they handle"],
    "pitchesTheyMiss": ["pitch types they struggle with"]
  },
  "keyInsights": ["actionable insight 1", "actionable insight 2", "actionable insight 3"],
  "recommendedStrategy": "Brief strategy recommendation for playing against this opponent"
}

Extract as much detail as you can see. Use null for sections with no data visible.`
                },
                {
                  type: 'image_url',
                  image_url: { url: pitchingAnalysisImage },
                },
              ],
            },
          ],
          max_tokens: 800,
        }),
      });
      
      let scoutingIntel = null;
      if (scoutingResponse.ok) {
        const scoutingData = await scoutingResponse.json();
        const scoutingContent = scoutingData.choices[0]?.message?.content;
        const jsonMatch = scoutingContent?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            scoutingIntel = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('Failed to parse scouting intel');
          }
        }
      }
      
      // SAVE COMPREHENSIVE SCOUTING DATA TO LOCAL STORAGE (Data harvesting)
      const scoutingEntry = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        // WHO submitted
        uploadedBy: user?.username || 'anonymous',
        uploaderTeamId: userTeamId,
        uploaderTeamName: userTeamName,
        // WHO they played
        opponentTeamId: analysisOpponent,
        opponentTeamName: opponentTeamName,
        // CONTEXT
        analysisType: analysisContext, // pitching or hitting
        // RAW DATA
        imageData: pitchingAnalysisImage,
        userFeedback: feedback, // What we showed the user
        // HIDDEN SCOUTING INTEL
        scoutingIntel: scoutingIntel,
      };
      
      const existingData = JSON.parse(localStorage.getItem('jkap_scouting_data') || '[]');
      existingData.push(scoutingEntry);
      localStorage.setItem('jkap_scouting_data', JSON.stringify(existingData));
      
    } catch (error) {
      setPitchingFeedback('Unable to analyze. Please try again.');
    } finally {
      setIsAnalyzingPitching(false);
    }
  };
  
  // Smart Upload - AI analyzes the image and extracts game data
  const handleSmartAnalyze = async () => {
    if (!uploadedImage || !hasApiKey || !isPremiumUser) return;
    
    setIsAnalyzingImage(true);
    setAnalysisError(null);
    
    try {
      // Call OpenAI Vision API to analyze the image
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jkap_openai_key')}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this MLB The Show post-game screenshot and extract the following information in JSON format:
{
  "homeTeam": "team abbreviation (e.g., NYY, BOS, LAD)",
  "awayTeam": "team abbreviation",
  "homeScore": number,
  "awayScore": number,
  "keyPlayers": [
    { "name": "player name", "team": "home or away", "stats": "e.g., 3-4, 2 HR, 4 RBI", "isStarOfGame": true/false }
  ],
  "winningPitcher": "pitcher name or empty",
  "losingPitcher": "pitcher name or empty",
  "saveBy": "pitcher name or empty",
  "highlights": ["notable moment 1", "notable moment 2"]
}

Look for team names, final score, player stats, batting averages, home runs, RBIs, pitching stats, etc. Return ONLY the JSON object, no other text.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: uploadedImage,
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }
      
      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No response from AI');
      }
      
      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse game data from image');
      }
      
      const extractedData = JSON.parse(jsonMatch[0]);
      
      // Map team abbreviations to team IDs
      const findTeamId = (abbr: string) => {
        const team = allTeams.find(t => 
          t.abbreviation.toLowerCase() === abbr?.toLowerCase() ||
          t.name.toLowerCase().includes(abbr?.toLowerCase())
        );
        return team?.id || '';
      };
      
      // Update game data with extracted info
      setGameData(prev => ({
        ...prev,
        homeTeam: findTeamId(extractedData.homeTeam) || prev.homeTeam,
        awayTeam: findTeamId(extractedData.awayTeam) || prev.awayTeam,
        homeScore: extractedData.homeScore ?? prev.homeScore,
        awayScore: extractedData.awayScore ?? prev.awayScore,
        keyPlayers: extractedData.keyPlayers?.map((p: any) => ({
          name: p.name || '',
          team: p.team === 'home' ? 'home' : 'away',
          stats: p.stats || '',
          isStarOfGame: p.isStarOfGame || false,
        })) || prev.keyPlayers,
        winningPitcher: extractedData.winningPitcher || prev.winningPitcher,
        losingPitcher: extractedData.losingPitcher || prev.losingPitcher,
        saveBy: extractedData.saveBy || prev.saveBy,
        highlights: extractedData.highlights || prev.highlights,
      }));
      
    } catch (error) {
      console.error('Image analysis error:', error);
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze image');
    } finally {
      setIsAnalyzingImage(false);
    }
  };
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    
    // Get team names
    const homeTeamData = allTeams.find(t => t.id === gameData.homeTeam);
    const awayTeamData = allTeams.find(t => t.id === gameData.awayTeam);
    
    // Try OpenAI first if configured
    if (hasApiKey) {
      try {
        const recap = await generateAIRecap({
          ...gameData,
          homeTeamName: homeTeamData?.name || gameData.homeTeam,
          awayTeamName: awayTeamData?.name || gameData.awayTeam,
        }, recapStyle);
        
        setGeneratedRecap(recap);
        setShowImagePreview(true);
        setIsGenerating(false);
        return;
      } catch (error) {
        console.error('OpenAI generation failed:', error);
        setGenerationError(error instanceof Error ? error.message : 'AI generation failed');
        // Fall back to mock generation
      }
    }
    
    // Fallback to mock generation
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
            <div className="flex items-center gap-2">
              {hasApiKey ? (
                <Badge variant="active" className="hidden sm:flex">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI Enabled
                </Badge>
              ) : (
                <Badge variant="outline" className="hidden sm:flex">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Demo Mode
                </Badge>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowApiSettings(true)}
                  className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  title="API Settings"
                >
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* API Settings Modal (Admin Only) */}
      {showApiSettings && isAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-jkap-red-500" />
                  OpenAI API Settings
                </CardTitle>
                <button
                  onClick={() => setShowApiSettings(false)}
                  className="p-1 rounded hover:bg-muted/50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add your OpenAI API key to enable AI-powered game recap generation. 
                Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-jkap-red-500 hover:underline">platform.openai.com</a>
              </p>
              
              {hasApiKey ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <Check className="w-5 h-5 text-green-500" />
                    <span className="text-green-400 text-sm">API Key Configured</span>
                  </div>
                  <Button
                    onClick={handleRemoveApiKey}
                    variant="danger"
                    fullWidth
                  >
                    Remove API Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50"
                  />
                  <Button
                    onClick={handleSaveApiKey}
                    disabled={!apiKeyInput.trim()}
                    fullWidth
                    icon={<Key className="w-4 h-4" />}
                  >
                    Save API Key
                  </Button>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Your API key is stored locally in your browser and never sent to our servers.
                Uses GPT-4o-mini model (~$0.001 per recap).
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className={`max-w-7xl mx-auto px-4 py-8 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Input Form */}
          <div className="space-y-6">
            
            {/* ============================================================= */}
            {/* QUICK INPUT - Describe Your Game (FREE) */}
            {/* ============================================================= */}
            <Card className="border-2 border-jkap-red-500/30 bg-gradient-to-br from-jkap-red-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-jkap-red-500" />
                    Describe Your Game
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-green-500/50 text-green-500">
                    FREE
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Just tell us what happened — type it out or use your phone's voice dictation 🎤
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <textarea
                    value={gameDescription}
                    onChange={(e) => setGameDescription(e.target.value)}
                    placeholder={`"The Cardinals beat the Brewers 9-1. Corbin Carroll was player of the game, went 3-4 with 2 home runs. Chris Bassett got the win, Michael McGreevy took the loss. In the 5th inning, back-to-back homers broke it open..."`}
                    className="w-full min-h-[140px] bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/60 placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-jkap-red-500/50 resize-none"
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Mic className="w-3.5 h-3.5" />
                    <span>Tip: Use your keyboard's 🎤 for voice</span>
                  </div>
                </div>
                
                <div className="bg-muted/30 rounded-xl p-3 border border-border">
                  <p className="text-xs text-muted-foreground flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-foreground">Include:</strong> Teams, final score, key players & stats, 
                      winning/losing pitcher, memorable moments, big plays, dramatic endings...
                    </span>
                  </p>
                </div>
                
                {textAnalysisError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                    {textAnalysisError}
                  </div>
                )}
                
                <Button
                  onClick={handleAnalyzeDescription}
                  disabled={!gameDescription.trim() || !hasApiKey || isAnalyzingText}
                  fullWidth
                  icon={isAnalyzingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                >
                  {isAnalyzingText ? 'Analyzing...' : '✨ Extract Game Data'}
                </Button>
                
                {!hasApiKey && (
                  <p className="text-xs text-center text-muted-foreground">
                    Configure API key above to enable AI analysis
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <span className="text-xs text-muted-foreground font-medium">OR FILL IN MANUALLY</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
            
            {/* Game Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-jkap-red-500" />
                  Game Information
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-green-500/50 text-green-500">
                    FREE
                  </Badge>
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

            {/* Post-Game Screenshot Upload */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-jkap-red-500" />
                    Post-Game Screenshot
                    {isPremiumUser && (
                      <Badge variant="active" className="text-[10px] px-1.5 py-0.5">
                        <Sparkles className="w-3 h-3 mr-0.5" />
                        PRO
                      </Badge>
                    )}
                  </CardTitle>
                  <button
                    onClick={() => setShowUploadHelp(!showUploadHelp)}
                    className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                    title="How to get your screenshot"
                  >
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Help Panel */}
                {showUploadHelp && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-3">
                    <h4 className="font-medium text-blue-400 text-sm">💡 How to get your screenshot:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="flex items-start gap-2">
                        <Smartphone className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="font-medium text-foreground">Phone:</span>
                          <span className="text-muted-foreground"> Take a photo of your TV/monitor</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Gamepad2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="font-medium text-foreground">PS App:</span>
                          <span className="text-muted-foreground"> Download from PlayStation App captures</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Monitor className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="font-medium text-foreground">PC:</span>
                          <span className="text-muted-foreground"> Screenshot (Win+Shift+S)</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Gamepad2 className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <span className="font-medium text-foreground">Xbox:</span>
                          <span className="text-muted-foreground"> Xbox App → Captures → Download</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Upload Area */}
                {!uploadedImage ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                      isDragging
                        ? 'border-jkap-red-500 bg-jkap-red-500/10'
                        : 'border-border hover:border-jkap-red-500/50 hover:bg-muted/30'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-xl bg-muted/50 flex items-center justify-center">
                        <Upload className={`w-7 h-7 ${isDragging ? 'text-jkap-red-500' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {isDragging ? 'Drop your image here' : 'Drag & drop your post-game screenshot'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          or click to browse • JPG, PNG, HEIC
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Image Preview */}
                    <div className="relative rounded-xl overflow-hidden border border-border">
                      <img
                        src={uploadedImage}
                        alt="Uploaded post-game screenshot"
                        className="w-full h-auto max-h-64 object-contain bg-black/50"
                      />
                      <button
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-2 bg-red-500/90 hover:bg-red-500 text-white rounded-lg transition-colors"
                        title="Remove image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate max-w-[200px]">{uploadedFileName}</span>
                      <label className="text-jkap-red-500 hover:text-jkap-red-400 cursor-pointer transition-colors">
                        Replace image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                    
                    {/* Smart Analyze Button - PRO Feature */}
                    {isPremiumUser ? (
                      <div className="space-y-2">
                        <button
                          onClick={handleSmartAnalyze}
                          disabled={isAnalyzingImage || !hasApiKey}
                          className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                            isAnalyzingImage
                              ? 'bg-purple-500/20 text-purple-400 cursor-wait'
                              : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white'
                          }`}
                        >
                          {isAnalyzingImage ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Analyzing Screenshot...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5" />
                              Smart Analyze (AI)
                            </>
                          )}
                        </button>
                        <p className="text-xs text-center text-purple-400/70">
                          AI will read your screenshot and auto-fill game details
                        </p>
                        {analysisError && (
                          <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-xs text-red-400 text-center">{analysisError}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-muted/30 border border-border rounded-xl text-center space-y-2">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Lock className="w-4 h-4" />
                          <span className="text-sm font-medium">Smart Analyze</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-amber-500/50 text-amber-500">
                            PRO
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Upgrade to PRO to let AI read your screenshot and auto-fill game details
                        </p>
                        <button className="text-xs text-amber-500 hover:text-amber-400 font-medium transition-colors">
                          Upgrade for $5/month →
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground text-center">
                  {isPremiumUser 
                    ? 'Upload your post-game screen and let AI extract the data, or fill in manually below'
                    : 'Upload your screenshot for reference, then fill in the game details below'
                  }
                </p>
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
                
                {generationError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-xs text-red-400 text-center flex items-center justify-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {generationError}
                    </p>
                  </div>
                )}
                
                {!hasApiKey && canGenerate && (
                  <p className="text-xs text-amber-400/70 text-center">
                    Demo mode: Using template generation. {isAdmin && 'Add OpenAI API key in settings for AI-powered recaps.'}
                  </p>
                )}
              </CardContent>
            </Card>
            
            {/* ============================================================= */}
            {/* POST-GAME ANALYSIS - Pitching Analysis Upload (Data Harvesting) */}
            {/* ============================================================= */}
            <Card className="border border-border bg-gradient-to-br from-blue-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-500" />
                    Post-Game Analysis
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-blue-500/50 text-blue-400">
                    GET FEEDBACK
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Upload your game analysis screenshot and get AI coaching feedback
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Context Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setAnalysisContext('pitching')}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      analysisContext === 'pitching'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-border hover:border-blue-500/30 bg-muted/20'
                    }`}
                  >
                    <p className={`font-semibold text-sm ${analysisContext === 'pitching' ? 'text-blue-400' : 'text-foreground'}`}>
                      🎯 Pitching
                    </p>
                    <p className="text-xs text-muted-foreground">How I pitched</p>
                  </button>
                  <button
                    onClick={() => setAnalysisContext('hitting')}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      analysisContext === 'hitting'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-border hover:border-blue-500/30 bg-muted/20'
                    }`}
                  >
                    <p className={`font-semibold text-sm ${analysisContext === 'hitting' ? 'text-blue-400' : 'text-foreground'}`}>
                      ⚾ Hitting
                    </p>
                    <p className="text-xs text-muted-foreground">How I hit</p>
                  </button>
                </div>
                
                {/* Opponent Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Who did you play against?</label>
                  <select
                    value={analysisOpponent}
                    onChange={(e) => setAnalysisOpponent(e.target.value)}
                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">Select opponent...</option>
                    {allTeams.map(team => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Upload Zone */}
                <div
                  onDrop={handlePitchingDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsPitchingDragging(true); }}
                  onDragLeave={() => setIsPitchingDragging(false)}
                  className={`
                    relative border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer
                    ${isPitchingDragging 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-border hover:border-blue-500/50 bg-muted/20'
                    }
                  `}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePitchingFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {pitchingAnalysisImage ? (
                    <div className="space-y-3">
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-background">
                        <img 
                          src={pitchingAnalysisImage} 
                          alt="Game Analysis" 
                          className="w-full h-full object-contain"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemovePitchingAnalysis(); }}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-center text-muted-foreground truncate">
                        {pitchingAnalysisFileName}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-blue-500" />
                      </div>
                      <p className="font-medium text-foreground">Upload {analysisContext === 'pitching' ? 'Pitching' : 'Hitting'} Analysis</p>
                      <p className="text-xs text-muted-foreground">
                        Screenshot your post-game {analysisContext} breakdown
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Feedback Display */}
                {pitchingFeedback && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-blue-400 font-medium text-sm">
                      <TrendingUp className="w-4 h-4" />
                      AI Coaching Feedback
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-line">
                      {pitchingFeedback}
                    </p>
                  </div>
                )}
                
                {/* Analyze Button */}
                <Button
                  onClick={handleAnalyzePitching}
                  disabled={!pitchingAnalysisImage || !hasApiKey || isAnalyzingPitching || !analysisOpponent}
                  fullWidth
                  variant="outline"
                  icon={isAnalyzingPitching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  className="border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/10"
                >
                  {isAnalyzingPitching ? 'Analyzing Performance...' : 'Get AI Feedback'}
                </Button>
                
                {!analysisOpponent && pitchingAnalysisImage && (
                  <p className="text-xs text-center text-amber-400">
                    Select your opponent to enable analysis
                  </p>
                )}
                
                <p className="text-[10px] text-center text-muted-foreground/60">
                  Your analysis helps improve the league experience for everyone
                </p>
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

