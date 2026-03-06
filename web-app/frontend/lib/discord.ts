/**
 * Discord Integration Utilities
 * Handles posting announcements and updates to Discord webhooks
 */

export interface DiscordWebhookOptions {
  username?: string;
  avatarUrl?: string;
  content?: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
  thumbnail?: { url: string };
  image?: { url: string };
}

// JKAP brand colors in Discord decimal format
export const DISCORD_COLORS = {
  red: 0xDC2626,      // JKAP Red
  emerald: 0x10B981,  // Success green
  amber: 0xF59E0B,    // Warning yellow
  blue: 0x3B82F6,     // Info blue
  purple: 0x8B5CF6,   // Purple accent
  slate: 0x475569,    // Neutral
};

// Default JKAP avatar
const JKAP_AVATAR = 'https://i.imgur.com/JN8RfHQ.png';

/**
 * Post a message to a Discord webhook
 */
export async function postToDiscord(
  webhookUrl: string,
  options: DiscordWebhookOptions
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl) {
    return { success: false, error: 'No webhook URL configured' };
  }

  try {
    const payload: Record<string, unknown> = {
      username: options.username || 'JKAP Memorial League',
      avatar_url: options.avatarUrl || JKAP_AVATAR,
    };

    if (options.content) {
      payload.content = options.content;
    }

    if (options.embeds && options.embeds.length > 0) {
      payload.embeds = options.embeds;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[Discord] Webhook failed:', response.status, errorText);
      return { success: false, error: `Discord error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('[Discord] Webhook error:', error);
    return { success: false, error: 'Network error posting to Discord' };
  }
}

/**
 * Post a simple text announcement
 */
export async function postAnnouncement(
  webhookUrl: string,
  message: string,
  username?: string
): Promise<{ success: boolean; error?: string }> {
  return postToDiscord(webhookUrl, {
    content: message,
    username: username || 'JKAP Commissioner',
  });
}

/**
 * Post a questionnaire reminder with teams list
 */
export async function postQuestionnaireReminder(
  webhookUrl: string,
  teamsNotCompleted: string[],
  totalTeams: number,
  completedCount: number
): Promise<{ success: boolean; error?: string }> {
  const embed: DiscordEmbed = {
    title: '📋 Off-Season Questionnaire Reminder',
    description: `**${completedCount}/${totalTeams}** members have completed the questionnaire.\n\nThe following teams still need to submit:`,
    color: teamsNotCompleted.length > 10 ? DISCORD_COLORS.red : DISCORD_COLORS.amber,
    fields: [
      {
        name: `⏳ Pending (${teamsNotCompleted.length})`,
        value: teamsNotCompleted.length > 0 
          ? teamsNotCompleted.map(t => `\`${t}\``).join(' ')
          : 'All teams have completed! ✅',
        inline: false,
      },
    ],
    footer: {
      text: 'JKAP Memorial League • Complete your questionnaire ASAP!',
    },
    timestamp: new Date().toISOString(),
  };

  return postToDiscord(webhookUrl, {
    username: 'JKAP Commissioner',
    embeds: [embed],
  });
}

/**
 * Post standings update
 */
export async function postStandingsUpdate(
  webhookUrl: string,
  standings: { rank: number; teamAbbr: string; wins: number; losses: number }[],
  seasonNumber: number
): Promise<{ success: boolean; error?: string }> {
  const top8 = standings.slice(0, 8);
  const standingsText = top8
    .map((s, i) => `${i + 1}. \`${s.teamAbbr}\` (${s.wins}-${s.losses})`)
    .join('\n');

  const embed: DiscordEmbed = {
    title: `🏆 Season ${seasonNumber} Final Standings`,
    description: '**Playoff Teams:**\n' + standingsText,
    color: DISCORD_COLORS.emerald,
    footer: {
      text: 'JKAP Memorial League',
    },
    timestamp: new Date().toISOString(),
  };

  return postToDiscord(webhookUrl, {
    username: 'JKAP Standings',
    embeds: [embed],
  });
}

/**
 * Post draft order announcement
 */
export async function postDraftOrder(
  webhookUrl: string,
  draftOrder: { pick: number; teamAbbr: string; teamName: string }[],
  seasonNumber: number
): Promise<{ success: boolean; error?: string }> {
  const draftText = draftOrder
    .map(d => `${d.pick}. \`${d.teamAbbr}\` ${d.teamName}`)
    .join('\n');

  const embed: DiscordEmbed = {
    title: `🎯 Season ${seasonNumber + 1} Draft Order`,
    description: draftText,
    color: DISCORD_COLORS.blue,
    footer: {
      text: 'JKAP Memorial League • Good luck in the draft!',
    },
    timestamp: new Date().toISOString(),
  };

  return postToDiscord(webhookUrl, {
    username: 'JKAP Draft',
    embeds: [embed],
  });
}

/**
 * Post a custom embedded announcement
 */
export async function postCustomAnnouncement(
  webhookUrl: string,
  title: string,
  message: string,
  color?: number
): Promise<{ success: boolean; error?: string }> {
  const embed: DiscordEmbed = {
    title: `📢 ${title}`,
    description: message,
    color: color || DISCORD_COLORS.red,
    footer: {
      text: 'JKAP Memorial League',
    },
    timestamp: new Date().toISOString(),
  };

  return postToDiscord(webhookUrl, {
    username: 'JKAP Commissioner',
    embeds: [embed],
  });
}

/**
 * Post playoff bracket announcement
 */
export async function postPlayoffBracket(
  webhookUrl: string,
  matchups: { seed1: string; team1: string; seed2: string; team2: string }[],
  seasonNumber: number
): Promise<{ success: boolean; error?: string }> {
  const matchupText = matchups
    .map((m, i) => `**Game ${i + 1}:** #${m.seed1} ${m.team1} vs #${m.seed2} ${m.team2}`)
    .join('\n');

  const embed: DiscordEmbed = {
    title: `⚾ Season ${seasonNumber} Playoff Bracket`,
    description: matchupText,
    color: DISCORD_COLORS.purple,
    footer: {
      text: 'JKAP Memorial League • May the best team win!',
    },
    timestamp: new Date().toISOString(),
  };

  return postToDiscord(webhookUrl, {
    username: 'JKAP Playoffs',
    embeds: [embed],
  });
}
