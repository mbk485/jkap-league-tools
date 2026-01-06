'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Player {
  id: number;
  name: string;
  position: string;
  rating: number;
  cardType: string;
  pickedBy?: string;
  pickNumber?: number;
}

interface Team {
  name: string;
  picks: Player[];
}

// Card type colors
const cardTypeColors: Record<string, { bg: string; text: string; border: string }> = {
  'Diamond': { bg: 'rgba(168, 85, 247, 0.2)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.5)' },
  'Gold': { bg: 'rgba(234, 179, 8, 0.2)', text: '#facc15', border: 'rgba(234, 179, 8, 0.5)' },
  'Silver': { bg: 'rgba(156, 163, 175, 0.2)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.5)' },
  'Bronze': { bg: 'rgba(180, 83, 9, 0.2)', text: '#d97706', border: 'rgba(180, 83, 9, 0.5)' },
  'Live': { bg: 'rgba(34, 197, 94, 0.2)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.5)' },
  'Legend': { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', border: 'rgba(239, 68, 68, 0.5)' },
  'Milestone': { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.5)' },
  'Awards': { bg: 'rgba(249, 115, 22, 0.2)', text: '#fb923c', border: 'rgba(249, 115, 22, 0.5)' },
  'Finest': { bg: 'rgba(236, 72, 153, 0.2)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.5)' },
  'Signature': { bg: 'rgba(20, 184, 166, 0.2)', text: '#2dd4bf', border: 'rgba(20, 184, 166, 0.5)' },
  'All-Star': { bg: 'rgba(99, 102, 241, 0.2)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.5)' },
  'Future Stars': { bg: 'rgba(34, 211, 238, 0.2)', text: '#22d3ee', border: 'rgba(34, 211, 238, 0.5)' },
  'Breakout': { bg: 'rgba(251, 191, 36, 0.2)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.5)' },
  'Takeover': { bg: 'rgba(139, 92, 246, 0.2)', text: '#a78bfa', border: 'rgba(139, 92, 246, 0.5)' },
};

const getCardTypeStyle = (cardType: string) => {
  const normalized = Object.keys(cardTypeColors).find(
    key => cardType.toLowerCase().includes(key.toLowerCase())
  );
  return cardTypeColors[normalized || ''] || { bg: 'rgba(100, 100, 100, 0.2)', text: '#9ca3af', border: 'rgba(100, 100, 100, 0.5)' };
};

const getRatingColor = (rating: number) => {
  if (rating >= 95) return '#c084fc'; // Diamond purple
  if (rating >= 85) return '#facc15'; // Gold
  if (rating >= 80) return '#9ca3af'; // Silver
  return '#d97706'; // Bronze
};

export default function DraftPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [currentPick, setCurrentPick] = useState(0);
  const [timer, setTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [draftStarted, setDraftStarted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('All');
  const [draftHistory, setDraftHistory] = useState<Player[]>([]);
  const [showSetup, setShowSetup] = useState(true);
  const [teamInput, setTeamInput] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Snake draft logic - get current team
  const getCurrentTeam = useCallback(() => {
    if (draftOrder.length === 0) return '';
    const round = Math.floor(currentPick / draftOrder.length);
    const positionInRound = currentPick % draftOrder.length;
    // Snake: even rounds go forward, odd rounds go backward
    const teamIndex = round % 2 === 0 
      ? positionInRound 
      : draftOrder.length - 1 - positionInRound;
    return draftOrder[teamIndex] || '';
  }, [currentPick, draftOrder]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning && timer > 0) {
      timerRef.current = setTimeout(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      // Play alert sound when timer expires
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleAQAL5Ple0kAAPmZ/v/HggD/Xfn/KP8A/wT8/wD/AP8A');
        audio.play().catch(() => {});
      } catch {}
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isTimerRunning, timer]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'players' | 'teams') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (type === 'players') {
        // Skip header row, parse CSV
        // Supports 3 columns (Name, Position, Overall) or 4 columns (Name, Position, Overall, Card Type)
        const parsed = lines.slice(1).map((line, idx) => {
          const parts = line.split(',').map(p => p.trim().replace(/"/g, ''));
          return {
            id: idx,
            name: parts[0] || '',
            position: parts[1] || '',
            rating: parseInt(parts[2]) || 0,
            cardType: parts[3] || '', // Optional - will be empty if not provided
          };
        }).filter(p => p.name);
        setPlayers(parsed);
      } else {
        // Teams - just a list of names
        const teamNames = lines.map(l => l.trim().replace(/"/g, '')).filter(Boolean);
        setDraftOrder(teamNames);
        setTeams(teamNames.map(name => ({ name, picks: [] })));
      }
    };
    reader.readAsText(file);
  };

  const startDraft = () => {
    if (players.length === 0 || draftOrder.length === 0) return;
    setShowSetup(false);
    setDraftStarted(true);
    setTimer(60);
    setIsTimerRunning(true);
  };

  const makePick = (player: Player) => {
    if (!draftStarted) return;
    
    const currentTeam = getCurrentTeam();
    const updatedPlayer = { 
      ...player, 
      pickedBy: currentTeam, 
      pickNumber: currentPick + 1 
    };
    
    // Update players
    setPlayers(prev => prev.map(p => 
      p.id === player.id ? updatedPlayer : p
    ));
    
    // Update team picks
    setTeams(prev => prev.map(t => 
      t.name === currentTeam 
        ? { ...t, picks: [...t.picks, updatedPlayer] }
        : t
    ));
    
    // Add to history
    setDraftHistory(prev => [...prev, updatedPlayer]);
    
    // Next pick
    setCurrentPick(prev => prev + 1);
    setTimer(60);
    setIsTimerRunning(true);
  };

  const undoLastPick = () => {
    if (draftHistory.length === 0) return;
    
    const lastPick = draftHistory[draftHistory.length - 1];
    
    // Check if it was a skip (no player id)
    if (lastPick.id === -1) {
      // Just remove from history and go back
      setDraftHistory(prev => prev.slice(0, -1));
      setCurrentPick(prev => prev - 1);
      setTimer(60);
      return;
    }
    
    // Remove from players
    setPlayers(prev => prev.map(p => 
      p.id === lastPick.id ? { ...p, pickedBy: undefined, pickNumber: undefined } : p
    ));
    
    // Remove from team
    setTeams(prev => prev.map(t => 
      t.name === lastPick.pickedBy 
        ? { ...t, picks: t.picks.filter(p => p.id !== lastPick.id) }
        : t
    ));
    
    // Remove from history
    setDraftHistory(prev => prev.slice(0, -1));
    setCurrentPick(prev => prev - 1);
    setTimer(60);
  };

  const skipPick = () => {
    if (!draftStarted) return;
    
    const currentTeam = getCurrentTeam();
    const skipEntry: Player = {
      id: -1,
      name: '(SKIPPED)',
      position: '-',
      rating: 0,
      cardType: '',
      pickedBy: currentTeam,
      pickNumber: currentPick + 1,
    };
    
    // Add to history
    setDraftHistory(prev => [...prev, skipEntry]);
    
    // Next pick
    setCurrentPick(prev => prev + 1);
    setTimer(60);
    setIsTimerRunning(true);
  };

  const downloadResults = () => {
    // Create CSV content with original format + Drafted By filled in
    const headers = ['Player', 'Position', 'Overall', 'Drafted By'];
    const rows = players.map(p => [
      p.name,
      p.position,
      p.rating.toString(),
      p.pickedBy || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JKAP_Draft_Results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addTeamsManually = () => {
    const teamNames = teamInput.split('\n').map(t => t.trim()).filter(Boolean);
    if (teamNames.length > 0) {
      setDraftOrder(teamNames);
      setTeams(teamNames.map(name => ({ name, picks: [] })));
      setTeamInput('');
    }
  };

  // Load sample data for quick testing
  const loadSampleData = () => {
    const samplePlayers: Player[] = [
      { id: 0, name: 'Shohei Ohtani', position: 'SP', rating: 99, cardType: 'Live Diamond' },
      { id: 1, name: 'Aaron Judge', position: 'RF', rating: 98, cardType: 'Live Diamond' },
      { id: 2, name: 'Mike Trout', position: 'CF', rating: 97, cardType: 'Live Diamond' },
      { id: 3, name: 'Mookie Betts', position: '2B', rating: 96, cardType: 'Live Diamond' },
      { id: 4, name: 'Freddie Freeman', position: '1B', rating: 95, cardType: 'Live Diamond' },
      { id: 5, name: 'Ronald Acuna Jr', position: 'CF', rating: 95, cardType: 'Live Diamond' },
      { id: 6, name: 'Corey Seager', position: 'SS', rating: 94, cardType: 'Live Diamond' },
      { id: 7, name: 'Jose Ramirez', position: '3B', rating: 94, cardType: 'Live Diamond' },
      { id: 8, name: 'Gerrit Cole', position: 'SP', rating: 94, cardType: 'Live Diamond' },
      { id: 9, name: 'Marcus Semien', position: '2B', rating: 93, cardType: 'Live Diamond' },
      { id: 10, name: 'Trea Turner', position: 'SS', rating: 93, cardType: 'Live Diamond' },
      { id: 11, name: 'Clayton Kershaw', position: 'SP', rating: 93, cardType: 'Legend' },
      { id: 12, name: 'Manny Machado', position: '3B', rating: 93, cardType: 'Live Diamond' },
      { id: 13, name: 'Corbin Burnes', position: 'SP', rating: 93, cardType: 'Live Diamond' },
      { id: 14, name: 'Pete Alonso', position: '1B', rating: 92, cardType: 'Live Diamond' },
      { id: 15, name: 'Bryce Harper', position: 'RF', rating: 92, cardType: 'Live Diamond' },
      { id: 16, name: 'Juan Soto', position: 'RF', rating: 92, cardType: 'Live Diamond' },
      { id: 17, name: 'Zack Wheeler', position: 'SP', rating: 92, cardType: 'Live Diamond' },
      { id: 18, name: 'Julio Rodriguez', position: 'CF', rating: 91, cardType: 'Live Diamond' },
      { id: 19, name: 'Spencer Strider', position: 'SP', rating: 91, cardType: 'Live Diamond' },
      { id: 20, name: 'Max Scherzer', position: 'SP', rating: 91, cardType: 'Legend' },
      { id: 21, name: 'Jacob deGrom', position: 'SP', rating: 97, cardType: 'Legend' },
      { id: 22, name: 'Mariano Rivera', position: 'CP', rating: 99, cardType: 'Legend' },
      { id: 23, name: 'Bo Bichette', position: 'SS', rating: 90, cardType: 'Gold' },
      { id: 24, name: 'Vladimir Guerrero Jr', position: '1B', rating: 90, cardType: 'Gold' },
    ];
    const sampleTeams = ['Team Alpha', 'Team Bravo', 'Team Charlie', 'Team Delta'];
    setPlayers(samplePlayers);
    setDraftOrder(sampleTeams);
    setTeams(sampleTeams.map(name => ({ name, picks: [] })));
  };

  const availablePlayers = players.filter(p => !p.pickedBy);
  const filteredPlayers = availablePlayers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.cardType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = positionFilter === 'All' || p.position === positionFilter;
    return matchesSearch && matchesPosition;
  });

  const positions = ['All', ...Array.from(new Set(players.map(p => p.position))).filter(Boolean)];

  const timerColor = timer <= 10 ? '#ef4444' : timer <= 30 ? '#f59e0b' : '#22c55e';
  const timerPercent = (timer / 60) * 100;

  if (showSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-display text-6xl text-white mb-2 tracking-wide">
              JKAP
            </h1>
            <h2 className="font-display text-4xl text-red-500 tracking-widest">
              DRAFT BOARD
            </h2>
            <p className="text-slate-400 mt-4 text-lg">Snake Draft • 1 Minute Timer</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Upload Players */}
            <div className="glass-card p-8">
              <h3 className="font-display text-2xl text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-lg">1</span>
                UPLOAD PLAYERS
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                CSV format: Name, Position, Overall
              </p>
              <label className="block">
                <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center hover:border-red-500 transition-colors cursor-pointer">
                  <input 
                    type="file" 
                    accept=".csv,.txt" 
                    onChange={(e) => handleFileUpload(e, 'players')}
                    className="hidden"
                  />
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-slate-300">Drop CSV or click to upload</p>
                  {players.length > 0 && (
                    <p className="text-green-400 mt-2 font-semibold">
                      ✓ {players.length} players loaded
                    </p>
                  )}
                </div>
              </label>
            </div>

            {/* Upload/Enter Teams */}
            <div className="glass-card p-8">
              <h3 className="font-display text-2xl text-white mb-4 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-lg">2</span>
                DRAFT ORDER
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Enter team names (one per line) or upload CSV
              </p>
              
              <textarea
                value={teamInput}
                onChange={(e) => setTeamInput(e.target.value)}
                placeholder="Team 1&#10;Team 2&#10;Team 3..."
                className="w-full h-32 bg-slate-800/50 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-500 mb-3 focus:border-red-500 focus:outline-none"
              />
              <button 
                onClick={addTeamsManually}
                className="btn btn-secondary w-full mb-4"
              >
                Set Draft Order
              </button>
              
              <div className="text-center text-slate-500 text-sm mb-4">— or —</div>
              
              <label className="block">
                <div className="border-2 border-dashed border-slate-600 rounded-xl p-4 text-center hover:border-red-500 transition-colors cursor-pointer">
                  <input 
                    type="file" 
                    accept=".csv,.txt" 
                    onChange={(e) => handleFileUpload(e, 'teams')}
                    className="hidden"
                  />
                  <p className="text-slate-400 text-sm">Upload team list CSV</p>
                </div>
              </label>
              
              {draftOrder.length > 0 && (
                <div className="mt-4 p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-green-400 font-semibold mb-2">✓ {draftOrder.length} teams set</p>
                  <div className="flex flex-wrap gap-2">
                    {draftOrder.map((team, i) => (
                      <span key={i} className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">
                        {i + 1}. {team}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Load Sample Data */}
          <div className="mt-8 text-center">
            <button
              onClick={loadSampleData}
              className="text-slate-400 hover:text-white underline text-sm"
            >
              Load sample data for quick test
            </button>
          </div>

          {/* Start Draft Button */}
          <div className="mt-8 text-center">
            <button
              onClick={startDraft}
              disabled={players.length === 0 || draftOrder.length === 0}
              className="btn btn-primary text-2xl px-16 py-6 font-display tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              START DRAFT 🎮
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Top Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div>
              <h1 className="font-display text-3xl text-white tracking-wide">JKAP DRAFT BOARD</h1>
              <p className="text-slate-400 text-sm">
                Round {Math.floor(currentPick / draftOrder.length) + 1} • 
                Pick {(currentPick % draftOrder.length) + 1} of {draftOrder.length}
              </p>
            </div>

            {/* Current Pick Info */}
            <div className="flex items-center gap-8">
              {/* On the Clock */}
              <div className="text-center">
                <p className="text-slate-400 text-sm uppercase tracking-wider">On The Clock</p>
                <p className="font-display text-4xl text-red-500">{getCurrentTeam()}</p>
              </div>

              {/* Timer */}
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="rgba(100,100,100,0.2)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke={timerColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - timerPercent / 100)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-4xl text-white">{timer}</span>
                  <span className="text-slate-400 text-xs">SEC</span>
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`px-6 py-2 rounded-lg font-semibold ${
                    isTimerRunning 
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' 
                      : 'bg-green-500/20 text-green-400 border border-green-500/50'
                  }`}
                >
                  {isTimerRunning ? '⏸ PAUSE' : '▶ START'}
                </button>
                <button
                  onClick={() => setTimer(60)}
                  className="px-6 py-2 rounded-lg font-semibold bg-slate-700/50 text-slate-300 border border-slate-600"
                >
                  ↻ RESET
                </button>
              </div>
            </div>

            {/* Skip & Undo Buttons */}
            <div className="flex gap-3">
              <button
                onClick={skipPick}
                className="px-6 py-3 rounded-lg font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/50 hover:bg-orange-500/30"
              >
                ⏭ SKIP PICK
              </button>
              <button
                onClick={undoLastPick}
                disabled={draftHistory.length === 0}
                className="px-6 py-3 rounded-lg font-semibold bg-red-500/20 text-red-400 border border-red-500/50 disabled:opacity-30"
              >
                ↩ UNDO
              </button>
              <button
                onClick={downloadResults}
                className="px-6 py-3 rounded-lg font-semibold bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30"
              >
                📥 DOWNLOAD
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Draft History */}
          <div className="col-span-2">
            <div className="glass-card p-4 sticky top-32">
              <h3 className="font-display text-xl text-white mb-4">DRAFT LOG</h3>
              <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {draftHistory.slice().reverse().map((pick, i) => (
                  <div 
                    key={pick.id}
                    className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs">
                        {pick.pickNumber}
                      </span>
                      <span className="text-red-400 font-semibold text-sm truncate">{pick.pickedBy}</span>
                    </div>
                    <p className="text-white font-medium truncate">{pick.name}</p>
                    <p className="text-slate-400 text-xs">{pick.position} • {pick.rating}</p>
                  </div>
                ))}
                {draftHistory.length === 0 && (
                  <p className="text-slate-500 text-sm text-center py-8">No picks yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Main - Available Players */}
          <div className="col-span-7">
            {/* Search and Filters */}
            <div className="mb-6 flex gap-4">
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-6 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-red-500 focus:outline-none text-lg"
              />
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-6 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white focus:border-red-500 focus:outline-none"
              >
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>

            {/* Available Players Count */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-2xl text-white">
                AVAILABLE PLAYERS 
                <span className="text-slate-400 text-lg ml-2">({filteredPlayers.length})</span>
              </h3>
            </div>

            {/* Player Grid */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 max-h-[calc(100vh-280px)] overflow-y-auto pr-2">
              {filteredPlayers.map((player) => {
                const cardStyle = getCardTypeStyle(player.cardType);
                return (
                  <button
                    key={player.id}
                    onClick={() => makePick(player)}
                    className="group relative p-4 rounded-xl border-2 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${cardStyle.bg} 0%, rgba(30,41,59,0.8) 100%)`,
                      borderColor: cardStyle.border,
                    }}
                  >
                    {/* Rating Badge */}
                    <div 
                      className="absolute top-3 right-3 w-12 h-12 rounded-lg flex items-center justify-center font-display text-2xl"
                      style={{ 
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        color: getRatingColor(player.rating)
                      }}
                    >
                      {player.rating}
                    </div>

                    {/* Player Info */}
                    <div className="pr-14">
                      <p className="text-white font-bold text-lg truncate">{player.name}</p>
                      <p className="text-slate-400">{player.position}</p>
                      {player.cardType && (
                        <span 
                          className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold"
                          style={{ 
                            backgroundColor: cardStyle.bg,
                            color: cardStyle.text,
                            border: `1px solid ${cardStyle.border}`
                          }}
                        >
                          {player.cardType}
                        </span>
                      )}
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-green-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="font-display text-2xl text-green-400">+ DRAFT</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Sidebar - Team Rosters */}
          <div className="col-span-3">
            <div className="glass-card p-4 sticky top-32">
              <h3 className="font-display text-xl text-white mb-4">TEAM ROSTERS</h3>
              <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                {teams.map((team, idx) => {
                  const isOnClock = team.name === getCurrentTeam();
                  return (
                    <div 
                      key={team.name}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isOnClock 
                          ? 'bg-red-500/10 border-red-500 shadow-lg shadow-red-500/20' 
                          : 'bg-slate-800/50 border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs">
                            {idx + 1}
                          </span>
                          <h4 className={`font-bold ${isOnClock ? 'text-red-400' : 'text-white'}`}>
                            {team.name}
                          </h4>
                        </div>
                        <span className="text-slate-400 text-sm">{team.picks.length} picks</span>
                      </div>
                      
                      {team.picks.length > 0 ? (
                        <div className="space-y-1">
                          {team.picks.map((pick) => (
                            <div 
                              key={pick.id}
                              className="flex items-center justify-between text-sm py-1 px-2 rounded bg-slate-900/50"
                            >
                              <span className="text-slate-300 truncate">{pick.name}</span>
                              <span 
                                className="text-xs font-mono"
                                style={{ color: getRatingColor(pick.rating) }}
                              >
                                {pick.rating}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-sm">No picks yet</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

