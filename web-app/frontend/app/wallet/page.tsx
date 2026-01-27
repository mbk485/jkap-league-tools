'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, Button } from '@/components/ui';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Gift, 
  Trophy,
  Star,
  Zap,
  Crown,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Coins,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Sparkles
} from 'lucide-react';
import { 
  getUserWallet, 
  getTokenTransactions, 
  getLeague,
  getUserLevel,
  DBUserWallet,
  DBTokenTransaction,
  DBLeague,
  DBUserLevel,
  spendTokens
} from '@/lib/supabase';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Token costs for premium features
const TOKEN_COSTS = {
  smart_recap: 25,
  scouting_report: 50,
  roster_advice: 75,
  priority_support: 100,
  custom_graphics: 150,
};

const FEATURE_INFO: Record<string, { name: string; description: string; icon: React.ReactNode }> = {
  smart_recap: {
    name: 'Smart Recap',
    description: 'AI-powered game recap from screenshots',
    icon: <Sparkles className="w-5 h-5" />,
  },
  scouting_report: {
    name: 'Scouting Report',
    description: 'Detailed opponent analysis and tendencies',
    icon: <Star className="w-5 h-5" />,
  },
  roster_advice: {
    name: 'Roster Advice',
    description: 'AI recommendations for your lineup',
    icon: <Trophy className="w-5 h-5" />,
  },
  priority_support: {
    name: 'Priority Support',
    description: 'Fast-track commissioner assistance',
    icon: <Zap className="w-5 h-5" />,
  },
  custom_graphics: {
    name: 'Custom Graphics',
    description: 'Personalized team graphics and banners',
    icon: <Crown className="w-5 h-5" />,
  },
};

// Icon mapping for league levels
const levelIcons: Record<string, React.ReactNode> = {
  crown: <Crown className="w-6 h-6" />,
  trophy: <Trophy className="w-6 h-6" />,
  star: <Star className="w-6 h-6" />,
  zap: <Zap className="w-6 h-6" />,
  user: <Gift className="w-6 h-6" />,
};

function WalletContent() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<DBUserWallet | null>(null);
  const [transactions, setTransactions] = useState<DBTokenTransaction[]>([]);
  const [userLevel, setUserLevel] = useState<DBUserLevel | null>(null);
  const [league, setLeague] = useState<DBLeague | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadWalletData() {
      if (!user?.id) return;

      try {
        const [walletData, txData, levelData] = await Promise.all([
          getUserWallet(user.id),
          getTokenTransactions(user.id, 20),
          getUserLevel(user.id),
        ]);

        setWallet(walletData);
        setTransactions(txData);
        setUserLevel(levelData);

        if (levelData?.current_league_id) {
          const leagueData = await getLeague(levelData.current_league_id);
          setLeague(leagueData);
        }
      } catch (error) {
        console.error('Error loading wallet data:', error);
      } finally {
        setLoading(false);
        setTimeout(() => setIsLoaded(true), 100);
      }
    }

    loadWalletData();
  }, [user?.id]);

  const handlePurchase = async (featureKey: string) => {
    if (!user?.id || !wallet) return;
    
    const cost = TOKEN_COSTS[featureKey as keyof typeof TOKEN_COSTS];
    if (!cost || wallet.token_balance < cost) return;

    setPurchasing(featureKey);
    try {
      const success = await spendTokens(user.id, cost, `purchase_${featureKey}`, `Purchased ${FEATURE_INFO[featureKey].name}`);
      if (success) {
        // Refresh wallet data
        const [walletData, txData] = await Promise.all([
          getUserWallet(user.id),
          getTokenTransactions(user.id, 20),
        ]);
        setWallet(walletData);
        setTransactions(txData);
      }
    } catch (error) {
      console.error('Purchase failed:', error);
    } finally {
      setPurchasing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-red-500" />;
  };

  const getTransactionLabel = (type: string) => {
    const labels: Record<string, string> = {
      salary: 'Monthly Salary',
      game_played: 'Game Played',
      win_bonus: 'Win Bonus',
      streak_bonus: 'Streak Bonus',
      daily_login: 'Daily Login',
      recap_created: 'Recap Created',
      analysis_uploaded: 'Analysis Uploaded',
      promotion_bonus: 'Promotion Bonus',
      purchase_smart_recap: 'Smart Recap Purchase',
      purchase_scouting_report: 'Scouting Report',
      purchase_roster_advice: 'Roster Advice',
      purchase_priority_support: 'Priority Support',
      purchase_custom_graphics: 'Custom Graphics',
    };
    return labels[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Wallet className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading your wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-900/20 via-background to-yellow-900/10 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className={`transition-all duration-700 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white">
                <Wallet className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Your Wallet</h1>
                <p className="text-muted-foreground">Manage your tokens and purchases</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Balance Card */}
          <div className={`lg:col-span-2 transition-all duration-700 delay-100 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-yellow-600/5 border-amber-500/20">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-amber-500">
                      {wallet?.token_balance?.toLocaleString() || '0'}
                    </span>
                    <span className="text-xl text-amber-500/70">tokens</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-amber-500/20">
                  <Coins className="w-10 h-10 text-amber-500" />
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-amber-500/20">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Lifetime Earned</p>
                  <p className="text-lg font-semibold text-green-500">
                    +{wallet?.lifetime_tokens_earned?.toLocaleString() || '0'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Lifetime Spent</p>
                  <p className="text-lg font-semibold text-red-500">
                    -{wallet?.lifetime_tokens_spent?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Current League & Salary */}
            {league && (
              <Card className="p-6 mt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Monthly Salary
                </h3>
                <div 
                  className="flex items-center gap-4 p-4 rounded-xl border"
                  style={{ borderColor: league.color + '40', background: `linear-gradient(135deg, ${league.color}10, transparent)` }}
                >
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: league.color + '20', color: league.color }}
                  >
                    {levelIcons[league.icon] || <Trophy className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold" style={{ color: league.color }}>{league.name}</p>
                    <p className="text-sm text-muted-foreground">{league.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-amber-500">
                      +{league.monthly_salary}
                    </p>
                    <p className="text-xs text-muted-foreground">tokens/month</p>
                  </div>
                </div>

                {wallet?.next_salary_due_at && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Next salary: {formatDate(wallet.next_salary_due_at)}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Sidebar - Ways to Earn */}
          <div className={`transition-all duration-700 delay-200 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Ways to Earn
              </h3>
              <div className="space-y-3">
                {[
                  { action: 'Play a game', tokens: '+10', icon: '🎮' },
                  { action: 'Win a game', tokens: '+15', icon: '🏆' },
                  { action: 'Daily login', tokens: '+5', icon: '📅' },
                  { action: 'Create recap', tokens: '+10', icon: '📝' },
                  { action: 'Upload analysis', tokens: '+15', icon: '📊' },
                  { action: 'Win streak (3+)', tokens: '+25', icon: '🔥' },
                  { action: 'Get promoted', tokens: '+100', icon: '⬆️' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-sm">{item.action}</span>
                    </div>
                    <span className="text-sm font-semibold text-green-500">{item.tokens}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Token Shop */}
        <div className={`mt-8 transition-all duration-700 delay-300 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            Token Shop
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(TOKEN_COSTS).map(([key, cost]) => {
              const info = FEATURE_INFO[key];
              const canAfford = (wallet?.token_balance || 0) >= cost;
              const isPurchasing = purchasing === key;

              return (
                <Card key={key} className={`p-5 transition-all ${!canAfford ? 'opacity-60' : 'hover:border-amber-500/50'}`}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary">
                      {info.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{info.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{info.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-amber-500">{cost} tokens</span>
                        <Button
                          size="sm"
                          variant={canAfford ? 'primary' : 'outline'}
                          disabled={!canAfford || isPurchasing}
                          onClick={() => handlePurchase(key)}
                        >
                          {isPurchasing ? (
                            'Processing...'
                          ) : !canAfford ? (
                            <>
                              <Lock className="w-3 h-3 mr-1" />
                              Need {cost - (wallet?.token_balance || 0)} more
                            </>
                          ) : (
                            'Purchase'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Transaction History */}
        <div className={`mt-8 transition-all duration-700 delay-400 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-muted-foreground" />
            Recent Transactions
          </h2>
          <Card className="divide-y divide-border">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No transactions yet</p>
                <p className="text-sm">Start playing games to earn tokens!</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-full ${tx.amount > 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {getTransactionIcon(tx.transaction_type, tx.amount)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{getTransactionLabel(tx.transaction_type)}</p>
                    {tx.description && (
                      <p className="text-sm text-muted-foreground">{tx.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(tx.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  return (
    <ProtectedRoute>
      <WalletContent />
    </ProtectedRoute>
  );
}
