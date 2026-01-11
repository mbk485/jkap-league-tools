// OpenAI API Integration for JKAP Memorial League
// Used for generating game recaps and other AI-powered content

import { getOpenAIApiKey, saveOpenAIApiKey as saveApiKeyToSupabase } from './supabase';

// Cache for the API key (to avoid repeated database calls)
let cachedApiKey: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minute cache

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

// Check if OpenAI is configured (async version - checks Supabase)
export async function isOpenAIConfiguredAsync(): Promise<boolean> {
  const key = await getApiKeyAsync();
  return !!key;
}

// Sync version for immediate checks (uses cache)
export function isOpenAIConfigured(): boolean {
  // Check cache first
  if (cachedApiKey && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return true;
  }
  // Fall back to localStorage for backwards compatibility during migration
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('jkap_openai_api_key');
    if (localKey) return true;
  }
  return !!cachedApiKey;
}

// Alias for isOpenAIConfigured
export function hasApiKey(): boolean {
  return isOpenAIConfigured();
}

// Get API key from Supabase (centralized for whole league)
async function getApiKeyAsync(): Promise<string | null> {
  // Check cache first
  if (cachedApiKey && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedApiKey;
  }
  
  try {
    const key = await getOpenAIApiKey();
    if (key) {
      cachedApiKey = key;
      cacheTimestamp = Date.now();
      return key;
    }
  } catch (err) {
    console.error('Error fetching API key from Supabase:', err);
  }
  
  // Fall back to localStorage for backwards compatibility
  if (typeof window !== 'undefined') {
    const localKey = localStorage.getItem('jkap_openai_api_key');
    if (localKey) {
      // Migrate localStorage key to Supabase (will be saved by admin)
      cachedApiKey = localKey;
      cacheTimestamp = Date.now();
      return localKey;
    }
  }
  
  return null;
}

// Sync version that uses cache (for components that need immediate response)
function getApiKey(): string | null {
  if (cachedApiKey && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedApiKey;
  }
  // Fall back to localStorage
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jkap_openai_api_key');
  }
  return null;
}

// Save API key to Supabase (admin-only)
export async function saveApiKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await saveApiKeyToSupabase(apiKey);
    if (result.success) {
      // Update cache
      cachedApiKey = apiKey;
      cacheTimestamp = Date.now();
      // Also save to localStorage as backup
      if (typeof window !== 'undefined') {
        localStorage.setItem('jkap_openai_api_key', apiKey);
      }
    }
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save API key' };
  }
}

// Remove API key (admin-only)
export async function removeApiKey(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await saveApiKeyToSupabase(null);
    if (result.success) {
      // Clear cache
      cachedApiKey = null;
      cacheTimestamp = 0;
      // Also clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('jkap_openai_api_key');
      }
    }
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to remove API key' };
  }
}

// Initialize/refresh the API key cache (call on app load)
export async function initializeApiKey(): Promise<void> {
  await getApiKeyAsync();
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
  const apiKey = await getApiKeyAsync();
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Ask your league commissioner to set it up.');
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

// Helper function to wait
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to compress image if too large
function compressImage(base64Image: string, maxSizeKB: number = 500): Promise<string> {
  return new Promise((resolve) => {
    // If it's not too large, return as-is
    const sizeInKB = (base64Image.length * 3) / 4 / 1024;
    if (sizeInKB <= maxSizeKB) {
      resolve(base64Image);
      return;
    }

    // Create an image element
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate new dimensions (reduce to 70% if too large)
      let width = img.width;
      let height = img.height;
      const scaleFactor = Math.sqrt(maxSizeKB / sizeInKB);
      
      width = Math.floor(width * scaleFactor);
      height = Math.floor(height * scaleFactor);
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Get compressed base64
      const compressed = canvas.toDataURL('image/jpeg', 0.7);
      resolve(compressed);
    };
    img.onerror = () => resolve(base64Image); // On error, return original
    img.src = base64Image;
  });
}

// Analyze image(s) with AI (GPT-4 Vision)
// Supports single image (string) or multiple images (string[])
// Includes retry logic with exponential backoff for rate limits
export async function analyzeImageWithAI(images: string | string[], prompt: string): Promise<string> {
  const apiKey = await getApiKeyAsync();
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Ask your league commissioner to set it up.');
  }

  // Normalize to array
  const imageArray = Array.isArray(images) ? images : [images];
  
  if (imageArray.length === 0) {
    throw new Error('At least one image is required');
  }

  // Compress images if they're too large (reduces rate limit issues)
  const compressedImages = await Promise.all(
    imageArray.map(img => compressImage(img, 400)) // 400KB max per image
  );

  // Build message content array with text prompt and all images
  const messageContent: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [
    {
      type: 'text',
      text: imageArray.length > 1 
        ? `${prompt}\n\nNote: Analyzing ${imageArray.length} screenshots together. Consider all images as part of the same game analysis.`
        : prompt,
    },
  ];
  
  // Add each image with 'low' detail for faster processing and lower token usage
  compressedImages.forEach((img) => {
    messageContent.push({
      type: 'image_url',
      image_url: {
        url: img,
        detail: 'low', // Use 'low' to reduce token usage and rate limit issues
      },
    });
  });

  // Retry configuration
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Vision-capable model
          messages: [
            {
              role: 'user',
              content: messageContent,
            },
          ],
          max_tokens: 2000, // Reduced for better rate limit compliance
        }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        
        if (apiResponse.status === 401) {
          throw new Error('Invalid API key. Please check your OpenAI API key.');
        }
        
        if (apiResponse.status === 429) {
          // Rate limit - parse retry-after or use exponential backoff
          const retryAfter = apiResponse.headers.get('retry-after');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 2000;
          
          if (attempt < maxRetries) {
            console.log(`Rate limit hit, retrying in ${waitTime/1000}s (attempt ${attempt}/${maxRetries})`);
            await delay(waitTime);
            continue;
          }
          
          // Check for specific rate limit type
          const errorMessage = errorData.error?.message || '';
          if (errorMessage.includes('quota')) {
            throw new Error('OpenAI quota exceeded. Your API key may need more credits. Check your OpenAI billing.');
          }
          if (errorMessage.includes('RPM') || errorMessage.includes('requests per minute')) {
            throw new Error('Too many requests. Please wait 60 seconds and try again.');
          }
          if (errorMessage.includes('TPM') || errorMessage.includes('tokens per minute')) {
            throw new Error('Token limit reached. Try uploading fewer or smaller images.');
          }
          throw new Error('Rate limit exceeded. Please wait a minute and try again, or try with fewer images.');
        }
        
        throw new Error(errorData.error?.message || 'Failed to analyze image');
      }

      const resultData = await apiResponse.json();
      const responseContent = resultData.choices[0]?.message?.content;

      if (!responseContent) {
        throw new Error('No analysis generated');
      }

      return responseContent;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Failed to analyze image with AI');
      
      // Don't retry on auth errors
      if (lastError.message.includes('Invalid API key') || 
          lastError.message.includes('quota exceeded') ||
          lastError.message.includes('billing')) {
        throw lastError;
      }
      
      // If not last attempt, continue
      if (attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed, retrying...`);
        await delay(Math.pow(2, attempt) * 1000);
        continue;
      }
    }
  }

  throw lastError || new Error('Failed to analyze image with AI after multiple attempts');
}

