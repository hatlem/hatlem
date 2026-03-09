import { NextRequest, NextResponse } from 'next/server'
import { logAction } from '@/lib/competition-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { competitionId, ...data } = body
    if (!competitionId) {
      return NextResponse.json({ error: 'competitionId required' }, { status: 400 })
    }
    const result = await logAction(competitionId, data)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to log action' },
      { status: 500 }
    )
  }
}
