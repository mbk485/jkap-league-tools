// JKAP Memorial League Type Definitions

export type SubscriptionStatus = 'active' | 'delinquent';

export type NotificationType = 'trade' | 'system' | 'finance';

export interface TeamOwner {
  id: string;
  name: string;
  subscriptionStatus: SubscriptionStatus;
  email?: string;
  avatarUrl?: string;
  joinedDate?: string;
}

export interface NextGame {
  opponent: string;
  opponentLogo?: string;
  time: string;
  pitcher: string;
  opponentPitcher?: string;
  venue?: string;
  isHome: boolean;
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  record: string;
  wins: number;
  losses: number;
  streak: string;
  streakType: 'W' | 'L';
  budget: string;
  budgetRemaining: number;
  budgetTotal: number;
  division: string;
  divisionRank: number;
  nextGame: NextGame;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  timestamp: string;
  sender?: string;
  actionUrl?: string;
}

export interface LeagueStanding {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  winPercentage: number;
  gamesBack: number;
  streak: string;
}

export interface TradeOffer {
  id: string;
  fromTeam: string;
  toTeam: string;
  playersOffered: string[];
  playersRequested: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  createdAt: string;
  expiresAt: string;
}

// Document/Resource types for League Documents
export type DocumentCategory = 'rules' | 'trading' | 'finance' | 'schedule' | 'roster' | 'administration' | 'offseason';

export interface LeagueDocument {
  id: string;
  title: string;
  description: string;
  category: DocumentCategory;
  url: string;
  type: 'pdf' | 'form' | 'doc' | 'external';
  updatedAt: string;
  fileSize?: string;
  isNew?: boolean;
}

// Off-Season Planning
export interface OffSeasonItem {
  id: string;
  title: string;
  description: string;
  deadline?: string;
  status: 'upcoming' | 'active' | 'completed';
  actionUrl?: string;
  actionLabel?: string;
}

// External Links Configuration
export interface ExternalLinks {
  joinLeague: string;           // Step 1: Interest/Interview form
  memberRegistration: string;   // Step 2: Full registration (after approval)
  waitlist: string;             // Waitlist form (if league is full)
  contactForm: string;
  twitter: string;
  facebook: string;
  instagram: string;
  discord?: string;
}

// Team Stream
export interface TeamStream {
  abbreviation: string;
  name: string;
  twitchUrl: string;
  isLive?: boolean;
}

// Auth User
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  teamId?: string;
  isAdmin: boolean;
}

// =============================================================================
// RE-EXPORT FROM CONFIG (Single source of truth for URLs)
// =============================================================================

export {
  externalLinks,
  teamStreams,
  leagueDocuments,
  offSeasonItems,
} from '@/config/external-urls';

// =============================================================================
// MOCK DATA (For development - will be replaced by API)
// =============================================================================

export const mockOwner: TeamOwner = {
  id: 'owner-001',
  name: 'Murphi Kennedy',
  subscriptionStatus: 'active',
  email: 'murphi@jkapmemorial.com',
  joinedDate: '2024-03-15',
};

export const mockTeam: Team = {
  id: 'team-ari',
  name: 'Arizona Diamondbacks',
  abbreviation: 'ARI',
  primaryColor: '#A71930',
  secondaryColor: '#E3D4AD',
  record: '84-78',
  wins: 84,
  losses: 78,
  streak: 'W3',
  streakType: 'W',
  budget: '$145.2M',
  budgetRemaining: 145200000,
  budgetTotal: 200000000,
  division: 'NL West',
  divisionRank: 2,
  nextGame: {
    opponent: 'NY Yankees',
    time: 'Oct 18, 7:00 PM EST',
    pitcher: 'Z. Gallen',
    opponentPitcher: 'G. Cole',
    venue: 'Chase Field',
    isHome: true,
  },
};

export const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    type: 'trade',
    title: 'Trade Offer Received',
    content: 'The Dodgers have sent you a trade proposal for your starting pitcher.',
    isRead: false,
    timestamp: '2024-10-17T14:30:00Z',
    sender: 'LA Dodgers',
    actionUrl: '/trades/incoming',
  },
  {
    id: 'notif-002',
    type: 'system',
    title: 'League Announcement',
    content: 'Playoff seeding has been finalized. Check the standings for details.',
    isRead: false,
    timestamp: '2024-10-17T12:00:00Z',
    sender: 'League Office',
  },
  {
    id: 'notif-003',
    type: 'finance',
    title: 'Subscription Renewed',
    content: 'Your Season Pass has been successfully renewed for another month.',
    isRead: true,
    timestamp: '2024-10-15T09:00:00Z',
  },
  {
    id: 'notif-004',
    type: 'trade',
    title: 'Counter Offer Available',
    content: 'The Padres have countered your trade proposal. Review the new terms.',
    isRead: false,
    timestamp: '2024-10-16T18:45:00Z',
    sender: 'SD Padres',
    actionUrl: '/trades/pending',
  },
  {
    id: 'notif-005',
    type: 'system',
    title: 'Game Result Posted',
    content: 'Your game against the Giants has been recorded. Final: 7-3 W',
    isRead: true,
    timestamp: '2024-10-14T23:30:00Z',
  },
];
