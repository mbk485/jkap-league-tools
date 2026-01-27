'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  GraduationCap,
  Target,
  Users,
  BookOpen,
  Upload,
  TrendingUp,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Clock,
  Folder,
  FileText,
  ArrowLeft,
  Lock,
  Play,
  Crosshair,
  BarChart3,
  Zap,
  HelpCircle,
} from 'lucide-react';
import { MLB_TEAMS } from '@/types/league';
import { analyzeImageWithAI, isOpenAIConfiguredAsync, initializeApiKey } from '@/lib/openai';
import { 
  saveScoutingReport, 
  getScoutingReports, 
  getOpponentReports,
  DBScoutingReport,
  logMemberActivity,
  awardActivity,
} from '@/lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

type TabId = 'scouting' | 'roster' | 'classroom';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  available: boolean;
  description: string;
}

interface AnalysisResult {
  pitchesStruggled: string[];
  pitchesHitWell: string[];
  battingAvgByPitch: Record<string, string>;
  tendencies: string[];
  recommendations: string[];
  rawAnalysis: string;
  encouragement: string;  // What they did well - positive feedback
  improvement: string;    // What to work on - constructive feedback
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TABS: Tab[] = [
  {
    id: 'scouting',
    label: 'Scouting Hub',
    icon: <Target className="w-5 h-5" />,
    available: true,
    description: 'Upload game analysis screenshots and build intel on yourself and opponents',
  },
  {
    id: 'roster',
    label: 'Roster Advice',
    icon: <Users className="w-5 h-5" />,
    available: false,
    description: 'Get AI-powered lineup suggestions based on your roster',
  },
  {
    id: 'classroom',
    label: 'Classroom',
    icon: <BookOpen className="w-5 h-5" />,
    available: false,
    description: 'Curated tutorials and guides from top players',
  },
];

const allTeams = MLB_TEAMS;

// =============================================================================
// SCOUTING HUB COMPONENT
// =============================================================================

// Maximum images allowed per analysis
const MAX_IMAGES = 4;

function ScoutingHub({ userId, userTeamId }: { userId: string; userTeamId?: string }) {
  const [analysisType, setAnalysisType] = useState<'hitting' | 'pitching'>('hitting');
  const [opponentTeamId, setOpponentTeamId] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  
  // API key state - check on client side only
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // Tutorial video URL - commissioner can update this later
  // Set to empty string for "coming soon" or a YouTube embed URL like "https://www.youtube.com/embed/VIDEO_ID"
  const tutorialVideoUrl = ''; // TODO: Replace with actual video URL when ready
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Reports state
  const [myReports, setMyReports] = useState<DBScoutingReport[]>([]);
  const [opponentReports, setOpponentReports] = useState<DBScoutingReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [viewMode, setViewMode] = useState<'upload' | 'my-reports' | 'opponent-files'>('upload');
  const [selectedOpponentForFiles, setSelectedOpponentForFiles] = useState('');

  // Check API key on mount (from Supabase - centralized for whole league)
  useEffect(() => {
    const checkApiKey = async () => {
      await initializeApiKey();
      const configured = await isOpenAIConfiguredAsync();
      setHasApiKey(configured);
    };
    
    // Check immediately
    checkApiKey();
    
    // Re-check when window gains focus (in case admin set it)
    const handleFocus = () => checkApiKey();
    window.addEventListener('focus', handleFocus);
    
    // Also check periodically in case admin just set it
    const interval = setInterval(checkApiKey, 5000);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, []);

  // Load reports on mount
  useEffect(() => {
    const loadReports = async () => {
      setIsLoadingReports(true);
      try {
        const reports = await getScoutingReports(userId);
        setMyReports(reports);
      } catch (err) {
        console.error('Failed to load reports:', err);
      }
      setIsLoadingReports(false);
    };
    loadReports();
  }, [userId]);

  // Load opponent reports when selected
  useEffect(() => {
    if (!selectedOpponentForFiles) {
      setOpponentReports([]);
      return;
    }
    
    const loadOpponentReports = async () => {
      try {
        const reports = await getOpponentReports(userId, selectedOpponentForFiles);
        setOpponentReports(reports);
      } catch (err) {
        console.error('Failed to load opponent reports:', err);
      }
    };
    loadOpponentReports();
  }, [selectedOpponentForFiles, userId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check how many more images we can add
    const remainingSlots = MAX_IMAGES - uploadedImages.length;
    if (remainingSlots <= 0) {
      setAnalysisError(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    // Process files (up to remaining slots)
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setUploadedImages(prev => [...prev, imageData]);
        setAnalysisResult(null);
        setAnalysisError('');
        setSaveStatus('idle');
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove a specific image from the array
  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setAnalysisResult(null);
    setAnalysisError('');
  };

  // Clear all images
  const handleClearAllImages = () => {
    setUploadedImages([]);
    setAnalysisResult(null);
    setAnalysisError('');
  };

  const handleAnalyze = async () => {
    if (uploadedImages.length === 0 || !opponentTeamId) return;
    
    setIsAnalyzing(true);
    setAnalysisError('');
    setAnalysisResult(null);

    try {
      const opponentTeam = allTeams.find(t => t.id === opponentTeamId);
      const prompt = analysisType === 'hitting' 
        ? `You are an ELITE MLB The Show advanced scout and hitting coach. Analyze this hitting analysis screenshot like a professional baseball scout would analyze a hitter.

CONTEXT: This is from MLB The Show video game. The data shows how this player performed AGAINST their opponent's pitching.

ANALYZE THE SCREENSHOT AND EXTRACT:
1. **Batting Average by Pitch Type** - Look at the exact numbers shown for each pitch (4-Seam, Sinker, Cutter, Slider, Curveball, Changeup, etc.)
2. **Contact Rate** - Where are they making contact vs whiffing?
3. **Zone Coverage** - Are they covering inside, outside, up, down effectively?

PROVIDE MLB THE SHOW SPECIFIC ADVICE:

**PCI PLACEMENT RECOMMENDATIONS:**
- Where should they START their PCI? (middle, up, down, inside, outside)
- What zone should they PROTECT first?
- Should they sit on a specific pitch type?

**TIMING ANALYSIS:**
- Are they early or late on fastballs? (low avg on 4-seam = likely late)
- Are they getting fooled by offspeed? (low avg on changeup = early)

**PITCH RECOGNITION:**
- What pitches should they lay off? (look for low avg AND high out%)
- What pitches should they attack? (high avg pitches)
- At what counts should they be aggressive?

**HOT/COLD ZONES:**
- Based on results, what zones are HOT? (attack these)
- What zones are COLD? (protect/lay off)

**ACTIONABLE TIPS FOR NEXT GAME:**
- Give 2-3 SPECIFIC MLB The Show tips like:
  - "Sit fastball up in the zone, your PCI starting position should be belt-high"
  - "You're getting beat inside - cheat your PCI inside against hard throwers"
  - "Lay off sliders down and away - you're 0-for with 3 Ks on this pitch"
  - "In 2-strike counts, expand your zone coverage down"

Format your response as JSON:
{
  "pitchesStruggled": ["pitch1 with specific context", "pitch2 with specific context"],
  "pitchesHitWell": ["pitch1 with specific context", "pitch2 with specific context"],
  "battingAvgByPitch": {"4-Seam": ".XXX", "Slider": ".XXX", etc},
  "tendencies": ["specific tendency 1", "specific tendency 2"],
  "recommendations": [
    "PCI TIP: [specific PCI placement advice for MLB The Show]",
    "TIMING TIP: [specific timing adjustment]",
    "PITCH SELECTION: [what to swing at vs lay off]"
  ],
  "rawAnalysis": "Brief 2-3 sentence scout report summary with key batting averages mentioned",
  "encouragement": "[Specific positive feedback on what they did well - mention actual pitches/averages]",
  "improvement": "[ONE key focus area with specific PCI/timing/pitch selection advice for MLB The Show]"
}`
        : `You are an ELITE MLB The Show advanced scout and pitching coach. Analyze this pitching analysis screenshot like a professional baseball scout would break down an opponent's hitting weaknesses.

CONTEXT: This is from MLB The Show video game. The data shows how your OPPONENT hit against your pitching. Use this to scout THEIR weaknesses.

ANALYZE THE SCREENSHOT AND EXTRACT:
1. **Opponent Batting Average by Pitch Type** - What pitches did they struggle with? (low avg = your effective pitches)
2. **Strikeout Pitches** - What got them out? High K rate pitches are money
3. **Pitches They Crushed** - What should you avoid? (high avg pitches)

PROVIDE MLB THE SHOW SPECIFIC SCOUTING INTEL:

**OPPONENT'S WEAKNESSES (EXPLOIT THESE):**
- What pitch types gave them trouble? (low avg = they can't hit it)
- What zones were cold for them?
- Were they early or late on certain pitches?

**OPPONENT'S STRENGTHS (AVOID THESE):**
- What did they barrel up? (high avg pitches)
- What zones are dangerous to throw to?

**SEQUENCE RECOMMENDATIONS:**
- What should be your "out pitch"? (best K pitch)
- What should you throw early in counts?
- What to throw with 2 strikes?

**LOCATION STRATEGY:**
- Where should you live with fastballs?
- Where to bury breaking balls?
- What quadrant of the zone to avoid?

**SCOUTING REPORT FOR NEXT MATCHUP:**
- Give 2-3 SPECIFIC game plan tips like:
  - "Attack with sliders down and away - they're batting .091 against it"
  - "Avoid middle-middle fastballs - they crushed 4-seams for .500 avg"
  - "Your changeup is effective - use it as your put-away pitch"
  - "They struggle with anything below the zone - bury your curve"

Format your response as JSON:
{
  "pitchesStruggled": ["Their weakness 1 with avg", "Their weakness 2 with avg"],
  "pitchesHitWell": ["Pitch to avoid 1 with avg", "Pitch to avoid 2 with avg"],
  "battingAvgByPitch": {"4-Seam": ".XXX", "Slider": ".XXX", etc},
  "tendencies": ["Their tendency 1", "Their tendency 2"],
  "recommendations": [
    "OUT PITCH: [your best strikeout weapon against this opponent]",
    "ATTACK ZONE: [where to pound the strike zone]",
    "AVOID: [what pitch/location to stay away from]"
  ],
  "rawAnalysis": "Brief 2-3 sentence scouting report on this opponent with key weaknesses noted",
  "encouragement": "[Specific positive feedback on what worked - mention actual pitches and opponent's low averages]",
  "improvement": "[ONE key adjustment for next time facing this opponent - specific pitch/location strategy]"
}`;

      const response = await analyzeImageWithAI(uploadedImages, prompt);
      
      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setAnalysisResult(parsed);
        
        // Auto-save to database
        setSaveStatus('saving');
        const report: Omit<DBScoutingReport, 'id' | 'created_at'> = {
          user_id: userId,
          team_id: userTeamId || '',
          opponent_team_id: opponentTeamId,
          analysis_type: analysisType,
          pitches_struggled: parsed.pitchesStruggled || [],
          pitches_hit_well: parsed.pitchesHitWell || [],
          batting_avg_by_pitch: parsed.battingAvgByPitch || {},
          tendencies: parsed.tendencies || [],
          recommendations: parsed.recommendations || [],
          raw_analysis: parsed.rawAnalysis || response,
          screenshot_url: null, // Could store in Supabase storage later
        };
        
        const result = await saveScoutingReport(report);
        if (result.success) {
          setSaveStatus('saved');
          // Refresh reports
          const updatedReports = await getScoutingReports(userId);
          setMyReports(updatedReports);
          
          // Log activity and award points for analysis upload
          if (userId && userTeamId) {
            logMemberActivity({
              user_id: userId,
              team_id: userTeamId,
              activity_type: 'analysis_upload',
              metadata: {
                opponentTeamId,
                analysisType,
              },
            });
            // Award points and check for badges
            awardActivity(userId, 'analysis_upload');
          }
        } else {
          setSaveStatus('error');
        }
      } else {
        // Fallback if not JSON
        setAnalysisResult({
          pitchesStruggled: [],
          pitchesHitWell: [],
          battingAvgByPitch: {},
          tendencies: [],
          recommendations: [],
          rawAnalysis: response,
          encouragement: '',
          improvement: '',
        });
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'Analysis failed');
    }
    
    setIsAnalyzing(false);
  };

  const getTeamName = (teamId: string) => {
    return allTeams.find(t => t.id === teamId)?.name || teamId;
  };

  return (
    <div className="space-y-6">
      {/* View Mode Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setViewMode('upload')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewMode === 'upload'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Upload className="w-4 h-4" />
          New Analysis
        </button>
        <button
          onClick={() => setViewMode('my-reports')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewMode === 'my-reports'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="w-4 h-4" />
          My Reports
          {myReports.length > 0 && (
            <Badge variant="outline" className="text-xs">{myReports.length}</Badge>
          )}
        </button>
        <button
          onClick={() => setViewMode('opponent-files')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            viewMode === 'opponent-files'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Folder className="w-4 h-4" />
          Opponent Files
        </button>
      </div>

      {/* Upload New Analysis View */}
      {viewMode === 'upload' && (
        <div className="space-y-6">
          {/* Tutorial Section */}
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-blue-400">
                <HelpCircle className="w-5 h-5" />
                How to Get Your Screenshots
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Hitting Analysis */}
                <div className="p-4 bg-background/50 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Crosshair className="w-5 h-5 text-jkap-red-500" />
                    <h4 className="font-medium text-foreground">Hitting Analysis</h4>
                  </div>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex gap-2">
                      <span className="text-jkap-red-500 font-bold">1.</span>
                      After the game ends, go to <span className="text-foreground font-medium">Post-Game Summary</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-jkap-red-500 font-bold">2.</span>
                      Select <span className="text-foreground font-medium">Hitting Analysis</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-jkap-red-500 font-bold">3.</span>
                      Screenshot the <span className="text-foreground font-medium">pitch type chart</span> showing your results
                    </li>
                    <li className="flex gap-2">
                      <span className="text-jkap-red-500 font-bold">4.</span>
                      Upload it here!
                    </li>
                  </ol>
                </div>

                {/* Pitching Analysis */}
                <div className="p-4 bg-background/50 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-jkap-red-500" />
                    <h4 className="font-medium text-foreground">Pitching Analysis</h4>
                  </div>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex gap-2">
                      <span className="text-jkap-red-500 font-bold">1.</span>
                      After the game ends, go to <span className="text-foreground font-medium">Post-Game Summary</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-jkap-red-500 font-bold">2.</span>
                      Select <span className="text-foreground font-medium">Pitching Analysis</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-jkap-red-500 font-bold">3.</span>
                      Screenshot showing <span className="text-foreground font-medium">opponent's batting avg by pitch type</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-jkap-red-500 font-bold">4.</span>
                      Upload it here!
                    </li>
                  </ol>
                </div>
              </div>

              {/* Video Tutorial Placeholder */}
              {tutorialVideoUrl ? (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Play className="w-4 h-4 text-jkap-red-500" />
                    <span className="text-sm font-medium text-foreground">Video Tutorial</span>
                  </div>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    <iframe
                      src={tutorialVideoUrl}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-dashed border-border text-center">
                  <Play className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Video tutorial coming soon!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    We'll walk you through exactly how to capture and upload your game analysis.
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground text-center pt-2">
                💡 <strong>Pro tip:</strong> On PlayStation, hold the Share button to screenshot. On Xbox, press the Xbox button + Y.
              </p>
            </CardContent>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-jkap-red-500" />
                Upload Game Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Analysis Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Analysis Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAnalysisType('hitting')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                      analysisType === 'hitting'
                        ? 'border-jkap-red-500 bg-jkap-red-500/10 text-jkap-red-500'
                        : 'border-border bg-muted text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <Crosshair className="w-4 h-4" />
                    Hitting
                  </button>
                  <button
                    onClick={() => setAnalysisType('pitching')}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                      analysisType === 'pitching'
                        ? 'border-jkap-red-500 bg-jkap-red-500/10 text-jkap-red-500'
                        : 'border-border bg-muted text-muted-foreground hover:border-border/80'
                    }`}
                  >
                    <Target className="w-4 h-4" />
                    Pitching
                  </button>
                </div>
              </div>

              {/* Opponent Selection */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Who did you play against?
                </label>
                <select
                  value={opponentTeamId}
                  onChange={(e) => setOpponentTeamId(e.target.value)}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-jkap-red-500"
                >
                  <option value="">Select opponent team</option>
                  {allTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Image Upload - Multiple Images */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-foreground">
                    Upload Screenshots ({uploadedImages.length}/{MAX_IMAGES})
                  </label>
                  {uploadedImages.length > 0 && (
                    <button
                      onClick={handleClearAllImages}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                {/* Uploaded Images Grid */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {uploadedImages.map((img, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={img} 
                          alt={`Screenshot ${index + 1}`} 
                          className="w-full h-24 object-cover rounded-lg border border-border"
                        />
                        <button
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Dropzone */}
                {uploadedImages.length < MAX_IMAGES && (
                  <div 
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-all ${
                      uploadedImages.length > 0 
                        ? 'border-jkap-red-500/50 bg-jkap-red-500/5' 
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <label className="cursor-pointer block">
                      <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">
                        {uploadedImages.length === 0 
                          ? 'Click to upload screenshots' 
                          : `Add more (${MAX_IMAGES - uploadedImages.length} remaining)`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG up to 10MB • Up to {MAX_IMAGES} images
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
                
                {uploadedImages.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    💡 Upload multiple screenshots for more comprehensive analysis
                  </p>
                )}
              </div>

              {/* Analyze Button */}
              <Button
                onClick={handleAnalyze}
                disabled={uploadedImages.length === 0 || !opponentTeamId || isAnalyzing || !hasApiKey}
                fullWidth
                icon={isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              >
                {isAnalyzing 
                  ? 'Analyzing... Please wait' 
                  : `✨ Analyze ${uploadedImages.length > 1 ? `${uploadedImages.length} Screenshots` : 'with AI'}`
                }
              </Button>
              
              {isAnalyzing && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                  🔄 Processing images with AI... This may take 10-30 seconds
                </p>
              )}

              {!hasApiKey && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
                  <p className="text-amber-400 text-sm mb-2">
                    ⚠️ OpenAI API key required for AI analysis
                  </p>
                  <a 
                    href="/tools/game-recap" 
                    className="text-xs text-amber-300 underline hover:text-amber-200"
                  >
                    Click here to add your API key in Game Recap settings →
                  </a>
                </div>
              )}

              {analysisError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg space-y-2">
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {analysisError}
                  </p>
                  {(analysisError.includes('Rate limit') || analysisError.includes('Too many') || analysisError.includes('wait')) && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>💡 <strong>Quick fixes:</strong></p>
                      <ul className="list-disc list-inside ml-2">
                        <li>Wait 60 seconds and try again</li>
                        <li>Upload fewer images (try 1-2 instead of 4)</li>
                        <li>Use smaller/lower resolution screenshots</li>
                      </ul>
                    </div>
                  )}
                  {analysisError.includes('quota') && (
                    <div className="text-xs text-amber-400">
                      ⚠️ The OpenAI account may need more credits. Contact the commissioner.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Analysis Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-jkap-red-500" />
                Analysis Results
                {saveStatus === 'saved' && (
                  <Badge variant="default" className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Saved
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!analysisResult ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Upload a screenshot and analyze to see results</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Opponent */}
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Opponent</p>
                    <p className="font-medium text-foreground">{getTeamName(opponentTeamId)}</p>
                  </div>

                  {/* Summary */}
                  {analysisResult.rawAnalysis && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2">Summary</h4>
                      <p className="text-sm text-muted-foreground">{analysisResult.rawAnalysis}</p>
                    </div>
                  )}

                  {/* Encouragement - What you did well! */}
                  {analysisResult.encouragement && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                        🌟 What You Did Well
                      </h4>
                      <p className="text-sm text-emerald-200">{analysisResult.encouragement}</p>
                    </div>
                  )}

                  {/* Improvement - What to work on */}
                  {analysisResult.improvement && (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
                        🎯 Focus For Next Game
                      </h4>
                      <p className="text-sm text-amber-200">{analysisResult.improvement}</p>
                    </div>
                  )}

                  {/* Struggled Against */}
                  {analysisResult.pitchesStruggled.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-400 mb-2">❌ Struggled Against</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.pitchesStruggled.map((pitch, i) => (
                          <Badge key={i} variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                            {pitch}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hit Well */}
                  {analysisResult.pitchesHitWell.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-emerald-400 mb-2">✅ Hit Well</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.pitchesHitWell.map((pitch, i) => (
                          <Badge key={i} variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                            {pitch}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Batting Avg by Pitch */}
                  {Object.keys(analysisResult.battingAvgByPitch).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2">📊 Avg by Pitch</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(analysisResult.battingAvgByPitch).map(([pitch, avg]) => (
                          <div key={pitch} className="flex justify-between p-2 bg-muted rounded text-sm">
                            <span className="text-muted-foreground">{pitch}</span>
                            <span className="font-mono text-foreground">{avg}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tendencies */}
                  {analysisResult.tendencies.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2">📝 Tendencies</h4>
                      <ul className="space-y-1">
                        {analysisResult.tendencies.map((tendency, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-jkap-red-500">•</span>
                            {tendency}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysisResult.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2">💡 Recommendations</h4>
                      <ul className="space-y-1">
                        {analysisResult.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <Zap className="w-3 h-3 text-amber-400 flex-shrink-0 mt-1" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      )}

      {/* My Reports View */}
      {viewMode === 'my-reports' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-jkap-red-500" />
              My Game Reports
              <Badge variant="outline" className="ml-2">{myReports.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingReports ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : myReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>No reports yet. Upload your first game analysis!</p>
                <Button 
                  variant="primary" 
                  className="mt-4"
                  onClick={() => setViewMode('upload')}
                >
                  <Upload className="w-4 h-4" />
                  New Analysis
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myReports.map((report) => (
                  <div 
                    key={report.id}
                    className="p-4 bg-muted rounded-lg border border-border hover:border-jkap-red-500/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={report.analysis_type === 'hitting' ? 'default' : 'outline'}>
                          {report.analysis_type === 'hitting' ? <Crosshair className="w-3 h-3 mr-1" /> : <Target className="w-3 h-3 mr-1" />}
                          {report.analysis_type}
                        </Badge>
                        <span className="text-sm text-foreground font-medium">
                          vs {getTeamName(report.opponent_team_id)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {report.raw_analysis && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {report.raw_analysis}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {report.pitches_struggled?.slice(0, 3).map((pitch, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-red-500/10 text-red-400">
                          ❌ {pitch}
                        </Badge>
                      ))}
                      {report.pitches_hit_well?.slice(0, 3).map((pitch, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400">
                          ✅ {pitch}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Opponent Files View */}
      {viewMode === 'opponent-files' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-jkap-red-500" />
              Opponent Files
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Opponent
              </label>
              <select
                value={selectedOpponentForFiles}
                onChange={(e) => setSelectedOpponentForFiles(e.target.value)}
                className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:border-jkap-red-500"
              >
                <option value="">Select a team to view intel</option>
                {allTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedOpponentForFiles && (
              <>
                {opponentReports.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Folder className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No intel on {getTeamName(selectedOpponentForFiles)} yet.</p>
                    <p className="text-xs mt-1">Play them and upload your analysis!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Aggregated Stats */}
                    <div className="p-4 bg-jkap-red-500/10 border border-jkap-red-500/30 rounded-lg">
                      <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-jkap-red-500" />
                        Intel Summary: {getTeamName(selectedOpponentForFiles)}
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Games Analyzed</p>
                          <p className="font-medium text-foreground">{opponentReports.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Common Weaknesses</p>
                          <div className="flex flex-wrap gap-1">
                            {/* Aggregate common pitches they struggled against */}
                            {Array.from(new Set(opponentReports.flatMap(r => r.pitches_struggled || []))).slice(0, 3).map((pitch, i) => (
                              <Badge key={i} variant="outline" className="text-xs bg-red-500/10 text-red-400">
                                {pitch}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Individual Reports */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground">Game History</h4>
                      {opponentReports.map((report) => (
                        <div 
                          key={report.id}
                          className="p-3 bg-muted rounded-lg text-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-xs">
                              {report.analysis_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(report.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-muted-foreground line-clamp-2">{report.raw_analysis}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// COMING SOON COMPONENT
// =============================================================================

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
        <Lock className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="text-2xl font-display text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">{description}</p>
      <Badge variant="outline" className="text-sm">
        <Clock className="w-3 h-3 mr-1" />
        Coming Soon
      </Badge>
    </div>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function PlayersAcademyPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('scouting');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-jkap-red-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-display text-foreground mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-6">
              Access the Players Academy to level up your game.
            </p>
            <Button onClick={() => router.push('/login')}>
              Login to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeTabData = TABS.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/tools')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-jkap-red-500 to-jkap-red-600 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="font-display text-xl text-foreground">PLAYERS ACADEMY</h1>
                  <p className="text-xs text-muted-foreground">Level up your game</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.available && setActiveTab(tab.id)}
                disabled={!tab.available}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-jkap-red-500 text-jkap-red-500'
                    : tab.available
                    ? 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                    : 'border-transparent text-muted-foreground/50 cursor-not-allowed'
                }`}
              >
                {tab.icon}
                {tab.label}
                {!tab.available && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    Soon
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Description */}
      {activeTabData && (
        <div className="bg-muted/50 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-sm text-muted-foreground">{activeTabData.description}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'scouting' && (
          <ScoutingHub userId={user?.id || ''} userTeamId={user?.teamId} />
        )}
        {activeTab === 'roster' && (
          <ComingSoon 
            title="Roster Advice" 
            description="Get AI-powered lineup suggestions based on your roster and opponent matchups."
          />
        )}
        {activeTab === 'classroom' && (
          <ComingSoon 
            title="Classroom" 
            description="Access curated tutorials and guides from the best players in the game."
          />
        )}
      </main>
    </div>
  );
}

