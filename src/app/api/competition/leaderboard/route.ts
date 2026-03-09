import { NextRequest, NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/competition-client'

export async function GET(req: NextRequest) {
  const competitionId = req.nextUrl.searchParams.get('id')
  if (!competitionId) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10')
  const leaderboard = await getLeaderboard(competitionId, limit)
  return NextResponse.json({ leaderboard })
}
