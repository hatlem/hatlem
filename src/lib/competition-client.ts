const GETPLATFORM_URL = process.env.GETPLATFORM_URL || 'https://control.getplatform.co'
const GETPLATFORM_API_KEY = process.env.GETPLATFORM_API_KEY || ''

interface CompetitionAction {
  id: string
  action_type: string
  custom_action_key: string | null
  custom_action_label: string | null
  points: number
  max_per_user: number | null
  enabled: boolean
}

export interface Competition {
  id: string
  platform: string | null
  title: string
  description: string | null
  prize_type: string
  prize_value: number
  prize_description: string | null
  winner_count: number
  start_date: string
  end_date: string | null
  target_entries: number | null
  draw_type: string
  status: string
  rules_url: string | null
  hero_image_url: string | null
  required_fields: string[]
  entry_actions: CompetitionAction[]
  total_entries: number
}

export interface LeaderboardEntry {
  rank: number
  name: string | null
  total_points: number
  referral_count: number
}

export interface EntryResult {
  entry_id: string
  referral_code: string
  total_points: number
  already_entered: boolean
}

export interface ActionResult {
  total_points: number
  action_logged: boolean
  points_earned: number
  reason?: string
}

export async function getActiveCompetition(platform: string): Promise<Competition | null> {
  try {
    const res = await fetch(
      `${GETPLATFORM_URL}/api/sweepstakes/${platform}/active`,
      {
        headers: { 'X-API-Key': GETPLATFORM_API_KEY },
        next: { revalidate: 60 },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.sweepstakes || null
  } catch {
    return null
  }
}

export async function getLeaderboard(competitionId: string, limit = 10): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(
      `${GETPLATFORM_URL}/api/sweepstakes/${competitionId}/leaderboard?limit=${limit}`,
      {
        headers: { 'X-API-Key': GETPLATFORM_API_KEY },
        next: { revalidate: 30 },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.leaderboard || []
  } catch {
    return []
  }
}

export async function enterCompetition(competitionId: string, data: {
  email: string
  name?: string
  company?: string
  referral_code?: string
  marketing_opt_in: boolean
  create_account_opt_in: boolean
  accepted_rules: boolean
}): Promise<EntryResult> {
  const res = await fetch(
    `${GETPLATFORM_URL}/api/sweepstakes/${competitionId}/enter`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': GETPLATFORM_API_KEY,
      },
      body: JSON.stringify(data),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to enter competition')
  }
  return res.json()
}

export async function logAction(competitionId: string, data: {
  entry_id?: string
  email?: string
  action_type: string
  custom_action_key?: string
  metadata?: Record<string, unknown>
}): Promise<ActionResult> {
  const res = await fetch(
    `${GETPLATFORM_URL}/api/sweepstakes/${competitionId}/action`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': GETPLATFORM_API_KEY,
      },
      body: JSON.stringify(data),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to log action')
  }
  return res.json()
}

export async function notifyMe(data: {
  email: string
  name?: string
  platform: string
  marketing_opt_in: boolean
  create_account_opt_in: boolean
}): Promise<void> {
  const res = await fetch(
    `${GETPLATFORM_URL}/api/sweepstakes/waitlist`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': GETPLATFORM_API_KEY,
      },
      body: JSON.stringify(data),
    }
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to register for notifications')
  }
}
