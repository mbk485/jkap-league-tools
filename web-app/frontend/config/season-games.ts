/**
 * Current season boundary for game log stats, leaderboards, and history.
 * Games with game_date before this (by calendar date) are prior seasons and excluded
 * from wins/losses, HR/K leaderboards, streaks, and default history views.
 * Update when a new MLB The Show league year begins.
 */
export const CURRENT_SEASON_GAME_MIN_DATE = '2026-03-20';

/** Display string for UI copy */
export const CURRENT_SEASON_GAME_MIN_DATE_LABEL = 'March 20, 2026';
