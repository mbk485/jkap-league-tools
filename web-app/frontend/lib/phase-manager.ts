/**
 * Phase Manager - Handles off-season phase transitions with admin approval
 */

import { SeasonPhase } from '@/types/offseason';
import { postCustomAnnouncement, postQuestionnaireReminder } from './discord';

// Phase order for automatic transitions
// Note: Draft Prep comes BEFORE Roster Finalization (swapped per user request)
// Spring Training added after draft, before regular season
export const PHASE_ORDER: SeasonPhase[] = [
  'regular_season',
  'postseason_sim',
  'awards_voting',
  'questionnaire',
  'free_agent_declaration',
  'world_series',
  'claiming_period',
  'claim_resolution',
  'draft_prep',           // Draft preparation comes after claims
  'draft',                // The draft
  'roster_finalization',  // Final roster adjustments after draft
  'spring_training',      // 3 games; unlimited approved trades (48hrs or 3 games)
  // 'pre_season',        // Deprecated - goes straight to regular season
];

// Phase configuration with deadlines and requirements
export interface PhaseConfig {
  phase: SeasonPhase;
  name: string;
  defaultDurationHours: number;
  requiresApproval: boolean;
  autoReminders: boolean;
  reminderHoursBefore: number[];
  canSkip: boolean;
  requirements?: string[];
  discordAnnouncement?: {
    title: string;
    message: string;
  };
}

export const PHASE_CONFIGS: Record<SeasonPhase, PhaseConfig> = {
  regular_season: {
    phase: 'regular_season',
    name: 'Regular Season',
    defaultDurationHours: 0, // No deadline
    requiresApproval: true,
    autoReminders: false,
    reminderHoursBefore: [],
    canSkip: false,
  },
  postseason_sim: {
    phase: 'postseason_sim',
    name: 'Postseason Simulation',
    defaultDurationHours: 24,
    requiresApproval: true,
    autoReminders: false,
    reminderHoursBefore: [],
    canSkip: true,
  },
  awards_voting: {
    phase: 'awards_voting',
    name: 'Awards Voting',
    defaultDurationHours: 48,
    requiresApproval: true,
    autoReminders: true,
    reminderHoursBefore: [24, 6],
    canSkip: false,
    requirements: ['Set MVP candidates', 'Set Cy Young candidates'],
    discordAnnouncement: {
      title: 'Awards Voting Now Open!',
      message: '🏆 Cast your votes for **MVP** and **Cy Young**!\n\nVoting closes in 48 hours. Head to the Off-Season Hub to submit your ballot.',
    },
  },
  questionnaire: {
    phase: 'questionnaire',
    name: 'Off-Season Questionnaire',
    defaultDurationHours: 72,
    requiresApproval: true,
    autoReminders: true,
    reminderHoursBefore: [48, 24, 12],
    canSkip: false,
    requirements: ['All active members notified'],
    discordAnnouncement: {
      title: 'Off-Season Questionnaire',
      message: '📋 The off-season questionnaire is now open!\n\nPlease complete it within **72 hours** to confirm your participation for next season.',
    },
  },
  free_agent_declaration: {
    phase: 'free_agent_declaration',
    name: 'Free Agent Declaration',
    defaultDurationHours: 48,
    requiresApproval: true,
    autoReminders: true,
    reminderHoursBefore: [24, 6],
    canSkip: false,
    requirements: ['Questionnaire phase complete'],
    discordAnnouncement: {
      title: 'Free Agent Declaration Period',
      message: '🔄 **Declare your free agents!**\n\nYou must declare at least **1 player** as a free agent before the deadline. Head to the Off-Season Hub to declare.',
    },
  },
  world_series: {
    phase: 'world_series',
    name: 'World Series',
    defaultDurationHours: 0, // No deadline - ends when series ends
    requiresApproval: true,
    autoReminders: false,
    reminderHoursBefore: [],
    canSkip: false,
    discordAnnouncement: {
      title: 'World Series Begins!',
      message: '⚾ **The World Series is underway!**\n\n🏆 Good luck to our playoff teams!\n❄️ Non-playoff teams: Winter League is now open!',
    },
  },
  claiming_period: {
    phase: 'claiming_period',
    name: 'Claiming Period',
    defaultDurationHours: 48,
    requiresApproval: true,
    autoReminders: true,
    reminderHoursBefore: [24, 12, 6],
    canSkip: false,
    requirements: ['World Series complete', 'Free agents declared'],
    discordAnnouncement: {
      title: '48-Hour Claiming Window Open!',
      message: '🎯 **The claiming period has begun!**\n\nYou have **48 hours** to submit claims on declared free agents.\n\n⚠️ Remember: You can only claim players of **equal or lower** classification than what you offer.',
    },
  },
  claim_resolution: {
    phase: 'claim_resolution',
    name: 'Claim Resolution',
    defaultDurationHours: 24,
    requiresApproval: true,
    autoReminders: false,
    reminderHoursBefore: [],
    canSkip: false,
    requirements: ['Claiming period complete'],
    discordAnnouncement: {
      title: 'Processing Claims',
      message: '⚙️ **Claims are being processed.**\n\nPriority goes to teams with the worst records. Results will be announced soon!',
    },
  },
  draft_prep: {
    phase: 'draft_prep',
    name: 'Draft Preparation',
    defaultDurationHours: 48,
    requiresApproval: true,
    autoReminders: true,
    reminderHoursBefore: [24],
    canSkip: false,
    requirements: ['Draft order finalized', 'Draft eligible players list ready'],
    discordAnnouncement: {
      title: 'Draft Order Announced!',
      message: '🎯 **The draft order has been set!**\n\nReview the draft board and prepare your strategy. Draft day is coming soon!',
    },
  },
  draft: {
    phase: 'draft',
    name: 'Draft',
    defaultDurationHours: 0, // Live event
    requiresApproval: true,
    autoReminders: false,
    reminderHoursBefore: [],
    canSkip: false,
    discordAnnouncement: {
      title: 'DRAFT DAY!',
      message: '🏈 **IT\'S DRAFT DAY!**\n\nHead to the Draft Tool to participate. Good luck!',
    },
  },
  roster_finalization: {
    phase: 'roster_finalization',
    name: 'Roster Finalization',
    defaultDurationHours: 24,
    requiresApproval: true,
    autoReminders: true,
    reminderHoursBefore: [12],
    canSkip: true,
    discordAnnouncement: {
      title: 'Finalize Your Rosters',
      message: '📝 **Last chance to make roster adjustments!**\n\nThe draft is complete. Review your roster and make any final changes before Spring Training.',
    },
  },
  spring_training: {
    phase: 'spring_training',
    name: 'Spring Training',
    defaultDurationHours: 48, // 48 hours OR 3 games, whichever first
    requiresApproval: true,
    autoReminders: true,
    reminderHoursBefore: [24, 12],
    canSkip: false,
    requirements: [
      'Play 3 games',
      'Spring training or alternate jerseys',
      'Spring training or minor league stadiums',
    ],
    discordAnnouncement: {
      title: '⚾ SPRING TRAINING BEGINS!',
      message:
        '🌴 **Spring Training is here!**\n\n**GAMES:**\n• Play **3** spring training games (regular season starts after).\n\n**UNIFORMS & STADIUMS:**\n• Use **spring training** or **alternate** jerseys.\n• Play in **spring training** or **minor league** stadiums only.\n\n**TRADING:**\n• **Unlimited** trades during the window (all trades still need **commissioner approval**).\n• Window ends after **3 games** OR **48 hours** from the league start of ST—**whichever comes first**.\n• Post trade proposals and follow league trade rules in **T&WR** (Trades, Waivers & Rules).\n\nGood luck—see you on Opening Day! ⚾',
    },
  },
  pre_season: {
    phase: 'pre_season',
    name: 'Pre-Season',
    defaultDurationHours: 0,
    requiresApproval: true,
    autoReminders: false,
    reminderHoursBefore: [],
    canSkip: true, // Can skip since spring training is the real start
    discordAnnouncement: {
      title: 'Welcome to the New Season!',
      message: '🌟 **A new season begins!**\n\nRosters are set, schedules are ready. Let\'s play ball! ⚾',
    },
  },
};

/**
 * Get the next phase in sequence
 */
export function getNextPhase(currentPhase: SeasonPhase): SeasonPhase | null {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
    return null;
  }
  return PHASE_ORDER[currentIndex + 1];
}

/**
 * Get phase config
 */
export function getPhaseConfig(phase: SeasonPhase): PhaseConfig {
  return PHASE_CONFIGS[phase];
}

/**
 * Calculate deadline from start time
 */
export function calculateDeadline(phase: SeasonPhase, startTime: Date): Date | null {
  const config = PHASE_CONFIGS[phase];
  if (config.defaultDurationHours === 0) {
    return null; // No automatic deadline
  }
  return new Date(startTime.getTime() + config.defaultDurationHours * 60 * 60 * 1000);
}

/**
 * Check if a deadline reminder should be sent
 */
export function shouldSendReminder(
  phase: SeasonPhase,
  deadline: Date,
  lastReminderSent: Date | null
): { shouldSend: boolean; hoursRemaining: number } {
  const config = PHASE_CONFIGS[phase];
  if (!config.autoReminders || config.reminderHoursBefore.length === 0) {
    return { shouldSend: false, hoursRemaining: 0 };
  }

  const now = new Date();
  const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  for (const reminderHour of config.reminderHoursBefore) {
    if (hoursRemaining <= reminderHour && hoursRemaining > reminderHour - 1) {
      // Check if we already sent a reminder in this window
      if (lastReminderSent) {
        const hoursSinceLastReminder = (now.getTime() - lastReminderSent.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastReminder < 1) {
          return { shouldSend: false, hoursRemaining };
        }
      }
      return { shouldSend: true, hoursRemaining };
    }
  }

  return { shouldSend: false, hoursRemaining };
}

/**
 * Generate reminder message for a phase
 */
export function generateReminderMessage(
  phase: SeasonPhase,
  hoursRemaining: number,
  pendingTeams?: string[]
): { title: string; message: string } {
  const config = PHASE_CONFIGS[phase];
  const timeText = hoursRemaining < 1 
    ? 'less than 1 hour' 
    : hoursRemaining < 24 
    ? `${Math.round(hoursRemaining)} hours`
    : `${Math.round(hoursRemaining / 24)} days`;

  let message = `⏰ **${timeText} remaining!**\n\n`;

  switch (phase) {
    case 'questionnaire':
      message += `Complete the off-season questionnaire before the deadline.`;
      if (pendingTeams && pendingTeams.length > 0) {
        message += `\n\n**Still pending (${pendingTeams.length}):** ${pendingTeams.map(t => `\`${t}\``).join(' ')}`;
      }
      break;
    case 'free_agent_declaration':
      message += `Declare at least 1 free agent before the window closes.`;
      if (pendingTeams && pendingTeams.length > 0) {
        message += `\n\n**Still need to declare (${pendingTeams.length}):** ${pendingTeams.map(t => `\`${t}\``).join(' ')}`;
      }
      break;
    case 'claiming_period':
      message += `Submit your free agent claims before the deadline!`;
      break;
    case 'awards_voting':
      message += `Cast your MVP and Cy Young votes!`;
      if (pendingTeams && pendingTeams.length > 0) {
        message += `\n\n**Still need to vote (${pendingTeams.length}):** ${pendingTeams.map(t => `\`${t}\``).join(' ')}`;
      }
      break;
    default:
      message += `The ${config.name} phase deadline is approaching.`;
  }

  return {
    title: `⏰ ${config.name} - Deadline Reminder`,
    message,
  };
}

/**
 * Check if phase can transition (for approval request)
 */
export function canTransitionPhase(
  currentPhase: SeasonPhase,
  completionData: {
    questionnaireCompleted: number;
    totalMembers: number;
    declarationsSubmitted: number;
    claimsProcessed: boolean;
  }
): { canTransition: boolean; blockers: string[] } {
  const blockers: string[] = [];
  
  switch (currentPhase) {
    case 'questionnaire':
      // Can transition when deadline hit, but warn if not everyone completed
      if (completionData.questionnaireCompleted < completionData.totalMembers) {
        blockers.push(`${completionData.totalMembers - completionData.questionnaireCompleted} members haven't completed questionnaire`);
      }
      break;
    case 'free_agent_declaration':
      if (completionData.declarationsSubmitted === 0) {
        blockers.push('No free agents have been declared');
      }
      break;
    case 'claim_resolution':
      if (!completionData.claimsProcessed) {
        blockers.push('Claims have not been processed yet');
      }
      break;
  }

  return {
    canTransition: true, // Allow transition even with warnings
    blockers,
  };
}

/**
 * Generate phase transition announcement
 */
export async function announcePhaseTransition(
  webhookUrl: string,
  newPhase: SeasonPhase
): Promise<{ success: boolean; error?: string }> {
  const config = PHASE_CONFIGS[newPhase];
  if (!config.discordAnnouncement) {
    return { success: true }; // No announcement configured
  }

  return postCustomAnnouncement(
    webhookUrl,
    config.discordAnnouncement.title,
    config.discordAnnouncement.message
  );
}
