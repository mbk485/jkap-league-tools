'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { MLB_TEAMS } from '@/types/league';
import {
  Briefcase,
  ArrowLeftRight,
  Search,
  Users,
  Send,
  CheckCircle,
  X,
  Clock,
  FileText,
  AlertTriangle,
  ChevronRight,
  Plus,
  Minus,
  Eye,
  MessageSquare,
  Shield,
  Bell,
  ExternalLink,
  Trash2,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  Filter,
  Star,
} from 'lucide-react';

// Trade status types
type TradeStatus = 
  | 'draft'           // Trade being built
  | 'proposed'        // Sent to other team
  | 'countered'       // Other team sent counter
  | 'accepted'        // Both teams agreed
  | 'submitted'       // Submitted to commissioner
  | 'under_review'    // Trade committee reviewing
  | 'approved'        // Committee approved
  | 'denied'          // Committee denied
  | 'expired'         // Trade expired
  | 'withdrawn';      // Trade withdrawn

interface Player {
  id: string;
  name: string;
  position: string;
  overall: number;
  team: string;
  teamAbbr: string;
  tier: 'diamond' | 'gold' | 'silver' | 'bronze' | 'common';
}

interface Trade {
  id: string;
  proposing_team: string;
  proposing_team_abbr: string;
  proposing_user: string;
  receiving_team: string;
  receiving_team_abbr: string;
  receiving_user: string;
  players_offered: Player[];
  players_requested: Player[];
  status: TradeStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
  submitted_at?: string;
  reviewed_at?: string;
  message?: string;
  committee_notes?: string;
  reviewed_by?: string;
}

// Mock player database - in production this would come from ShowZone API
const MOCK_PLAYERS: Player[] = [
  { id: '1', name: 'Bobby Witt Jr.', position: 'SS', overall: 91, team: 'Kansas City Royals', teamAbbr: 'KC', tier: 'diamond' },
  { id: '2', name: 'Mookie Betts', position: 'RF', overall: 96, team: 'Los Angeles Dodgers', teamAbbr: 'LAD', tier: 'diamond' },
  { id: '3', name: 'Ronald Acuña Jr.', position: 'CF', overall: 98, team: 'Atlanta Braves', teamAbbr: 'ATL', tier: 'diamond' },
  { id: '4', name: 'Shohei Ohtani', position: 'DH/SP', overall: 99, team: 'Los Angeles Dodgers', teamAbbr: 'LAD', tier: 'diamond' },
  { id: '5', name: 'Juan Soto', position: 'RF', overall: 97, team: 'New York Yankees', teamAbbr: 'NYY', tier: 'diamond' },
  { id: '6', name: 'Freddie Freeman', position: '1B', overall: 95, team: 'Los Angeles Dodgers', teamAbbr: 'LAD', tier: 'diamond' },
  { id: '7', name: 'Corey Seager', position: 'SS', overall: 93, team: 'Texas Rangers', teamAbbr: 'TEX', tier: 'diamond' },
  { id: '8', name: 'Marcus Semien', position: '2B', overall: 89, team: 'Texas Rangers', teamAbbr: 'TEX', tier: 'diamond' },
  { id: '9', name: 'Vladimir Guerrero Jr.', position: '1B', overall: 94, team: 'Toronto Blue Jays', teamAbbr: 'TOR', tier: 'diamond' },
  { id: '10', name: 'Bo Bichette', position: 'SS', overall: 88, team: 'Toronto Blue Jays', teamAbbr: 'TOR', tier: 'diamond' },
  { id: '11', name: 'Mike Trout', position: 'CF', overall: 92, team: 'Los Angeles Angels', teamAbbr: 'LAA', tier: 'diamond' },
  { id: '12', name: 'Aaron Judge', position: 'RF', overall: 97, team: 'New York Yankees', teamAbbr: 'NYY', tier: 'diamond' },
  { id: '13', name: 'Trea Turner', position: 'SS', overall: 91, team: 'Philadelphia Phillies', teamAbbr: 'PHI', tier: 'diamond' },
  { id: '14', name: 'Bryce Harper', position: '1B', overall: 93, team: 'Philadelphia Phillies', teamAbbr: 'PHI', tier: 'diamond' },
  { id: '15', name: 'Victor Caratini', position: 'C', overall: 77, team: 'Houston Astros', teamAbbr: 'HOU', tier: 'gold' },
  { id: '16', name: 'Dylan Cease', position: 'SP', overall: 78, team: 'San Diego Padres', teamAbbr: 'SD', tier: 'gold' },
  { id: '17', name: 'Tyler Freeman', position: 'CF', overall: 77, team: 'Cleveland Guardians', teamAbbr: 'CLE', tier: 'gold' },
  { id: '18', name: 'Jake Cronenworth', position: '2B', overall: 77, team: 'San Diego Padres', teamAbbr: 'SD', tier: 'gold' },
  { id: '19', name: 'Edward Cabrera', position: 'SP', overall: 79, team: 'Miami Marlins', teamAbbr: 'MIA', tier: 'gold' },
  { id: '20', name: 'Sonny Gray', position: 'SP', overall: 78, team: 'St. Louis Cardinals', teamAbbr: 'STL', tier: 'gold' },
  { id: '21', name: 'Shane Baz', position: 'SP', overall: 76, team: 'Tampa Bay Rays', teamAbbr: 'TB', tier: 'gold' },
  { id: '22', name: 'J.T. Ginn', position: 'SP', overall: 74, team: 'New York Mets', teamAbbr: 'NYM', tier: 'silver' },
  { id: '23', name: 'Bryan De La Cruz', position: 'RF', overall: 72, team: 'Miami Marlins', teamAbbr: 'MIA', tier: 'silver' },
  { id: '24', name: 'Dairon Blanco', position: 'CF', overall: 73, team: 'Kansas City Royals', teamAbbr: 'KC', tier: 'silver' },
];

// Tier styling
const TIER_STYLES = {
  diamond: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', emoji: '💎' },
  gold: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', emoji: '🥇' },
  silver: { bg: 'bg-slate-400/20', text: 'text-slate-300', border: 'border-slate-400/30', emoji: '🥈' },
  bronze: { bg: 'bg-orange-600/20', text: 'text-orange-400', border: 'border-orange-600/30', emoji: '🥉' },
  common: { bg: 'bg-slate-600/20', text: 'text-slate-400', border: 'border-slate-600/30', emoji: '⚫' },
};

function FrontOfficeContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'trade-center' | 'inbox' | 'history'>('trade-center');
  
  // Trade builder state
  const [selectedPartner, setSelectedPartner] = useState<string>('');
  const [myPlayersToTrade, setMyPlayersToTrade] = useState<Player[]>([]);
  const [theirPlayersToRequest, setTheirPlayersToRequest] = useState<Player[]>([]);
  const [tradeMessage, setTradeMessage] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [showPlayerSearch, setShowPlayerSearch] = useState<'mine' | 'theirs' | null>(null);
  
  // Trades state
  const [incomingTrades, setIncomingTrades] = useState<Trade[]>([]);
  const [outgoingTrades, setOutgoingTrades] = useState<Trade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [submittingTrade, setSubmittingTrade] = useState<string | null>(null);

  useEffect(() => {
    setIsLoaded(true);
    // Load mock trades
    loadMockTrades();
  }, []);

  const loadMockTrades = () => {
    // Mock incoming trade
    setIncomingTrades([
      {
        id: 'trade-1',
        proposing_team: 'Seattle Mariners',
        proposing_team_abbr: 'SEA',
        proposing_user: 'Player1',
        receiving_team: user?.teamName || 'Your Team',
        receiving_team_abbr: user?.teamAbbreviation || 'YT',
        receiving_user: user?.username || 'you',
        players_offered: [
          { id: '1', name: 'Bobby Witt Jr.', position: 'SS', overall: 91, team: 'Seattle Mariners', teamAbbr: 'SEA', tier: 'diamond' },
        ],
        players_requested: [
          { id: '2', name: 'Mookie Betts', position: 'RF', overall: 96, team: user?.teamName || 'Your Team', teamAbbr: user?.teamAbbreviation || 'YT', tier: 'diamond' },
        ],
        status: 'proposed',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() + 46 * 60 * 60 * 1000).toISOString(),
        message: 'Looking to upgrade at SS. Let me know what you think!',
      },
    ]);

    // Mock trade history
    setTradeHistory([
      {
        id: 'trade-old-1',
        proposing_team: user?.teamName || 'Your Team',
        proposing_team_abbr: user?.teamAbbreviation || 'YT',
        proposing_user: user?.username || 'you',
        receiving_team: 'Los Angeles Dodgers',
        receiving_team_abbr: 'LAD',
        receiving_user: 'Player2',
        players_offered: [
          { id: '11', name: 'Mike Trout', position: 'CF', overall: 92, team: user?.teamName || 'Your Team', teamAbbr: user?.teamAbbreviation || 'YT', tier: 'diamond' },
        ],
        players_requested: [
          { id: '4', name: 'Shohei Ohtani', position: 'DH/SP', overall: 99, team: 'Los Angeles Dodgers', teamAbbr: 'LAD', tier: 'diamond' },
        ],
        status: 'approved',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        submitted_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        reviewed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        reviewed_by: 'Trade Committee',
        committee_notes: 'Trade approved. Fair value exchange.',
      },
      {
        id: 'trade-old-2',
        proposing_team: 'New York Yankees',
        proposing_team_abbr: 'NYY',
        proposing_user: 'Player3',
        receiving_team: user?.teamName || 'Your Team',
        receiving_team_abbr: user?.teamAbbreviation || 'YT',
        receiving_user: user?.username || 'you',
        players_offered: [
          { id: '5', name: 'Juan Soto', position: 'RF', overall: 97, team: 'New York Yankees', teamAbbr: 'NYY', tier: 'diamond' },
        ],
        players_requested: [
          { id: '3', name: 'Ronald Acuña Jr.', position: 'CF', overall: 98, team: user?.teamName || 'Your Team', teamAbbr: user?.teamAbbreviation || 'YT', tier: 'diamond' },
          { id: '20', name: 'Sonny Gray', position: 'SP', overall: 78, team: user?.teamName || 'Your Team', teamAbbr: user?.teamAbbreviation || 'YT', tier: 'gold' },
        ],
        status: 'denied',
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        submitted_at: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
        reviewed_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
        reviewed_by: 'Trade Committee',
        committee_notes: 'Trade denied. Uneven value - requesting team receives significantly more value. Consider adding a player or pick to balance.',
      },
    ]);
  };

  // Available teams to trade with (excluding own team)
  const availableTeams = MLB_TEAMS.filter(t => t.abbreviation !== user?.teamAbbreviation);

  // Filter players based on search
  const filteredPlayers = MOCK_PLAYERS.filter(p => 
    p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
    p.position.toLowerCase().includes(playerSearch.toLowerCase()) ||
    p.team.toLowerCase().includes(playerSearch.toLowerCase())
  );

  // Get players for "my team" and "their team"
  const myPlayers = MOCK_PLAYERS.filter(p => p.teamAbbr === user?.teamAbbreviation || p.teamAbbr === 'ARI');
  const theirPlayers = selectedPartner ? MOCK_PLAYERS.filter(p => p.teamAbbr === selectedPartner) : [];

  const addPlayerToTrade = (player: Player, side: 'mine' | 'theirs') => {
    if (side === 'mine') {
      if (!myPlayersToTrade.find(p => p.id === player.id)) {
        setMyPlayersToTrade([...myPlayersToTrade, player]);
      }
    } else {
      if (!theirPlayersToRequest.find(p => p.id === player.id)) {
        setTheirPlayersToRequest([...theirPlayersToRequest, player]);
      }
    }
    setShowPlayerSearch(null);
    setPlayerSearch('');
  };

  const removePlayerFromTrade = (playerId: string, side: 'mine' | 'theirs') => {
    if (side === 'mine') {
      setMyPlayersToTrade(myPlayersToTrade.filter(p => p.id !== playerId));
    } else {
      setTheirPlayersToRequest(theirPlayersToRequest.filter(p => p.id !== playerId));
    }
  };

  const handleProposeTrade = () => {
    if (!selectedPartner || myPlayersToTrade.length === 0 || theirPlayersToRequest.length === 0) {
      return;
    }

    const newTrade: Trade = {
      id: `trade-${Date.now()}`,
      proposing_team: user?.teamName || 'Your Team',
      proposing_team_abbr: user?.teamAbbreviation || 'YT',
      proposing_user: user?.username || 'you',
      receiving_team: MLB_TEAMS.find(t => t.abbreviation === selectedPartner)?.name || selectedPartner,
      receiving_team_abbr: selectedPartner,
      receiving_user: 'other_user',
      players_offered: myPlayersToTrade,
      players_requested: theirPlayersToRequest,
      status: 'proposed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      message: tradeMessage,
    };

    setOutgoingTrades([newTrade, ...outgoingTrades]);
    
    // Reset form
    setSelectedPartner('');
    setMyPlayersToTrade([]);
    setTheirPlayersToRequest([]);
    setTradeMessage('');
    setActiveTab('inbox');
  };

  const handleAcceptTrade = (tradeId: string) => {
    const trade = incomingTrades.find(t => t.id === tradeId);
    if (trade) {
      // Move to "accepted" status - ready for submission
      const updatedTrade = { ...trade, status: 'accepted' as TradeStatus, updated_at: new Date().toISOString() };
      setIncomingTrades(incomingTrades.map(t => t.id === tradeId ? updatedTrade : t));
    }
  };

  const handleRejectTrade = (tradeId: string) => {
    const trade = incomingTrades.find(t => t.id === tradeId);
    if (trade) {
      setIncomingTrades(incomingTrades.filter(t => t.id !== tradeId));
      setTradeHistory([{ ...trade, status: 'withdrawn' as TradeStatus }, ...tradeHistory]);
    }
  };

  const handleSubmitToCommissioner = async (tradeId: string) => {
    setSubmittingTrade(tradeId);
    
    // Find the trade
    let trade = incomingTrades.find(t => t.id === tradeId) || outgoingTrades.find(t => t.id === tradeId);
    
    if (trade) {
      // Simulate sending to Discord webhook
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update status to submitted/under_review
      const updatedTrade: Trade = { 
        ...trade, 
        status: 'under_review',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Move from inbox to history with under_review status
      setIncomingTrades(incomingTrades.filter(t => t.id !== tradeId));
      setOutgoingTrades(outgoingTrades.filter(t => t.id !== tradeId));
      setTradeHistory([updatedTrade, ...tradeHistory]);
      
      // TODO: Send Discord webhook notification here
      console.log('Trade submitted to commissioner:', updatedTrade);
    }
    
    setSubmittingTrade(null);
  };

  const handleWithdrawTrade = (tradeId: string) => {
    const trade = outgoingTrades.find(t => t.id === tradeId);
    if (trade) {
      setOutgoingTrades(outgoingTrades.filter(t => t.id !== tradeId));
      setTradeHistory([{ ...trade, status: 'withdrawn' as TradeStatus }, ...tradeHistory]);
    }
  };

  const getStatusBadge = (status: TradeStatus) => {
    const styles: Record<TradeStatus, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: '📝 Draft' },
      proposed: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: '📤 Proposed' },
      countered: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '🔄 Countered' },
      accepted: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '🤝 Accepted' },
      submitted: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: '📋 Submitted' },
      under_review: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: '⏳ Under Review' },
      approved: { bg: 'bg-green-500/20', text: 'text-green-400', label: '✅ Approved' },
      denied: { bg: 'bg-red-500/20', text: 'text-red-400', label: '❌ Denied' },
      expired: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: '⌛ Expired' },
      withdrawn: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: '↩️ Withdrawn' },
    };
    const style = styles[status];
    return <Badge className={`${style.bg} ${style.text} border border-current/20`}>{style.label}</Badge>;
  };

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    return `${hours}h ${minutes}m`;
  };

  const renderTradeCard = (trade: Trade, type: 'incoming' | 'outgoing' | 'history') => {
    const isIncoming = type === 'incoming';
    const isOutgoing = type === 'outgoing';
    const canAccept = isIncoming && trade.status === 'proposed';
    const canSubmit = trade.status === 'accepted';
    const isSubmitting = submittingTrade === trade.id;

    return (
      <Card key={trade.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-all">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white ${
                isIncoming ? 'bg-cyan-500' : isOutgoing ? 'bg-amber-500' : 'bg-slate-600'
              }`}>
                {isIncoming ? trade.proposing_team_abbr : trade.receiving_team_abbr}
              </div>
              <div>
                <p className="text-white font-semibold">
                  {isIncoming ? `From: ${trade.proposing_team}` : `To: ${trade.receiving_team}`}
                </p>
                <p className="text-slate-400 text-sm">
                  {new Date(trade.created_at).toLocaleDateString('en-US', { 
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            <div className="text-right">
              {getStatusBadge(trade.status)}
              {(trade.status === 'proposed' || trade.status === 'accepted') && (
                <p className="text-xs text-amber-400 mt-1">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {getTimeRemaining(trade.expires_at)}
                </p>
              )}
            </div>
          </div>

          {/* Trade Details */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* You Receive */}
            <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-lg p-3">
              <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2 font-semibold">
                {isIncoming ? 'You Receive' : 'You Send'}
              </p>
              <div className="space-y-2">
                {(isIncoming ? trade.players_offered : trade.players_requested).map((player) => {
                  const tierStyle = TIER_STYLES[player.tier];
                  return (
                    <div key={player.id} className="flex items-center justify-between bg-slate-800/50 rounded px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${tierStyle.text}`}>{tierStyle.emoji}</span>
                        <div>
                          <p className="text-white font-medium text-sm">{player.name}</p>
                          <p className="text-slate-400 text-xs">{player.position}</p>
                        </div>
                      </div>
                      <Badge className={`${tierStyle.bg} ${tierStyle.text}`}>{player.overall}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* You Send */}
            <div className="bg-red-950/30 border border-red-500/20 rounded-lg p-3">
              <p className="text-xs text-red-400 uppercase tracking-wider mb-2 font-semibold">
                {isIncoming ? 'You Send' : 'You Receive'}
              </p>
              <div className="space-y-2">
                {(isIncoming ? trade.players_requested : trade.players_offered).map((player) => {
                  const tierStyle = TIER_STYLES[player.tier];
                  return (
                    <div key={player.id} className="flex items-center justify-between bg-slate-800/50 rounded px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${tierStyle.text}`}>{tierStyle.emoji}</span>
                        <div>
                          <p className="text-white font-medium text-sm">{player.name}</p>
                          <p className="text-slate-400 text-xs">{player.position}</p>
                        </div>
                      </div>
                      <Badge className={`${tierStyle.bg} ${tierStyle.text}`}>{player.overall}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Message */}
          {trade.message && (
            <div className="bg-slate-900/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-slate-300">
                <MessageSquare className="w-4 h-4 inline mr-2 text-slate-500" />
                "{trade.message}"
              </p>
            </div>
          )}

          {/* Committee Notes (for reviewed trades) */}
          {trade.committee_notes && (
            <div className={`rounded-lg p-3 mb-4 ${
              trade.status === 'approved' ? 'bg-green-950/30 border border-green-500/20' : 'bg-red-950/30 border border-red-500/20'
            }`}>
              <p className="text-xs uppercase tracking-wider mb-1 font-semibold flex items-center gap-2">
                <Shield className="w-3 h-3" />
                {trade.status === 'approved' ? (
                  <span className="text-green-400">Committee Approved</span>
                ) : (
                  <span className="text-red-400">Committee Feedback</span>
                )}
              </p>
              <p className="text-sm text-slate-300">{trade.committee_notes}</p>
              {trade.reviewed_at && (
                <p className="text-xs text-slate-500 mt-2">
                  Reviewed {new Date(trade.reviewed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          {(canAccept || canSubmit || isOutgoing) && trade.status !== 'under_review' && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-700">
              {canAccept && (
                <>
                  <Button
                    size="sm"
                    onClick={() => handleAcceptTrade(trade.id)}
                    className="bg-emerald-500 hover:bg-emerald-400"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Accept Trade
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Counter Offer
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleRejectTrade(trade.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Decline
                  </Button>
                </>
              )}
              {canSubmit && (
                <Button
                  size="sm"
                  onClick={() => handleSubmitToCommissioner(trade.id)}
                  disabled={isSubmitting}
                  className="bg-purple-500 hover:bg-purple-400"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1" />
                      Submit to Commissioner
                    </>
                  )}
                </Button>
              )}
              {isOutgoing && trade.status === 'proposed' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleWithdrawTrade(trade.id)}
                  className="text-slate-400 hover:text-slate-300"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Withdraw
                </Button>
              )}
            </div>
          )}

          {/* Under Review Notice */}
          {trade.status === 'under_review' && (
            <div className="flex items-center gap-3 pt-3 border-t border-slate-700 bg-purple-500/10 -mx-5 -mb-5 px-5 py-4 rounded-b-lg">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              <div>
                <p className="text-purple-400 font-medium">Trade Under Review</p>
                <p className="text-sm text-slate-400">The Trade Committee is reviewing this trade. You'll be notified once a decision is made.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      <Navbar />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className={`mb-8 transition-all duration-500 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Front Office</h1>
              <p className="text-slate-400">Manage trades, build your roster, dominate the league.</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`flex gap-2 mb-6 transition-all duration-500 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={() => setActiveTab('trade-center')}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'trade-center'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <ArrowLeftRight className="w-5 h-5" />
            Trade Center
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'inbox'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Bell className="w-5 h-5" />
            Trade Inbox
            {(incomingTrades.length + outgoingTrades.length) > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {incomingTrades.length + outgoingTrades.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <FileText className="w-5 h-5" />
            History
          </button>
        </div>

        {/* Tab Content */}
        <div className={`transition-all duration-500 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          
          {/* TRADE CENTER - Build a Trade */}
          {activeTab === 'trade-center' && (
            <div className="space-y-6">
              {/* Instructions */}
              <Card className="bg-gradient-to-r from-cyan-950/50 to-slate-900/50 border-cyan-500/30">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                      <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Build Your Trade</h3>
                      <p className="text-slate-400 text-sm">
                        Select a trade partner, add players from both rosters, and send your proposal. 
                        Once both teams agree, submit to the Trade Committee for approval.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Trade Builder */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Step 1: Select Trade Partner */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-sm flex items-center justify-center">1</span>
                      Select Trade Partner
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search teams..."
                        value={partnerSearch}
                        onChange={(e) => setPartnerSearch(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div className="mt-3 max-h-64 overflow-y-auto space-y-1">
                      {availableTeams
                        .filter(t => t.name.toLowerCase().includes(partnerSearch.toLowerCase()))
                        .map(team => (
                          <button
                            key={team.abbreviation}
                            onClick={() => {
                              setSelectedPartner(team.abbreviation);
                              setTheirPlayersToRequest([]);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                              selectedPartner === team.abbreviation
                                ? 'bg-cyan-500/20 border border-cyan-500/50 text-white'
                                : 'hover:bg-slate-700/50 text-slate-300'
                            }`}
                          >
                            <div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                              {team.abbreviation}
                            </div>
                            <span className="text-sm">{team.name}</span>
                            {selectedPartner === team.abbreviation && (
                              <CheckCircle className="w-4 h-4 text-cyan-400 ml-auto" />
                            )}
                          </button>
                        ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2: Trade Summary */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-sm flex items-center justify-center">2</span>
                      Trade Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Your Side */}
                      <div>
                        <p className="text-xs text-red-400 uppercase tracking-wider mb-2 font-semibold">You Send</p>
                        <div className="space-y-2 min-h-[120px]">
                          {myPlayersToTrade.map(player => (
                            <div key={player.id} className="flex items-center justify-between bg-slate-900/50 rounded px-2 py-1.5">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-xs">{TIER_STYLES[player.tier].emoji}</span>
                                <span className="text-white text-sm truncate">{player.name}</span>
                              </div>
                              <button
                                onClick={() => removePlayerFromTrade(player.id, 'mine')}
                                className="p-1 hover:bg-red-500/20 rounded text-red-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => setShowPlayerSearch('mine')}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Add Player
                          </button>
                        </div>
                      </div>

                      {/* Their Side */}
                      <div>
                        <p className="text-xs text-emerald-400 uppercase tracking-wider mb-2 font-semibold">You Receive</p>
                        <div className="space-y-2 min-h-[120px]">
                          {theirPlayersToRequest.map(player => (
                            <div key={player.id} className="flex items-center justify-between bg-slate-900/50 rounded px-2 py-1.5">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-xs">{TIER_STYLES[player.tier].emoji}</span>
                                <span className="text-white text-sm truncate">{player.name}</span>
                              </div>
                              <button
                                onClick={() => removePlayerFromTrade(player.id, 'theirs')}
                                className="p-1 hover:bg-red-500/20 rounded text-red-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => selectedPartner && setShowPlayerSearch('theirs')}
                            disabled={!selectedPartner}
                            className={`w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed rounded-lg transition-colors ${
                              selectedPartner
                                ? 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-500'
                                : 'border-slate-700 text-slate-600 cursor-not-allowed'
                            }`}
                          >
                            <Plus className="w-4 h-4" />
                            Add Player
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Step 3: Message & Send */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-sm flex items-center justify-center">3</span>
                    Add Message & Send
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={tradeMessage}
                    onChange={(e) => setTradeMessage(e.target.value)}
                    placeholder="Add a message to your trade proposal (optional)..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none mb-4"
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-400">
                      {selectedPartner && myPlayersToTrade.length > 0 && theirPlayersToRequest.length > 0 ? (
                        <span className="text-emerald-400">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          Ready to send!
                        </span>
                      ) : (
                        <span>
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          Select a team and add players to both sides
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={handleProposeTrade}
                      disabled={!selectedPartner || myPlayersToTrade.length === 0 || theirPlayersToRequest.length === 0}
                      className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Trade Proposal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TRADE INBOX */}
          {activeTab === 'inbox' && (
            <div className="space-y-6">
              {/* Incoming Trades */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-cyan-400" />
                  Incoming Proposals
                  {incomingTrades.length > 0 && (
                    <Badge className="bg-red-500 text-white">{incomingTrades.length}</Badge>
                  )}
                </h3>
                {incomingTrades.length === 0 ? (
                  <Card className="bg-slate-800/30 border-slate-700">
                    <CardContent className="py-12 text-center">
                      <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">No incoming trade proposals</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {incomingTrades.map(trade => renderTradeCard(trade, 'incoming'))}
                  </div>
                )}
              </div>

              {/* Outgoing Trades */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5 text-amber-400" />
                  Outgoing Proposals
                  {outgoingTrades.length > 0 && (
                    <Badge className="bg-amber-500 text-black">{outgoingTrades.length}</Badge>
                  )}
                </h3>
                {outgoingTrades.length === 0 ? (
                  <Card className="bg-slate-800/30 border-slate-700">
                    <CardContent className="py-12 text-center">
                      <Send className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">No outgoing trade proposals</p>
                      <Button
                        onClick={() => setActiveTab('trade-center')}
                        className="mt-4 bg-cyan-500 hover:bg-cyan-400"
                      >
                        Create Trade
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {outgoingTrades.map(trade => renderTradeCard(trade, 'outgoing'))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TRADE HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" />
                Trade History
              </h3>
              {tradeHistory.length === 0 ? (
                <Card className="bg-slate-800/30 border-slate-700">
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No trade history yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {tradeHistory.map(trade => renderTradeCard(trade, 'history'))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Player Search Modal */}
        {showPlayerSearch && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="bg-slate-900 border-slate-700 w-full max-w-lg max-h-[80vh] flex flex-col">
              <CardHeader className="border-b border-slate-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">
                    {showPlayerSearch === 'mine' ? 'Select Player to Trade' : 'Select Player to Request'}
                  </CardTitle>
                  <button
                    onClick={() => {
                      setShowPlayerSearch(null);
                      setPlayerSearch('');
                    }}
                    className="p-2 hover:bg-slate-800 rounded-lg"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </CardHeader>
              <div className="p-4 border-b border-slate-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search players..."
                    value={playerSearch}
                    onChange={(e) => setPlayerSearch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {(showPlayerSearch === 'mine' ? myPlayers : theirPlayers)
                    .filter(p => 
                      p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
                      p.position.toLowerCase().includes(playerSearch.toLowerCase())
                    )
                    .map(player => {
                      const tierStyle = TIER_STYLES[player.tier];
                      const alreadyAdded = showPlayerSearch === 'mine'
                        ? myPlayersToTrade.some(p => p.id === player.id)
                        : theirPlayersToRequest.some(p => p.id === player.id);
                      
                      return (
                        <button
                          key={player.id}
                          onClick={() => !alreadyAdded && addPlayerToTrade(player, showPlayerSearch)}
                          disabled={alreadyAdded}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                            alreadyAdded
                              ? 'bg-slate-800/50 opacity-50 cursor-not-allowed'
                              : 'hover:bg-slate-800 cursor-pointer'
                          }`}
                        >
                          <span className={`text-lg ${tierStyle.text}`}>{tierStyle.emoji}</span>
                          <div className="flex-1 text-left">
                            <p className="text-white font-medium">{player.name}</p>
                            <p className="text-slate-400 text-sm">{player.position} • {player.team}</p>
                          </div>
                          <Badge className={`${tierStyle.bg} ${tierStyle.text}`}>{player.overall}</Badge>
                          {alreadyAdded && (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          )}
                        </button>
                      );
                    })}
                  {((showPlayerSearch === 'mine' ? myPlayers : theirPlayers).length === 0) && (
                    <div className="text-center py-8 text-slate-400">
                      {showPlayerSearch === 'theirs' && !selectedPartner
                        ? 'Select a trade partner first'
                        : 'No players found'}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function FrontOfficePage() {
  return (
    <ProtectedRoute requireJkapMember>
      <FrontOfficeContent />
    </ProtectedRoute>
  );
}
