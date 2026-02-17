/**
 * Typeform API Integration
 * Fetches questionnaire responses and matches them to league members
 */

// Types for Typeform responses
export interface TypeformAnswer {
  field: {
    id: string;
    type: string;
    ref: string;
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

export interface TypeformResponse {
  landing_id: string;
  token: string;
  response_id: string;
  landed_at: string;
  submitted_at: string;
  metadata: {
    user_agent: string;
    platform: string;
    referer: string;
    network_id: string;
    browser: string;
  };
  hidden?: Record<string, string>;
  calculated?: {
    score: number;
  };
  answers: TypeformAnswer[];
}

export interface TypeformResponsesResult {
  total_items: number;
  page_count: number;
  items: TypeformResponse[];
}

export interface QuestionnaireCompletion {
  email: string;
  submittedAt: string;
  responseId: string;
  answers: Record<string, any>;
}

// Environment variables for Typeform
const TYPEFORM_API_KEY = process.env.NEXT_PUBLIC_TYPEFORM_API_KEY || '';
const TYPEFORM_FORM_ID = process.env.NEXT_PUBLIC_TYPEFORM_QUESTIONNAIRE_FORM_ID || '';

/**
 * Fetch questionnaire responses from Typeform
 * @param daysBack - Number of days to look back (default 45)
 * @returns Array of questionnaire completions
 */
export async function getQuestionnaireResponses(daysBack: number = 45): Promise<QuestionnaireCompletion[]> {
  if (!TYPEFORM_API_KEY || !TYPEFORM_FORM_ID) {
    console.warn('Typeform API key or form ID not configured');
    return [];
  }

  try {
    // Calculate the "since" date (daysBack days ago)
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysBack);
    const sinceISO = sinceDate.toISOString().split('.')[0]; // Remove milliseconds

    const url = `https://api.typeform.com/forms/${TYPEFORM_FORM_ID}/responses?since=${sinceISO}&page_size=100`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TYPEFORM_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Typeform API error:', response.status, errorText);
      return [];
    }

    const data: TypeformResponsesResult = await response.json();

    // Process responses and extract email + answers
    const completions: QuestionnaireCompletion[] = [];

    for (const item of data.items) {
      // Find the email answer (usually a field with type "email")
      const emailAnswer = item.answers?.find(a => a.type === 'email');
      const email = emailAnswer?.email || item.hidden?.email || '';

      if (email) {
        // Convert answers to a simple key-value format
        const answersMap: Record<string, any> = {};
        for (const answer of item.answers || []) {
          const key = answer.field.ref || answer.field.id;
          if (answer.text) answersMap[key] = answer.text;
          else if (answer.email) answersMap[key] = answer.email;
          else if (answer.number !== undefined) answersMap[key] = answer.number;
          else if (answer.boolean !== undefined) answersMap[key] = answer.boolean;
          else if (answer.choice) answersMap[key] = answer.choice.label;
          else if (answer.choices) answersMap[key] = answer.choices.labels;
        }

        completions.push({
          email: email.toLowerCase(),
          submittedAt: item.submitted_at,
          responseId: item.response_id,
          answers: answersMap,
        });
      }
    }

    return completions;
  } catch (err) {
    console.error('Error fetching Typeform responses:', err);
    return [];
  }
}

/**
 * Check which members have completed the questionnaire
 * @param memberEmails - Array of member email addresses
 * @param daysBack - Number of days to look back (default 45)
 * @returns Map of email -> completion status
 */
export async function checkQuestionnaireCompletions(
  memberEmails: string[],
  daysBack: number = 45
): Promise<Map<string, { completed: boolean; submittedAt?: string }>> {
  const responses = await getQuestionnaireResponses(daysBack);
  const completionMap = new Map<string, { completed: boolean; submittedAt?: string }>();

  // Initialize all members as not completed
  for (const email of memberEmails) {
    completionMap.set(email.toLowerCase(), { completed: false });
  }

  // Mark those who have completed
  for (const response of responses) {
    const email = response.email.toLowerCase();
    if (completionMap.has(email)) {
      completionMap.set(email, {
        completed: true,
        submittedAt: response.submittedAt,
      });
    }
  }

  return completionMap;
}

/**
 * Get questionnaire completion stats for the admin dashboard
 * @param memberEmails - Array of member email addresses  
 * @param daysBack - Number of days to look back (default 45)
 * @returns Completion statistics
 */
export async function getQuestionnaireStats(
  memberEmails: string[],
  daysBack: number = 45
): Promise<{
  totalMembers: number;
  completed: number;
  pending: number;
  percentComplete: number;
  completedEmails: string[];
  pendingEmails: string[];
}> {
  const completions = await checkQuestionnaireCompletions(memberEmails, daysBack);
  
  const completedEmails: string[] = [];
  const pendingEmails: string[] = [];

  completions.forEach((status, email) => {
    if (status.completed) {
      completedEmails.push(email);
    } else {
      pendingEmails.push(email);
    }
  });

  return {
    totalMembers: memberEmails.length,
    completed: completedEmails.length,
    pending: pendingEmails.length,
    percentComplete: memberEmails.length > 0 
      ? Math.round((completedEmails.length / memberEmails.length) * 100)
      : 0,
    completedEmails,
    pendingEmails,
  };
}
