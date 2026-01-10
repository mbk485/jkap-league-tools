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
} from 'lucide-react';
import { MLB_TEAMS } from '@/types/league';
import { analyzeImageWithAI, hasApiKey } from '@/lib/openai';
import { 
  saveScoutingReport, 
  getScoutingReports, 
  getOpponentReports,
  DBScoutingReport 
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

function ScoutingHub({ userId, userTeamId }: { userId: string; userTeamId?: string }) {
  const [analysisType, setAnalysisType] = useState<'hitting' | 'pitching'>('hitting');
  const [opponentTeamId, setOpponentTeamId] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Reports state
  const [myReports, setMyReports] = useState<DBScoutingReport[]>([]);
  const [opponentReports, setOpponentReports] = useState<DBScoutingReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [viewMode, setViewMode] = useState<'upload' | 'my-reports' | 'opponent-files'>('upload');
  const [selectedOpponentForFiles, setSelectedOpponentForFiles] = useState('');

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
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setAnalysisResult(null);
      setAnalysisError('');
      setSaveStatus('idle');
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!uploadedImage || !opponentTeamId) return;
    
    setIsAnalyzing(true);
    setAnalysisError('');
    setAnalysisResult(null);

    try {
      const opponentTeam = allTeams.find(t => t.id === opponentTeamId);
      const prompt = analysisType === 'hitting' 
        ? `Analyze this MLB The Show hitting analysis screenshot. Extract:
1. What pitch types did the player struggle against (high outs, low avg)?
2. What pitch types did they hit well?
3. Batting average by pitch type if visible
4. Any tendencies you notice (early/late timing, pull heavy, etc.)
5. 2-3 specific recommendations to improve

Format your response as JSON:
{
  "pitchesStruggled": ["pitch1", "pitch2"],
  "pitchesHitWell": ["pitch1", "pitch2"],
  "battingAvgByPitch": {"Fastball": ".250", "Slider": ".150"},
  "tendencies": ["tendency1", "tendency2"],
  "recommendations": ["rec1", "rec2"],
  "rawAnalysis": "Brief summary paragraph"
}`
        : `Analyze this MLB The Show pitching analysis screenshot. Extract:
1. What pitch types were most effective (high outs, low avg against)?
2. What pitch types got hit hard?
3. Opponent batting average by pitch type if visible
4. Any patterns you notice (certain counts, locations, sequences)
5. 2-3 specific recommendations

Format your response as JSON:
{
  "pitchesStruggled": ["pitch1", "pitch2"],
  "pitchesHitWell": ["pitch1", "pitch2"],
  "battingAvgByPitch": {"Fastball": ".250", "Slider": ".150"},
  "tendencies": ["tendency1", "tendency2"],
  "recommendations": ["rec1", "rec2"],
  "rawAnalysis": "Brief summary paragraph"
}`;

      const response = await analyzeImageWithAI(uploadedImage, prompt);
      
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

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Upload Screenshot
                </label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                    uploadedImage 
                      ? 'border-jkap-red-500 bg-jkap-red-500/5' 
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  {uploadedImage ? (
                    <div className="space-y-3">
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded analysis" 
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => {
                          setUploadedImage(null);
                          setAnalysisResult(null);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Drag & drop or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG up to 10MB
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Analyze Button */}
              <Button
                onClick={handleAnalyze}
                disabled={!uploadedImage || !opponentTeamId || isAnalyzing || !hasApiKey()}
                fullWidth
                icon={isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              >
                {isAnalyzing ? 'Analyzing...' : '✨ Analyze with AI'}
              </Button>

              {!hasApiKey() && (
                <p className="text-xs text-amber-500 text-center">
                  ⚠️ OpenAI API key required. Add it in Game Recap settings.
                </p>
              )}

              {analysisError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {analysisError}
                  </p>
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

