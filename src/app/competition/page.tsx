import { getActiveCompetition, getLeaderboard } from '@/lib/competition-client'
import { CompetitionPageClient } from './competition-client'

const PLATFORM_SLUG = 'hatlem'
const PLATFORM_NAME = 'Hatlem'

export const metadata = {
  title: `Competition | ${PLATFORM_NAME}`,
  description: `Enter our competition and win prizes from ${PLATFORM_NAME}`,
}

export const dynamic = 'force-dynamic'

export default async function CompetitionPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams
  const competition = await getActiveCompetition(PLATFORM_SLUG)
  const leaderboard = competition
    ? await getLeaderboard(competition.id)
    : []

  return (
    <CompetitionPageClient
      competition={competition}
      leaderboard={leaderboard}
      platformSlug={PLATFORM_SLUG}
      platformName={PLATFORM_NAME}
      referralCode={ref || null}
    />
  )
}
