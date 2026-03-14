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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const daysBack = parseInt(searchParams.get('days') || '45', 10);

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

    // Process responses and extract email + name
    const completions: { email: string; name: string; submittedAt: string }[] = [];

    for (const item of data.items) {
      // Find the email answer
      const emailAnswer = item.answers?.find(a => a.type === 'email');
      const email = emailAnswer?.email || item.hidden?.email || '';

      // Find the name/text answers (usually first text field is the name)
      const textAnswers = item.answers?.filter(a => a.type === 'text') || [];
      const name = textAnswers[0]?.text || '';

      if (email) {
        completions.push({
          email: email.toLowerCase(),
          name: name,
          submittedAt: item.submitted_at,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalResponses: data.total_items,
      completions,
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
