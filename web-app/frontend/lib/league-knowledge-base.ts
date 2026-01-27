// =============================================================================
// JKAP MEMORIAL LEAGUE - COMPLETE KNOWLEDGE BASE
// This file contains all league rules, policies, and information
// Used by the AI assistant to answer user questions
// =============================================================================

export interface LeagueRule {
  category: string;
  title: string;
  content: string;
  keywords: string[];
}

export const LEAGUE_INFO = {
  name: "JKAP Memorial League",
  platform: "MLB The Show",
  console: "PlayStation/Xbox",
  seasonLength: "162 games",
  founded: "In memory of JKAP",
  commissioner: "League Commissioner",
  inGameLeagueName: "Jkapmemorial",
};

export const KNOWLEDGE_BASE: LeagueRule[] = [
  // =============================================================================
  // GENERAL LEAGUE INFO
  // =============================================================================
  {
    category: "General",
    title: "About the League",
    content: `The JKAP Memorial League is a competitive MLB The Show online franchise league. 
We play full 162-game seasons with 30 teams. The league was founded in memory of JKAP and 
focuses on fair, competitive gameplay with an active community. We use Discord for communication 
and coordination, and this app for league management tools.`,
    keywords: ["about", "what is", "jkap", "league", "info", "information", "memorial"],
  },
  {
    category: "General",
    title: "How to Join the League In-Game",
    content: `To join the JKAP Memorial League in MLB The Show:
1. Open MLB The Show on PlayStation or Xbox
2. Go to Franchise → Online Franchise
3. Select "Search" or "Find League"
4. Search for: Jkapmemorial (one word, no spaces)
5. Join the league and select your assigned team

You MUST join the in-game league to play games with other members. Your team assignment will match what you registered for on the website.`,
    keywords: ["join", "in-game", "game", "franchise", "online", "search", "find", "jkapmemorial", "playstation", "xbox", "how to join"],
  },
  {
    category: "General",
    title: "How to Contact the Commissioner",
    content: `You can reach the commissioner through:
1. Discord - Send a direct message to the commissioner
2. The league Facebook group
3. Through the app's messaging features (coming soon)

For urgent matters, Discord is the fastest way to get a response.`,
    keywords: ["commissioner", "contact", "help", "question", "reach", "message", "dm"],
  },

  // =============================================================================
  // ACTIVITY & GAMEPLAY REQUIREMENTS
  // =============================================================================
  {
    category: "Activity",
    title: "Minimum Games Per Week",
    content: `You must play a MINIMUM of 5 games per week to remain active in the league. 
This is tracked by the activity monitor. If you're going to be away (vacation, work, etc.), 
let the commissioner know in advance so you don't get flagged for inactivity.

Failure to meet the minimum games requirement may result in:
- First offense: Warning
- Second offense: Final warning  
- Third offense: Removal from the league`,
    keywords: ["games", "week", "minimum", "activity", "requirement", "play", "how many", "inactive", "inactivity", "5 games"],
  },
  {
    category: "Activity",
    title: "What Happens If I'm Inactive",
    content: `If you become inactive (not playing the minimum 5 games per week):
1. You'll receive a warning from the commissioner
2. Continued inactivity leads to a final warning
3. If activity doesn't improve, you may be removed from the league

If you know you'll be away, let the commissioner know ahead of time! We understand life happens - 
just communicate with us and we can work something out (temporary replacement, pause, etc.).`,
    keywords: ["inactive", "not playing", "removed", "kick", "kicked", "warning", "away", "vacation", "break"],
  },
  {
    category: "Activity",
    title: "Scheduling Games",
    content: `To schedule games with opponents:
1. Check Discord for your matchup
2. Message your opponent to find a time that works
3. Respond to matchup requests within 24 hours
4. If you can't find a time, contact the commissioner

Tip: Being flexible with scheduling helps everyone. Try to offer multiple time options.`,
    keywords: ["schedule", "scheduling", "matchup", "opponent", "play", "when", "time", "game time"],
  },

  // =============================================================================
  // TRADING RULES
  // =============================================================================
  {
    category: "Trading",
    title: "New Member Trading Rules",
    content: `As a NEW member, you get 1 FREE TRADE when you join the league. 
Use this trade wisely! After your first trade, you must complete 15 GAMES before you can trade again.

This rule prevents new members from immediately trading away all their good players 
and ensures you're committed to the league before making major roster moves.`,
    keywords: ["new", "member", "first", "trade", "free", "join", "start", "beginning"],
  },
  {
    category: "Trading",
    title: "Trade Frequency Limit",
    content: `After your initial free trade, you must wait 15 GAMES between trades.
This means:
- Make a trade
- Play 15 games
- Then you can trade again

This prevents excessive trading and keeps rosters stable for competitive balance.`,
    keywords: ["how often", "trade", "frequency", "limit", "15 games", "wait", "between", "next trade"],
  },
  {
    category: "Trading",
    title: "Trade Approval Process",
    content: `All trades must be approved by the commissioner. Here's how it works:
1. Propose your trade in the game
2. Post the trade details in Discord (or the trade channel)
3. Commissioner reviews within 24 hours
4. If fair, trade is approved
5. If unfair/lopsided, trade is rejected with explanation

Trades are evaluated for fairness - we want competitive balance, not super-teams.`,
    keywords: ["approve", "approval", "approved", "commissioner", "review", "fair", "process", "how", "submit"],
  },
  {
    category: "Trading",
    title: "What Makes a Fair Trade",
    content: `Fair trades are evaluated based on:
- Overall player ratings
- Player potential and age
- Position value
- Current team needs

Lopsided trades (e.g., 99 OVR for 70 OVR) will be rejected. 
The goal is competitive balance - not allowing one team to stack all the best players.

If you're unsure about a trade, ask the commissioner before proposing it!`,
    keywords: ["fair", "lopsided", "rejected", "value", "balance", "ratings", "allowed", "deny", "denied"],
  },
  {
    category: "Trading",
    title: "Trade Deadline",
    content: `There is a trade deadline during the season (typically around the All-Star break). 
After the deadline, no trades are allowed until the offseason.

The exact date is announced in Discord each season. Plan your trades accordingly!`,
    keywords: ["deadline", "when", "cutoff", "last day", "no more trades", "offseason"],
  },

  // =============================================================================
  // INJURED LIST (IL) RULES
  // =============================================================================
  {
    category: "Injured List",
    title: "IL Usage Limit",
    content: `You must use your IL 3 SEPARATE TIMES per season. This ensures teams are actively managing their rosters and not just avoiding the IL system entirely.

The IL is designed to help you manage injuries and roster flexibility throughout the season.`,
    keywords: ["il", "injured", "list", "usage", "times", "season", "limit", "3 times", "separate"],
  },
  {
    category: "Injured List",
    title: "Minimum IL Stint",
    content: `When you place a player on the Injured List (IL), they must stay for a MINIMUM of 5 GAMES.
This prevents abuse of the IL for roster manipulation. Only place players on IL if they're actually hurt 
or you need long-term roster flexibility.`,
    keywords: ["il", "injured", "list", "minimum", "how long", "days", "games", "stint", "duration"],
  },
  {
    category: "Injured List",
    title: "Returning from IL",
    content: `Once a player is activated from the IL, they must remain on your ACTIVE ROSTER for 5 GAMES.
This prevents players from cycling in and out of the IL repeatedly.

Summary:
- IL Usage: Must use 3 separate times per season
- On IL: Minimum 5 games
- After activation: Must stay on active roster for 5 games`,
    keywords: ["activate", "activated", "return", "returning", "back", "active roster", "after il"],
  },
  {
    category: "Injured List",
    title: "Using the IL Manager",
    content: `To place a player on the IL:
1. Go to League Tools → IL Manager
2. Click "Add Placement"
3. Select the player and injury type
4. Submit - it will be tracked and posted to Discord

To activate a player:
1. Find them in your IL list
2. Click "Activate"
3. The 5-game active roster requirement starts`,
    keywords: ["how", "use", "il manager", "tool", "place", "add", "remove"],
  },

  // =============================================================================
  // GAMEPLAY & SPORTSMANSHIP
  // =============================================================================
  {
    category: "Gameplay",
    title: "Game Reporting",
    content: `📝 Report all game scores using the Game Recap tool. This helps track standings and stats.

How to report:
1. Go to League Tools → Game Recap Creator
2. Enter game details (scores, key players, etc.)
3. Generate your recap
4. Share to Discord if desired

Reporting your games is required to ensure accurate standings and stat tracking.`,
    keywords: ["report", "score", "result", "game recap", "submit", "enter", "record", "standings", "stats"],
  },
  {
    category: "Gameplay",
    title: "Sportsmanship",
    content: `🤝 Respect your opponents. No cheesing, excessive bunting, or unsportsmanlike conduct.

We expect good sportsmanship from all members:
- No cheesing (exploiting game mechanics)
- No excessive bunting
- No intentional walks to avoid a matchup (unless strategic)
- No running up the score in blowouts
- Be respectful to opponents in messages

Violations result in warnings and potential removal for repeat offenders.`,
    keywords: ["cheese", "cheesing", "bunt", "bunting", "sportsmanship", "fair play", "exploit", "abuse", "respect"],
  },
  {
    category: "Gameplay",
    title: "Game Settings",
    content: `All games use the official league settings:
- Difficulty: Legend/Legend (or as set by commissioner)
- Game length: 9 innings
- Quick counts: Off
- Injuries: On
- Trades: Commissioner approval required

Do not change settings mid-game. If there's a settings issue, pause and contact your opponent.`,
    keywords: ["settings", "difficulty", "innings", "options", "configuration", "legend"],
  },
  {
    category: "Gameplay",
    title: "Disconnections & Lag",
    content: `If the game disconnects or there's major lag:
1. Screenshot the score if possible
2. Contact your opponent immediately
3. Try to reconnect and resume
4. If you can't resume, contact the commissioner

Games may be replayed if there's a genuine connection issue. Intentional disconnections 
to avoid a loss are not allowed and will result in automatic loss + warning.`,
    keywords: ["disconnect", "disconnection", "lag", "connection", "frozen", "crash", "resume"],
  },

  // =============================================================================
  // OFFSEASON
  // =============================================================================
  {
    category: "Offseason",
    title: "Draft Rules",
    content: `The amateur draft follows these rules:
- Draft order based on previous season standings (worst team picks first)
- All picks must be made within the time limit
- Draft pick trading is allowed (with commissioner approval)
- Compensatory picks for free agent losses

Draft dates are announced well in advance on Discord.`,
    keywords: ["draft", "picks", "order", "amateur", "prospect", "rookie"],
  },

  // =============================================================================
  // TOOLS & FEATURES
  // =============================================================================
  {
    category: "Tools",
    title: "Game Recap Creator",
    content: `The Game Recap Creator helps you document your games:
- Enter game scores and key players
- Generate professional-looking recaps
- Share to Discord automatically
- Track your game history

Access it from League Tools → Game Recap Creator.`,
    keywords: ["recap", "game recap", "creator", "tool", "summary"],
  },
  {
    category: "Tools",
    title: "Players Academy",
    content: `The Players Academy helps you improve your gameplay:
- Upload hitting/pitching analysis screenshots
- Get AI-powered feedback on strengths and weaknesses
- Learn what you did well and what to improve
- Track your progress over time

This is especially helpful for newer players looking to compete with veterans!`,
    keywords: ["academy", "players academy", "improve", "better", "learn", "analysis", "feedback"],
  },
  {
    category: "Tools",
    title: "IL Manager",
    content: `The IL Manager tracks all injured list moves:
- Place players on IL with one click
- Track minimum game requirements
- Auto-post announcements to Discord
- View league-wide IL activity

The commissioner can see all teams' IL moves for monitoring.`,
    keywords: ["il manager", "injured list", "tool", "track", "manage"],
  },

  // =============================================================================
  // COMMUNITY & COMMUNICATION
  // =============================================================================
  {
    category: "Community",
    title: "Discord Required",
    content: `💬 Join our Discord server for matchup coordination, announcements, and community chat.

Discord is REQUIRED for all league members. It's our main hub for:
- #general - Chat with league members
- #matchups - Schedule and coordinate games
- #trades - Propose and discuss trades
- #announcements - Official league news
- #game-recaps - Share your game recaps

Check Discord daily for updates and matchup requests!`,
    keywords: ["discord", "server", "chat", "channel", "communicate", "talk", "required", "join"],
  },
  {
    category: "Community",
    title: "Facebook Group",
    content: `📱 Join our Facebook group for league updates and announcements.

Our Facebook group provides:
- Announcements and news
- Highlights and recaps
- Community discussion
- Event notifications

Join the group to stay connected with the league community.`,
    keywords: ["facebook", "group", "social", "page", "updates", "announcements"],
  },
  {
    category: "Community",
    title: "Response Time",
    content: `⏳ Respond to matchup requests within 1 hour. Ghosting opponents may result in removal.

Communication is key to keeping the league running smoothly:
- Check Discord regularly for matchup requests
- Respond within 1 hour when possible
- If you can't play, let your opponent know ASAP
- Ghosting (not responding) repeatedly will result in warnings

We understand everyone has different schedules - just communicate!`,
    keywords: ["response", "time", "respond", "hour", "ghosting", "ghost", "reply", "matchup", "request"],
  },

  // =============================================================================
  // PENALTIES & ENFORCEMENT
  // =============================================================================
  {
    category: "Penalties",
    title: "Warning System",
    content: `Violations of league rules result in warnings:
- 1st offense: Warning
- 2nd offense: Final warning
- 3rd offense: Removal from league

Serious violations (cheating, harassment) may result in immediate ban.
All warnings are tracked and communicated by the commissioner.`,
    keywords: ["warning", "offense", "violation", "punishment", "consequence", "strike"],
  },
  {
    category: "Penalties",
    title: "Removal vs Ban",
    content: `There's a difference between removal and ban:
- REMOVED: You can potentially return after appeal and waiting period
- BANNED: Permanent. You cannot rejoin the league under any account

Bans are reserved for serious violations like cheating, harassment, or repeated rule-breaking.`,
    keywords: ["removed", "banned", "ban", "kick", "kicked out", "appeal", "return"],
  },
  {
    category: "Penalties",
    title: "Appeals Process",
    content: `If you're removed (not banned), you can appeal:
1. Wait at least 30 days
2. Contact the commissioner
3. Explain what happened and how you'll improve
4. Commissioner makes final decision

Appeals are considered case-by-case. Genuine desire to follow rules is required.`,
    keywords: ["appeal", "return", "come back", "rejoin", "second chance"],
  },
];

// Build the full knowledge base as a single string for the AI
export function getFullKnowledgeBase(): string {
  let kb = `# JKAP MEMORIAL LEAGUE - COMPLETE RULEBOOK & KNOWLEDGE BASE\n\n`;
  kb += `League Name: ${LEAGUE_INFO.name}\n`;
  kb += `Platform: ${LEAGUE_INFO.platform} (${LEAGUE_INFO.console})\n`;
  kb += `Season Length: ${LEAGUE_INFO.seasonLength}\n\n`;
  kb += `---\n\n`;

  // Group by category
  const categories = Array.from(new Set(KNOWLEDGE_BASE.map(r => r.category)));
  
  for (const category of categories) {
    kb += `## ${category.toUpperCase()}\n\n`;
    const rules = KNOWLEDGE_BASE.filter(r => r.category === category);
    
    for (const rule of rules) {
      kb += `### ${rule.title}\n`;
      kb += `${rule.content}\n\n`;
    }
    kb += `---\n\n`;
  }

  return kb;
}

// Search the knowledge base for relevant rules
export function searchKnowledgeBase(query: string): LeagueRule[] {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  
  // Score each rule based on keyword matches
  const scored = KNOWLEDGE_BASE.map(rule => {
    let score = 0;
    
    // Check keywords
    for (const keyword of rule.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        score += 3;
      }
      for (const word of words) {
        if (keyword.toLowerCase().includes(word) || word.includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
    }
    
    // Check title
    if (rule.title.toLowerCase().includes(lowerQuery)) {
      score += 5;
    }
    for (const word of words) {
      if (rule.title.toLowerCase().includes(word)) {
        score += 2;
      }
    }
    
    // Check content
    for (const word of words) {
      if (word.length > 2 && rule.content.toLowerCase().includes(word)) {
        score += 1;
      }
    }
    
    return { rule, score };
  });
  
  // Return top matches
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.rule);
}
