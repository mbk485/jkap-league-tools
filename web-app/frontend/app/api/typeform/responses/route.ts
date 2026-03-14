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

      // Parse specific fields based on common question patterns
      // Name is usually the first text field
      const name = textAnswers[0]?.text || '';
      
      // Gamertag/PSN ID - look for field containing 'psn', 'gamertag', 'playstation'
      const gamertagAnswer = textAnswers.find(a => {
        const ref = (a.field?.ref || '').toLowerCase();
        return ref.includes('psn') || ref.includes('gamertag') || ref.includes('playstation') || ref.includes('tag');
      });
      const gamertag = gamertagAnswer?.text || textAnswers[1]?.text || '';
      
      // Current team - look for field containing 'team', 'current'
      const teamAnswer = textAnswers.find(a => {
        const ref = (a.field?.ref || '').toLowerCase();
        return ref.includes('team') || ref.includes('current');
      }) || choiceAnswers.find(a => {
        const ref = (a.field?.ref || '').toLowerCase();
        return ref.includes('team');
      });
      const currentTeam = teamAnswer?.text || teamAnswer?.choice?.label || '';
      
      // Returning next season - yes/no choice
      const returningAnswer = choiceAnswers.find(a => {
        const ref = (a.field?.ref || '').toLowerCase();
        return ref.includes('return') || ref.includes('play') || ref.includes('season') || ref.includes('continue');
      }) || booleanAnswers.find(a => {
        const ref = (a.field?.ref || '').toLowerCase();
        return ref.includes('return') || ref.includes('play') || ref.includes('continue');
      });
      let returningNextSeason: boolean | undefined;
      if (returningAnswer) {
        if (returningAnswer.choice?.label) {
          const label = returningAnswer.choice.label.toLowerCase();
          returningNextSeason = label.includes('yes') || label.includes('in') || label === 'yes';
        } else if (returningAnswer.boolean !== undefined) {
          returningNextSeason = returningAnswer.boolean;
        }
      }
      
      // Wants to switch teams
      const switchAnswer = choiceAnswers.find(a => {
        const ref = (a.field?.ref || '').toLowerCase();
        return ref.includes('switch') || ref.includes('change') || ref.includes('different');
      }) || booleanAnswers.find(a => {
        const ref = (a.field?.ref || '').toLowerCase();
        return ref.includes('switch') || ref.includes('change');
      });
      let wantsToSwitchTeams: boolean | undefined;
      if (switchAnswer) {
        if (switchAnswer.choice?.label) {
          const label = switchAnswer.choice.label.toLowerCase();
          wantsToSwitchTeams = label.includes('yes') || label === 'yes';
        } else if (switchAnswer.boolean !== undefined) {
          wantsToSwitchTeams = switchAnswer.boolean;
        }
      }
      
      // Preferred team if switching
      const preferredTeamAnswer = textAnswers.find(a => {
        const ref = (a.field?.ref || '').toLowerCase();
        return ref.includes('prefer') || ref.includes('want') || ref.includes('which');
      });
      const preferredTeam = preferredTeamAnswer?.text || '';
      
      // Wants to help
      const helpAnswer = choiceAnswers.find(a => {
        const ref = (a.field?.ref || '').toLowerCase();
        return ref.includes('help') || ref.includes('grow') || ref.includes('volunteer');
      }) || booleanAnswers.find(a => {
        const ref = (a.field?.ref || '').toLowerCase();
        return ref.includes('help') || ref.includes('grow');
      });
      let wantsToHelp: boolean | undefined;
      if (helpAnswer) {
        if (helpAnswer.choice?.label) {
          const label = helpAnswer.choice.label.toLowerCase();
          wantsToHelp = label.includes('yes') || label === 'yes';
        } else if (helpAnswer.boolean !== undefined) {
          wantsToHelp = helpAnswer.boolean;
        }
      }
      
      // Help details
      const helpDetailsAnswer = textAnswers.find(a => {
        const ref = (a.field?.ref || '').toLowerCase();
        return ref.includes('how') && (ref.includes('help') || ref.includes('grow'));
      });
      const helpDetails = helpDetailsAnswer?.text || '';

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
