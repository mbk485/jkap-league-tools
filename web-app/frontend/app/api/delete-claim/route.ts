import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json();
    const { claimId, userId, teamId, seasonNumber } = body;

    console.log('[API] Delete claim request:', { claimId, userId, teamId, seasonNumber });

    let deleted = false;
    let errors: string[] = [];

    // Try by claim ID
    if (claimId) {
      const { error } = await supabaseAdmin
        .from('claim_submissions')
        .delete()
        .eq('id', claimId);
      
      if (error) {
        console.log('[API] Delete by ID failed:', error.message);
        errors.push(`ID: ${error.message}`);
      } else {
        console.log('[API] Delete by ID succeeded');
        deleted = true;
      }
    }

    // Try by user ID
    if (userId && seasonNumber) {
      const { error } = await supabaseAdmin
        .from('claim_submissions')
        .delete()
        .eq('claiming_user_id', userId)
        .eq('season_number', seasonNumber);
      
      if (error) {
        console.log('[API] Delete by UserID failed:', error.message);
        errors.push(`UserID: ${error.message}`);
      } else {
        console.log('[API] Delete by UserID succeeded');
        deleted = true;
      }
    }

    // Try by team ID
    if (teamId && seasonNumber) {
      const { error } = await supabaseAdmin
        .from('claim_submissions')
        .delete()
        .eq('claiming_team_id', teamId.toLowerCase())
        .eq('season_number', seasonNumber);
      
      if (error) {
        console.log('[API] Delete by TeamID failed:', error.message);
        errors.push(`TeamID: ${error.message}`);
      } else {
        console.log('[API] Delete by TeamID succeeded');
        deleted = true;
      }
    }

    // Also try case variations of team ID
    if (teamId && seasonNumber) {
      const { error } = await supabaseAdmin
        .from('claim_submissions')
        .delete()
        .eq('claiming_team_id', teamId.toUpperCase())
        .eq('season_number', seasonNumber);
      
      if (!error) {
        console.log('[API] Delete by TeamID (uppercase) succeeded');
        deleted = true;
      }
    }

    if (deleted) {
      return NextResponse.json({ success: true, message: 'Claim deleted' });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to delete claim', 
        errors 
      }, { status: 400 });
    }
  } catch (err: any) {
    console.error('[API] Delete claim error:', err);
    return NextResponse.json({ 
      success: false, 
      message: err.message 
    }, { status: 500 });
  }
}
