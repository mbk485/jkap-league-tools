import { NextRequest, NextResponse } from 'next/server';

const MLB_THESHOW_API_BASE = 'https://mlb25.theshow.com/apis';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const endpoint = searchParams.get('endpoint');
  
  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint parameter' }, { status: 400 });
  }

  // Build the MLB The Show API URL
  const params = new URLSearchParams();
  searchParams.forEach((value, key) => {
    if (key !== 'endpoint') {
      params.append(key, value);
    }
  });

  const url = `${MLB_THESHOW_API_BASE}/${endpoint}.json${params.toString() ? '?' + params.toString() : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `MLB The Show API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error('MLB The Show API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from MLB The Show API' },
      { status: 500 }
    );
  }
}
