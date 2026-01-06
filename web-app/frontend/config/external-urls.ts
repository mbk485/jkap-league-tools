/**
 * JKAP Memorial League - External URLs Configuration
 * 
 * INSTRUCTIONS:
 * Replace ALL placeholder URLs below with your actual URLs.
 * This file centralizes all external links for easy management.
 */

// =============================================================================
// JOIN OUR LEAGUE - New Member Funnel
// =============================================================================

/**
 * STEP 1: "Join Our League" - Interest/Interview Form
 * EZ Texting SMS CRM signup that captures interest and starts the vetting process.
 * After approval, they receive a unique code via text.
 * @see https://eztxt.net/0tNR7h
 */
export const JOIN_LEAGUE_URL = 'https://eztxt.net/0tNR7h';

/**
 * STEP 2: Member Registration Form (sent AFTER approval)
 * Only approved members with a valid approval code get this link.
 * This captures their full info and adds them to the active member list.
 */
export const MEMBER_REGISTRATION_URL = 'https://docs.google.com/forms/d/e/YOUR_MEMBER_FORM_ID/viewform';

/**
 * Members Area SMS Signup - For APPROVED MEMBERS ONLY
 * Allows current members to subscribe to league updates, roster news, 
 * deadlines, and events via SMS.
 * Only shown in the authenticated dashboard (The Ballyard).
 * @see https://storage.googleapis.com/cf-prod-widgets/433290282658963456-EZ/7406a3e5-35c8-4662-86ff-d4cf21a8bf6a/f8211439-8e42-46e2-91f4-9f230d9cd711-1746793700230.html
 */
export const MEMBERS_SMS_SIGNUP_URL = 'https://storage.googleapis.com/cf-prod-widgets/433290282658963456-EZ/7406a3e5-35c8-4662-86ff-d4cf21a8bf6a/f8211439-8e42-46e2-91f4-9f230d9cd711-1746793700230.html';

/**
 * Waitlist Form (if league is full)
 * Members who don't get approved immediately go here.
 */
export const WAITLIST_URL = 'https://docs.google.com/forms/d/e/YOUR_WAITLIST_FORM_ID/viewform';

/**
 * Your contact form URL
 */
export const CONTACT_FORM_URL = 'https://docs.google.com/forms/d/e/YOUR_CONTACT_FORM_ID/viewform';

/**
 * Off-Season Plans submission form
 */
export const OFFSEASON_PLANS_FORM_URL = 'https://docs.google.com/forms/d/e/YOUR_OFFSEASON_FORM_ID/viewform';

/**
 * Draft Registration form
 */
export const DRAFT_REGISTRATION_URL = 'https://docs.google.com/forms/d/e/YOUR_DRAFT_FORM_ID/viewform';


// =============================================================================
// SOCIAL MEDIA
// =============================================================================

export const SOCIAL_LINKS = {
  twitter: 'https://twitter.com/jkapmemorial',
  facebook: 'https://facebook.com/jkapmemorial',
  instagram: 'https://instagram.com/jkapmemorial',
  discord: 'https://discord.gg/YOUR_INVITE_CODE', // Leave empty string '' if no Discord
  youtube: '', // Leave empty if not used
};


// =============================================================================
// LEAGUE DOCUMENTS
// Replace '#' with your actual document URLs (Google Drive, Dropbox, etc.)
// =============================================================================

export const DOCUMENT_URLS = {
  // Rules & Constitution
  leagueConstitution: '#', // PDF URL
  
  // Trading
  tradingGuidelines: '#', // PDF URL
  
  // Finance
  salaryCapStructure: '#', // PDF URL
  
  // Schedule
  seasonSchedule: '#', // PDF URL
  
  // Roster
  rosterRequirements: '#', // PDF URL
  
  // Off-Season
  offSeasonPlanningForm: OFFSEASON_PLANS_FORM_URL, // Google Form
};


// =============================================================================
// TWITCH STREAM URLS
// Replace '#' with each team owner's Twitch channel URL
// Example: 'https://twitch.tv/username'
// =============================================================================

export const TWITCH_URLS: Record<string, string> = {
  // NL West
  ARI: '#', // Arizona Diamondbacks
  LAD: '#', // Los Angeles Dodgers
  SD: '#',  // San Diego Padres
  SF: '#',  // San Francisco Giants
  COL: '#', // Colorado Rockies
  
  // NL Central
  CHC: '#', // Chicago Cubs
  MIL: '#', // Milwaukee Brewers
  STL: '#', // St. Louis Cardinals
  PIT: '#', // Pittsburgh Pirates
  CIN: '#', // Cincinnati Reds
  
  // NL East
  ATL: '#', // Atlanta Braves
  PHI: '#', // Philadelphia Phillies
  NYM: '#', // New York Mets
  MIA: '#', // Miami Marlins
  WSH: '#', // Washington Nationals
  
  // AL West
  HOU: '#', // Houston Astros
  TEX: '#', // Texas Rangers
  SEA: '#', // Seattle Mariners
  LAA: '#', // Los Angeles Angels
  OAK: '#', // Oakland Athletics
  
  // AL Central
  CLE: '#', // Cleveland Guardians
  MIN: '#', // Minnesota Twins
  DET: '#', // Detroit Tigers
  CWS: '#', // Chicago White Sox
  KC: '#',  // Kansas City Royals
  
  // AL East
  NYY: '#', // New York Yankees
  BAL: '#', // Baltimore Orioles
  TB: '#',  // Tampa Bay Rays
  TOR: '#', // Toronto Blue Jays
  BOS: '#', // Boston Red Sox
};


// =============================================================================
// COMBINED EXPORT (Used by the app)
// =============================================================================

import { ExternalLinks, TeamStream, LeagueDocument, OffSeasonItem } from '@/types/league';

export const externalLinks: ExternalLinks = {
  joinLeague: JOIN_LEAGUE_URL,
  memberRegistration: MEMBER_REGISTRATION_URL,
  waitlist: WAITLIST_URL,
  contactForm: CONTACT_FORM_URL,
  twitter: SOCIAL_LINKS.twitter,
  facebook: SOCIAL_LINKS.facebook,
  instagram: SOCIAL_LINKS.instagram,
  discord: SOCIAL_LINKS.discord || undefined,
};

export const teamStreams: TeamStream[] = [
  { abbreviation: 'ARI', name: 'Arizona Diamondbacks', twitchUrl: TWITCH_URLS.ARI },
  { abbreviation: 'ATL', name: 'Atlanta Braves', twitchUrl: TWITCH_URLS.ATL },
  { abbreviation: 'BAL', name: 'Baltimore Orioles', twitchUrl: TWITCH_URLS.BAL },
  { abbreviation: 'BOS', name: 'Boston Red Sox', twitchUrl: TWITCH_URLS.BOS },
  { abbreviation: 'CHC', name: 'Chicago Cubs', twitchUrl: TWITCH_URLS.CHC },
  { abbreviation: 'CWS', name: 'Chicago White Sox', twitchUrl: TWITCH_URLS.CWS },
  { abbreviation: 'CIN', name: 'Cincinnati Reds', twitchUrl: TWITCH_URLS.CIN },
  { abbreviation: 'CLE', name: 'Cleveland Guardians', twitchUrl: TWITCH_URLS.CLE },
  { abbreviation: 'COL', name: 'Colorado Rockies', twitchUrl: TWITCH_URLS.COL },
  { abbreviation: 'DET', name: 'Detroit Tigers', twitchUrl: TWITCH_URLS.DET },
  { abbreviation: 'HOU', name: 'Houston Astros', twitchUrl: TWITCH_URLS.HOU },
  { abbreviation: 'KC', name: 'Kansas City Royals', twitchUrl: TWITCH_URLS.KC },
  { abbreviation: 'LAA', name: 'Los Angeles Angels', twitchUrl: TWITCH_URLS.LAA },
  { abbreviation: 'LAD', name: 'Los Angeles Dodgers', twitchUrl: TWITCH_URLS.LAD },
  { abbreviation: 'MIA', name: 'Miami Marlins', twitchUrl: TWITCH_URLS.MIA },
  { abbreviation: 'MIL', name: 'Milwaukee Brewers', twitchUrl: TWITCH_URLS.MIL },
  { abbreviation: 'MIN', name: 'Minnesota Twins', twitchUrl: TWITCH_URLS.MIN },
  { abbreviation: 'NYM', name: 'New York Mets', twitchUrl: TWITCH_URLS.NYM },
  { abbreviation: 'NYY', name: 'New York Yankees', twitchUrl: TWITCH_URLS.NYY },
  { abbreviation: 'OAK', name: 'Oakland Athletics', twitchUrl: TWITCH_URLS.OAK },
  { abbreviation: 'PHI', name: 'Philadelphia Phillies', twitchUrl: TWITCH_URLS.PHI },
  { abbreviation: 'PIT', name: 'Pittsburgh Pirates', twitchUrl: TWITCH_URLS.PIT },
  { abbreviation: 'SD', name: 'San Diego Padres', twitchUrl: TWITCH_URLS.SD },
  { abbreviation: 'SF', name: 'San Francisco Giants', twitchUrl: TWITCH_URLS.SF },
  { abbreviation: 'SEA', name: 'Seattle Mariners', twitchUrl: TWITCH_URLS.SEA },
  { abbreviation: 'STL', name: 'St. Louis Cardinals', twitchUrl: TWITCH_URLS.STL },
  { abbreviation: 'TB', name: 'Tampa Bay Rays', twitchUrl: TWITCH_URLS.TB },
  { abbreviation: 'TEX', name: 'Texas Rangers', twitchUrl: TWITCH_URLS.TEX },
  { abbreviation: 'TOR', name: 'Toronto Blue Jays', twitchUrl: TWITCH_URLS.TOR },
  { abbreviation: 'WSH', name: 'Washington Nationals', twitchUrl: TWITCH_URLS.WSH },
];

export const leagueDocuments: LeagueDocument[] = [
  {
    id: 'doc-001',
    title: 'League Constitution',
    description: 'Complete league rules and regulations',
    category: 'rules',
    url: DOCUMENT_URLS.leagueConstitution,
    type: 'pdf',
    updatedAt: '2024-01-15',
    fileSize: '2.3 MB',
  },
  {
    id: 'doc-002',
    title: 'Trading Guidelines',
    description: 'Rules and procedures for player trades',
    category: 'trading',
    url: DOCUMENT_URLS.tradingGuidelines,
    type: 'pdf',
    updatedAt: '2024-02-20',
    fileSize: '1.1 MB',
  },
  {
    id: 'doc-003',
    title: 'Salary Cap Structure',
    description: 'Budget allocation and cap rules',
    category: 'finance',
    url: DOCUMENT_URLS.salaryCapStructure,
    type: 'pdf',
    updatedAt: '2024-01-10',
    fileSize: '890 KB',
  },
  {
    id: 'doc-004',
    title: 'Season Schedule',
    description: 'Full season game schedule and playoffs',
    category: 'schedule',
    url: DOCUMENT_URLS.seasonSchedule,
    type: 'pdf',
    updatedAt: '2024-03-01',
    fileSize: '1.5 MB',
  },
  {
    id: 'doc-005',
    title: 'Roster Requirements',
    description: 'Minimum and maximum roster sizes',
    category: 'roster',
    url: DOCUMENT_URLS.rosterRequirements,
    type: 'pdf',
    updatedAt: '2024-01-05',
    fileSize: '450 KB',
  },
  {
    id: 'doc-006',
    title: 'Off-Season Planning Form',
    description: 'Submit your off-season plans and intentions',
    category: 'offseason',
    url: DOCUMENT_URLS.offSeasonPlanningForm,
    type: 'form',
    updatedAt: '2024-10-01',
    isNew: true,
  },
];

export const offSeasonItems: OffSeasonItem[] = [
  {
    id: 'os-001',
    title: 'Off-Season Plans Submission',
    description: 'Submit your off-season intentions form by the deadline',
    deadline: '2025-01-15',
    status: 'active',
    actionUrl: OFFSEASON_PLANS_FORM_URL,
    actionLabel: 'Submit Plans',
  },
  {
    id: 'os-002',
    title: 'Free Agency Period Opens',
    description: 'Browse and sign available free agents',
    deadline: '2025-01-20',
    status: 'upcoming',
    actionUrl: '/free-agents',
    actionLabel: 'View Free Agents',
  },
  {
    id: 'os-003',
    title: 'Draft Registration',
    description: 'Register for the upcoming rookie draft',
    deadline: '2025-02-01',
    status: 'upcoming',
    actionUrl: DRAFT_REGISTRATION_URL,
    actionLabel: 'Register',
  },
];

