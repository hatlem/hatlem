import { NextRequest, NextResponse } from 'next/server'
import { notifyMe } from '@/lib/competition-client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    await notifyMe(body)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to register' },
      { status: 500 }
    )
  }
}
