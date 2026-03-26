/**
 * Discord Webhook Integration for JKAP Memorial League
 * Handles trade submissions, notifications, and committee communications
 */

export interface TradeSubmission {
  tradeId: string;
  proposingTeam: string;
  proposingTeamAbbr: string;
  proposingUser: string;
  receivingTeam: string;
  receivingTeamAbbr: string;
  receivingUser: string;
  playersOffered: { name: string; position: string; overall: number }[];
  playersRequested: { name: string; position: string; overall: number }[];
  agreedAt: string;
  message?: string;
}

export interface TradeCommitteeResponse {
  tradeId: string;
  approved: boolean;
  reviewedBy: string;
  reviewedAt: string;
  notes: string;
}

// Discord webhook URLs - these should be stored in environment variables
const TRADE_COMMITTEE_WEBHOOK = process.env.NEXT_PUBLIC_DISCORD_TRADE_WEBHOOK || '';

/**
 * Format a trade for Discord display
 */
function formatTradeEmbed(trade: TradeSubmission) {
  const playersOfferedList = trade.playersOffered
    .map(p => `• ${p.name} (${p.position}) - ${p.overall} OVR`)
    .join('\n');
  
  const playersRequestedList = trade.playersRequested
    .map(p => `• ${p.name} (${p.position}) - ${p.overall} OVR`)
    .join('\n');

  return {
    embeds: [
      {
        title: '🔔 Trade Submitted for Review',
        color: 0x9333ea, // Purple
        fields: [
          {
            name: `📤 ${trade.proposingTeam} Sends`,
            value: playersOfferedList || 'No players',
            inline: true,
          },
          {
            name: `📥 ${trade.receivingTeam} Sends`,
            value: playersRequestedList || 'No players',
            inline: true,
          },
          {
            name: '👥 Teams Involved',
            value: `**${trade.proposingTeam}** (${trade.proposingUser}) ↔️ **${trade.receivingTeam}** (${trade.receivingUser})`,
            inline: false,
          },
          {
            name: '⏰ Agreed On',
            value: new Date(trade.agreedAt).toLocaleString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short',
            }),
            inline: false,
          },
        ],
        footer: {
          text: `Trade ID: ${trade.tradeId} | React with ✅ to approve or ❌ to deny`,
        },
        timestamp: new Date().toISOString(),
      },
    ],
    content: '**@Trade Committee** - A new trade has been submitted for approval!',
  };
}

/**
 * Submit a trade to the Trade Committee Discord channel
 */
export async function submitTradeToCommittee(trade: TradeSubmission): Promise<{ success: boolean; error?: string }> {
  if (!TRADE_COMMITTEE_WEBHOOK) {
    console.warn('Discord webhook URL not configured');
    // In development, just log the trade
    console.log('Trade submitted (webhook not configured):', trade);
    return { success: true };
  }

  try {
    const payload = formatTradeEmbed(trade);
    
    const response = await fetch(TRADE_COMMITTEE_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to submit trade to Discord:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send a notification when a trade is approved
 */
export async function notifyTradeApproved(trade: TradeSubmission, notes?: string): Promise<{ success: boolean }> {
  if (!TRADE_COMMITTEE_WEBHOOK) {
    console.log('Trade approved notification (webhook not configured):', trade);
    return { success: true };
  }

  try {
    const payload = {
      embeds: [
        {
          title: '✅ Trade Approved',
          color: 0x22c55e, // Green
          description: `The trade between **${trade.proposingTeam}** and **${trade.receivingTeam}** has been approved by the Trade Committee.`,
          fields: notes ? [
            {
              name: '📝 Committee Notes',
              value: notes,
            },
          ] : [],
          footer: {
            text: `Trade ID: ${trade.tradeId}`,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch(TRADE_COMMITTEE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return { success: response.ok };
  } catch {
    return { success: false };
  }
}

/**
 * Send a notification when a trade is denied
 */
export async function notifyTradeDenied(trade: TradeSubmission, reason: string): Promise<{ success: boolean }> {
  if (!TRADE_COMMITTEE_WEBHOOK) {
    console.log('Trade denied notification (webhook not configured):', trade, reason);
    return { success: true };
  }

  try {
    const payload = {
      embeds: [
        {
          title: '❌ Trade Denied',
          color: 0xef4444, // Red
          description: `The trade between **${trade.proposingTeam}** and **${trade.receivingTeam}** has been denied by the Trade Committee.`,
          fields: [
            {
              name: '📝 Reason / Feedback',
              value: reason,
            },
          ],
          footer: {
            text: `Trade ID: ${trade.tradeId} | Teams may revise and resubmit`,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch(TRADE_COMMITTEE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return { success: response.ok };
  } catch {
    return { success: false };
  }
}

/**
 * Send a DM-style notification to specific users (requires bot integration)
 * This is a placeholder - actual implementation would require a Discord bot
 */
export async function notifyTradeParticipants(
  proposingUserId: string,
  receivingUserId: string,
  message: string
): Promise<void> {
  // This would require a Discord bot to send DMs
  // For now, we'll handle notifications through the app's notification system
  console.log('Notify trade participants:', { proposingUserId, receivingUserId, message });
}
