/**
 * Published Season Draft — members see results in Off-Season → Draft → Draft results.
 * Commissioners update this file when posting new results (and redeploy).
 */

export const PUBLISHED_DRAFT_META = {
  seasonLabel: 'Season 5',
  /** Shown on the draft order page */
  orderPostedLabel: 'Posted March 25, 2026',
  /** Shown on the results page */
  resultsPostedLabel: 'Posted March 25, 2026',
} as const;

export interface PublishedDraftOrderPick {
  pick: number;
  abbreviation: string;
  teamName: string;
  /** Original pick holder when this slot is held via trade, e.g. "St. Louis Cardinals" */
  via?: string;
}

/**
 * Official first-round (and league) draft order as published before the draft.
 */
export const PUBLISHED_DRAFT_ORDER: PublishedDraftOrderPick[] = [
  { pick: 1, abbreviation: 'SEA', teamName: 'Seattle Mariners' },
  { pick: 2, abbreviation: 'SEA', teamName: 'Seattle Mariners', via: 'St. Louis Cardinals' },
  { pick: 3, abbreviation: 'BAL', teamName: 'Baltimore Orioles' },
  { pick: 4, abbreviation: 'SEA', teamName: 'Seattle Mariners', via: 'Boston Red Sox' },
  { pick: 5, abbreviation: 'WSH', teamName: 'Washington Nationals' },
  { pick: 6, abbreviation: 'TOR', teamName: 'Toronto Blue Jays', via: 'Oakland Athletics' },
  { pick: 7, abbreviation: 'MIA', teamName: 'Miami Marlins' },
  { pick: 8, abbreviation: 'SD', teamName: 'San Diego Padres' },
  { pick: 9, abbreviation: 'PIT', teamName: 'Pittsburgh Pirates' },
  { pick: 10, abbreviation: 'CWS', teamName: 'Chicago White Sox' },
  { pick: 11, abbreviation: 'ARI', teamName: 'Arizona Diamondbacks', via: 'Kansas City Royals' },
  { pick: 12, abbreviation: 'NYM', teamName: 'New York Mets' },
  { pick: 13, abbreviation: 'SF', teamName: 'San Francisco Giants' },
  { pick: 14, abbreviation: 'MIL', teamName: 'Milwaukee Brewers' },
  { pick: 15, abbreviation: 'TOR', teamName: 'Toronto Blue Jays' },
  { pick: 16, abbreviation: 'TEX', teamName: 'Texas Rangers' },
  { pick: 17, abbreviation: 'PHI', teamName: 'Philadelphia Phillies' },
  { pick: 18, abbreviation: 'NYY', teamName: 'New York Yankees' },
  { pick: 19, abbreviation: 'COL', teamName: 'Colorado Rockies' },
  { pick: 20, abbreviation: 'TB', teamName: 'Tampa Bay Rays' },
  { pick: 21, abbreviation: 'DET', teamName: 'Detroit Tigers' },
  { pick: 22, abbreviation: 'CLE', teamName: 'Cleveland Guardians' },
  { pick: 23, abbreviation: 'ARI', teamName: 'Arizona Diamondbacks' },
  { pick: 24, abbreviation: 'HOU', teamName: 'Houston Astros' },
  { pick: 25, abbreviation: 'CIN', teamName: 'Cincinnati Reds' },
  { pick: 26, abbreviation: 'MIN', teamName: 'Minnesota Twins' },
];

export interface PublishedDraftResultRow {
  pick: number;
  playerName: string;
  position: string;
  ovr: number;
  /** Full "Drafted By" line as published (includes via-trade notes) */
  draftedBy: string;
}

/**
 * Final draft results (from league-published CSV / results sheet).
 */
export const PUBLISHED_DRAFT_RESULTS: PublishedDraftResultRow[] = [
  { pick: 1, playerName: 'Bobby Witt Jr.', position: 'SS', ovr: 91, draftedBy: 'SEA Seattle Mariners' },
  { pick: 2, playerName: 'Ramon Laureano', position: 'LF', ovr: 85, draftedBy: 'WSH Washington Nationals' },
  { pick: 3, playerName: 'Trevor Story', position: 'SS', ovr: 84, draftedBy: 'TOR Toronto Blue Jays (via Oakland Athletics)' },
  { pick: 4, playerName: 'Michael Busch', position: '1B', ovr: 84, draftedBy: 'SEA Seattle Mariners (via St. Louis Cardinals)' },
  { pick: 5, playerName: 'Wilyer Abreu', position: 'RF', ovr: 83, draftedBy: 'ARI Arizona Diamondbacks (via Kansas City Royals)' },
  { pick: 6, playerName: 'Max Muncy', position: '3B', ovr: 82, draftedBy: 'SEA Seattle Mariners (via Boston Red Sox)' },
  { pick: 7, playerName: 'Jorge Polanco', position: '2B', ovr: 81, draftedBy: 'BAL Baltimore Orioles' },
  { pick: 8, playerName: 'Ivan Herrera', position: 'C', ovr: 81, draftedBy: 'MIL Milwaukee Brewers' },
  { pick: 9, playerName: 'Austin Wells', position: 'C', ovr: 79, draftedBy: 'SF San Francisco Giants' },
  { pick: 10, playerName: 'Tyler Soderstrom', position: '1B', ovr: 79, draftedBy: 'SD San Diego Padres' },
  { pick: 11, playerName: 'Jacob Young', position: 'CF', ovr: 79, draftedBy: 'TEX Texas Rangers' },
  { pick: 12, playerName: 'Framber Valdez', position: 'SP', ovr: 78, draftedBy: 'NYM New York Mets' },
  { pick: 13, playerName: 'Brock Stewart', position: 'RP', ovr: 78, draftedBy: 'TOR Toronto Blue Jays' },
  { pick: 14, playerName: 'Max Meyer', position: 'SP', ovr: 76, draftedBy: 'NYY New York Yankees' },
  { pick: 15, playerName: 'Colin Rea', position: 'SP', ovr: 74, draftedBy: 'TB Tampa Bay Rays' },
  { pick: 16, playerName: 'Michael Lorenzen', position: 'SP', ovr: 73, draftedBy: 'DET Detroit Tigers' },
  { pick: 17, playerName: 'Matthew Liberatore', position: 'SP', ovr: 72, draftedBy: 'CLE Cleveland Guardians' },
  { pick: 18, playerName: 'Joel Payamps', position: 'RP', ovr: 68, draftedBy: 'PHI Philadelphia Phillies' },
  { pick: 19, playerName: 'Tyler Gilbert', position: 'RP', ovr: 68, draftedBy: 'HOU Houston Astros' },
  { pick: 20, playerName: 'Caden Dana', position: 'SP', ovr: 67, draftedBy: 'CIN Cincinnati Reds' },
  { pick: 21, playerName: 'Jack Suwinski', position: 'CF', ovr: 67, draftedBy: 'CIN Cincinnati Reds' },
  { pick: 22, playerName: 'Alexander Canario', position: 'RF', ovr: 67, draftedBy: 'HOU Houston Astros' },
  { pick: 23, playerName: 'Carlos Vargas', position: 'RP', ovr: 65, draftedBy: 'NYY New York Yankees' },
  { pick: 24, playerName: 'Ryan Noda', position: '1B', ovr: 64, draftedBy: 'MIN Minnesota Twins' },
  { pick: 25, playerName: 'Kris Bryant', position: '1B', ovr: 64, draftedBy: 'MIL Milwaukee Brewers' },
  { pick: 26, playerName: 'Michael Darrell-Hicks', position: 'SP', ovr: 64, draftedBy: 'WSH Washington Nationals' },
  { pick: 27, playerName: 'Thomas Harrington', position: 'SP', ovr: 63, draftedBy: 'SD San Diego Padres' },
  { pick: 28, playerName: 'Ryan Pressly', position: 'RP', ovr: 63, draftedBy: 'NYM New York Mets' },
  { pick: 29, playerName: 'Graham Ashcraft', position: 'RP', ovr: 63, draftedBy: 'MIN Minnesota Twins' },
  { pick: 30, playerName: 'Tyler Saucedo', position: 'RP', ovr: 63, draftedBy: 'ARI Arizona Diamondbacks' },
  { pick: 31, playerName: 'Ryne Stanek', position: 'RP', ovr: 63, draftedBy: 'ARI Arizona Diamondbacks' },
  { pick: 32, playerName: 'Gustavo Campero', position: 'RF', ovr: 63, draftedBy: 'ARI Arizona Diamondbacks (via Kansas City Royals)' },
  { pick: 33, playerName: 'David Villar', position: '3B', ovr: 61, draftedBy: 'BAL Baltimore Orioles' },
];

/** First token of draftedBy — used for "my team" style filters */
export function draftedByAbbrev(row: PublishedDraftResultRow): string {
  const first = row.draftedBy.trim().split(/\s+/)[0] || '';
  return first.toUpperCase();
}
