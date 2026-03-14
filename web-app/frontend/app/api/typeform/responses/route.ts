import { NextResponse } from 'next/server';

/**
 * Server-side API route to fetch Typeform responses
 * This avoids CORS issues with direct browser-to-Typeform API calls
 */

interface TypeformAnswer {
  field: {
    id: string;
    type: string;
    ref: string;
    title?: string;
  };
  type: string;
  text?: string;
  email?: string;
  number?: number;
  boolean?: boolean;
  choice?: {
    label: string;
  };
  choices?: {
    labels: string[];
  };
}

interface TypeformResponse {
  landing_id: string;
  token: string;
  response_id: string;
  landed_at: string;
  submitted_at: string;
  hidden?: Record<string, string>;
  answers: TypeformAnswer[];
}

interface TypeformResponsesResult {
  total_items: number;
  page_count: number;
  items: TypeformResponse[];
}

// Processed questionnaire response with all fields
export interface QuestionnaireResponse {
  email: string;
  name: string;
  submittedAt: string;
  // Core fields
  gamertag?: string;
  currentTeam?: string;
  returningNextSeason?: boolean; // true = Yes, false = No
  wantsToSwitchTeams?: boolean;
  preferredTeam?: string;
  wantsToHelp?: boolean;
  helpDetails?: string;
  // All text answers for reference
  allAnswers: { question: string; answer: string }[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const daysBack = parseInt(searchParams.get('days') || '45', 10);
  const fullDetails = searchParams.get('full') === 'true';

  const TYPEFORM_API_KEY = process.env.TYPEFORM_API_KEY || process.env.NEXT_PUBLIC_TYPEFORM_API_KEY;
  const TYPEFORM_FORM_ID = process.env.TYPEFORM_QUESTIONNAIRE_FORM_ID || process.env.NEXT_PUBLIC_TYPEFORM_QUESTIONNAIRE_FORM_ID;

  if (!TYPEFORM_API_KEY || !TYPEFORM_FORM_ID) {
    return NextResponse.json(
      { error: 'Typeform credentials not configured', completions: [] },
      { status: 200 }
    );
  }

  try {
    // Calculate the "since" date
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysBack);
    const sinceISO = sinceDate.toISOString().split('.')[0];

    const url = `https://api.typeform.com/forms/${TYPEFORM_FORM_ID}/responses?since=${sinceISO}&page_size=100`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TYPEFORM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      // Cache for 5 minutes
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Typeform API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Typeform API error: ${response.status}`, completions: [] },
        { status: 200 }
      );
    }

    const data: TypeformResponsesResult = await response.json();

    // Process responses and extract all fields
    const completions: QuestionnaireResponse[] = [];

    for (const item of data.items) {
      // Find the email answer
      const emailAnswer = item.answers?.find(a => a.type === 'email');
      const email = emailAnswer?.email || item.hidden?.email || '';

      if (!email) continue;

      // Get all text answers
      const textAnswers = item.answers?.filter(a => a.type === 'text') || [];
      
      // Get all choice answers (yes/no questions)
      const choiceAnswers = item.answers?.filter(a => a.type === 'choice') || [];
      
      // Get all boolean answers
      const booleanAnswers = item.answers?.filter(a => a.type === 'boolean') || [];
      
      // Build all answers array for debugging/display
      const allAnswers: { question: string; answer: string }[] = [];
      for (const ans of item.answers || []) {
        const question = ans.field?.ref || ans.field?.id || 'unknown';
        let answer = '';
        if (ans.text) answer = ans.text;
        else if (ans.email) answer = ans.email;
        else if (ans.choice?.label) answer = ans.choice.label;
        else if (ans.choices?.labels) answer = ans.choices.labels.join(', ');
        else if (ans.boolean !== undefined) answer = ans.boolean ? 'Yes' : 'No';
        else if (ans.number !== undefined) answer = String(ans.number);
        
        if (answer) {
          allAnswers.push({ question, answer });
        }
      }

      // Parse fields by position (based on actual Typeform structure)
      // Position 0: Name (text)
      // Position 1: Gamertag/PSN (text)
      // Position 2: Email (email)
      // Position 3: Current Team (text/choice)
      // Position 4: Preferred Contact Method (choice)
      // Position 5: Returning Next Season (yes/no choice)
      // Position 6: Want to Switch Teams (yes/no choice)
      // Position 7: Want to Help League (yes/no/text choice)
      // Position 8: How to Help (text)
      // Position 9: Additional comments (text)
      
      const answers = item.answers || [];
      
      // Name is first text answer
      const name = textAnswers[0]?.text || '';
      
      // Gamertag is second text answer
      const gamertag = textAnswers[1]?.text || '';
      
      // Current team - position 3 (could be text or choice)
      const currentTeam = answers[3]?.text || answers[3]?.choice?.label || '';
      
      // Returning next season - position 5
      const returningAnswer = answers[5]?.choice?.label || answers[5]?.text || '';
      const returningNextSeason = returningAnswer.toLowerCase().includes('yes');
      
      // Want to switch teams - position 6
      const switchAnswer = answers[6]?.choice?.label || answers[6]?.text || '';
      const wantsToSwitchTeams = switchAnswer.toLowerCase().includes('yes');
      
      // Want to help - position 7
      const helpAnswer = answers[7]?.choice?.label || answers[7]?.text || '';
      const wantsToHelp = helpAnswer.toLowerCase().includes('yes');
      
      // Help details - position 8
      const helpDetails = answers[8]?.text || '';
      
      // Preferred team (if switching) - might be in additional comments
      const preferredTeam = '';

      completions.push({
        email: email.toLowerCase(),
        name,
        submittedAt: item.submitted_at,
        gamertag,
        currentTeam,
        returningNextSeason,
        wantsToSwitchTeams,
        preferredTeam,
        wantsToHelp,
        helpDetails,
        allAnswers: fullDetails ? allAnswers : [],
      });
    }

    // Deduplicate by email, keeping most recent submission
    const emailMap = new Map<string, QuestionnaireResponse>();
    for (const completion of completions) {
      const existing = emailMap.get(completion.email);
      if (!existing || new Date(completion.submittedAt) > new Date(existing.submittedAt)) {
        emailMap.set(completion.email, completion);
      }
    }
    const dedupedCompletions = Array.from(emailMap.values());

    // Calculate stats
    const stats = {
      totalSubmissions: data.total_items,
      uniqueRespondents: dedupedCompletions.length,
      returning: dedupedCompletions.filter(c => c.returningNextSeason === true).length,
      notReturning: dedupedCompletions.filter(c => c.returningNextSeason === false).length,
      wantToSwitch: dedupedCompletions.filter(c => c.wantsToSwitchTeams === true).length,
      wantToHelp: dedupedCompletions.filter(c => c.wantsToHelp === true).length,
    };

    return NextResponse.json({
      success: true,
      totalResponses: data.total_items,
      completions: dedupedCompletions,
      stats,
      daysBack,
      since: sinceISO,
    });
  } catch (err: any) {
    console.error('Error fetching Typeform responses:', err);
    return NextResponse.json(
      { error: err.message, completions: [] },
      { status: 500 }
    );
  }
}
