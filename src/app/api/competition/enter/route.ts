import { NextRequest, NextResponse } from 'next/server'
import { enterCompetition } from '@/lib/competition-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { competitionId, ...data } = body
    if (!competitionId) {
      return NextResponse.json({ error: 'competitionId required' }, { status: 400 })
    }
    const result = await enterCompetition(competitionId, data)
    return NextResponse.json(result, { status: result.already_entered ? 200 : 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enter' },
      { status: 500 }
    )
  }
}
