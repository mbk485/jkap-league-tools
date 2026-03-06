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

/**
 * Fetch questionnaire responses from Typeform via our server-side API route
 * This avoids CORS issues with direct browser-to-Typeform API calls
 * @param daysBack - Number of days to look back (default 45)
 * @returns Array of questionnaire completions
 */
export async function getQuestionnaireResponses(daysBack: number = 45): Promise<QuestionnaireCompletion[]> {
  try {
    // Call our server-side API route
    const response = await fetch(`/api/typeform/responses?days=${daysBack}`);

    if (!response.ok) {
      console.error('API route error:', response.status);
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.warn('Typeform API warning:', data.error);
      return [];
    }

    // Convert to QuestionnaireCompletion format
    const completions: QuestionnaireCompletion[] = (data.completions || []).map((c: any) => ({
      email: c.email,
      submittedAt: c.submittedAt,
      responseId: '',
      answers: {},
    }));

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

/**
 * Get ALL Typeform completions regardless of member matching
 * This shows everyone who actually completed the questionnaire
 * @param daysBack - Number of days to look back (default 45)
 * @returns Array of all completions with email and date
 */
export async function getAllQuestionnaireCompletions(daysBack: number = 45): Promise<{
  email: string;
  submittedAt: string;
  displayDate: string;
}[]> {
  const responses = await getQuestionnaireResponses(daysBack);
  
  return responses.map(r => ({
    email: r.email,
    submittedAt: r.submittedAt,
    displayDate: new Date(r.submittedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
  }));
}
