// OpenAI API Integration for JKAP Memorial League
// Used for generating game recaps and other AI-powered content

interface GameRecapInput {
  homeTeam: string;
  homeTeamName: string;
  awayTeam: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  gameDate: string;
  gameNumber: number;
  innings: number;
  winningPitcher?: string;
  losingPitcher?: string;
  saveBy?: string;
  keyPlayers: {
    name: string;
    team: 'home' | 'away';
    stats: string;
    isStarOfGame?: boolean;
  }[];
  highlights: string[];
}

interface GeneratedRecap {
  headline: string;
  body: string;
  pullQuote?: string;
  socialPost?: string;
  timestamp: string;
}

type RecapStyle = 'espn' | 'newspaper' | 'social';

// Check if OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return !!getApiKey();
}

// Get API key from localStorage (admin-only setting)
function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('jkap_openai_api_key');
}

// Save API key to localStorage
export function saveApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('jkap_openai_api_key', apiKey);
}

// Remove API key
export function removeApiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('jkap_openai_api_key');
}

// Generate system prompt based on style
function getSystemPrompt(style: RecapStyle): string {
  const baseContext = `You are a sports writer for the JKAP Memorial League, an MLB The Show online baseball league. Write engaging, professional game recaps.`;
  
  switch (style) {
    case 'espn':
      return `${baseContext}

Write in ESPN's modern sports journalism style:
- Dynamic, energetic language
- Action verbs and vivid descriptions
- Player-focused narratives
- Include momentum shifts and key moments
- Professional but exciting tone
- 2-3 paragraphs for the body`;

    case 'newspaper':
      return `${baseContext}

Write in classic newspaper sports section style:
- Factual, straightforward reporting
- Lead with the score and winning team
- Include key statistics
- Quote-worthy observations
- Professional, traditional tone
- 2-3 concise paragraphs`;

    case 'social':
      return `${baseContext}

Write for social media (Twitter/Instagram):
- Brief and punchy
- Use relevant emojis sparingly
- Highlight the star player
- Include key stat
- Add hashtags at the end
- Keep under 280 characters for the main post`;

    default:
      return baseContext;
  }
}

// Build the user prompt from game data
function buildUserPrompt(data: GameRecapInput, style: RecapStyle): string {
  const winner = data.homeScore > data.awayScore ? 'home' : 'away';
  const winnerName = winner === 'home' ? data.homeTeamName : data.awayTeamName;
  const loserName = winner === 'home' ? data.awayTeamName : data.homeTeamName;
  const winnerScore = Math.max(data.homeScore, data.awayScore);
  const loserScore = Math.min(data.homeScore, data.awayScore);
  
  const starPlayer = data.keyPlayers.find(p => p.isStarOfGame);
  
  let prompt = `Write a ${style === 'espn' ? 'ESPN-style' : style === 'newspaper' ? 'newspaper' : 'social media'} game recap for:

**Game Details:**
- ${data.awayTeamName} @ ${data.homeTeamName}
- Final Score: ${data.awayTeamName} ${data.awayScore}, ${data.homeTeamName} ${data.homeScore}
- Winner: ${winnerName} (${winnerScore}-${loserScore})
- Date: ${data.gameDate}
- Game #${data.gameNumber} of the season
- Innings: ${data.innings}

**Pitching:**
${data.winningPitcher ? `- Winning Pitcher: ${data.winningPitcher}` : '- Winning pitcher not specified'}
${data.losingPitcher ? `- Losing Pitcher: ${data.losingPitcher}` : ''}
${data.saveBy ? `- Save: ${data.saveBy}` : ''}

**Key Players:**
${data.keyPlayers.map(p => `- ${p.name} (${p.team === 'home' ? data.homeTeamName : data.awayTeamName}): ${p.stats}${p.isStarOfGame ? ' ⭐ STAR OF THE GAME' : ''}`).join('\n')}

**Game Highlights:**
${data.highlights.length > 0 ? data.highlights.map(h => `- ${h}`).join('\n') : '- No specific highlights provided'}

Please provide:
1. A compelling headline
2. The recap body (${style === 'social' ? 'keep it short for social media' : '2-3 paragraphs'})
${style !== 'social' ? '3. A pull quote or notable observation' : '3. Relevant hashtags'}

Format your response as JSON:
{
  "headline": "Your headline here",
  "body": "The recap body here",
  ${style !== 'social' ? '"pullQuote": "A quote or observation"' : '"socialPost": "Short social version with emojis and hashtags"'}
}`;

  return prompt;
}

// Main function to generate recap using OpenAI API
export async function generateRecap(
  data: GameRecapInput,
  style: RecapStyle
): Promise<GeneratedRecap> {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Please add your API key in settings.');
  }

  const systemPrompt = getSystemPrompt(style);
  const userPrompt = buildUserPrompt(data, style);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective and fast
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      throw new Error(error.error?.message || 'Failed to generate recap');
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content generated');
    }

    // Parse the JSON response
    try {
      // Extract JSON from the response (handle markdown code blocks)
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      const parsed = JSON.parse(jsonStr.trim());
      
      return {
        headline: parsed.headline || 'Game Recap',
        body: parsed.body || content,
        pullQuote: parsed.pullQuote,
        socialPost: parsed.socialPost,
        timestamp: new Date().toISOString(),
      };
    } catch {
      // If JSON parsing fails, use the raw content
      return {
        headline: 'Game Recap',
        body: content,
        timestamp: new Date().toISOString(),
      };
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to connect to OpenAI API');
  }
}

// Generate image prompt for DALL-E (for future use)
export function generateImagePrompt(data: GameRecapInput): string {
  const winner = data.homeScore > data.awayScore ? data.homeTeamName : data.awayTeamName;
  const starPlayer = data.keyPlayers.find(p => p.isStarOfGame);
  
  return `Hyper-realistic sports photography style image: ${winner} baseball victory celebration. ${starPlayer ? `Focus on a player celebrating after ${starPlayer.stats}.` : 'Team celebration on the field.'} Professional MLB stadium atmosphere, dramatic lighting, action shot, high quality sports photography, 4K, photorealistic.`;
}

