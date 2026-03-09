'use client'

import { useState, useEffect, useCallback, FormEvent } from 'react'
import type { Competition, LeaderboardEntry, EntryResult } from '@/lib/competition-client'

// --- Helper: action type to human-readable label ---

function getActionLabel(actionType: string, platformSlug: string): string {
  const labels: Record<string, string> = {
    signup: `Create a free ${platformSlug} account`,
    referral: 'Refer a friend',
    social_share_twitter: 'Share on Twitter / X',
    social_share_linkedin: 'Share on LinkedIn',
    social_share_facebook: 'Share on Facebook',
    social_follow_twitter: 'Follow us on Twitter / X',
    social_follow_linkedin: 'Follow us on LinkedIn',
    newsletter_subscribe: 'Subscribe to our newsletter',
    review: 'Leave a review',
    feedback: 'Submit feedback',
    blog_comment: 'Comment on a blog post',
    product_hunt_upvote: 'Upvote on Product Hunt',
  }
  return labels[actionType] || actionType.replace(/_/g, ' ')
}

// --- Countdown Timer ---

function Countdown({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const target = new Date(endDate).getTime()

    const update = () => {
      const now = Date.now()
      const diff = Math.max(0, target - now)
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      })
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [endDate])

  const boxes = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Min', value: timeLeft.minutes },
    { label: 'Sec', value: timeLeft.seconds },
  ]

  return (
    <div className="flex gap-3 justify-center">
      {boxes.map((box) => (
        <div key={box.label} className="flex flex-col items-center">
          <div className="bg-gray-900 text-white text-2xl font-bold rounded-lg w-16 h-16 flex items-center justify-center">
            {String(box.value).padStart(2, '0')}
          </div>
          <span className="text-xs text-gray-500 mt-1">{box.label}</span>
        </div>
      ))}
    </div>
  )
}

// --- Leaderboard ---

function LeaderboardSection({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null

  const medalColors: Record<number, string> = {
    1: 'text-yellow-500',
    2: 'text-gray-400',
    3: 'text-amber-600',
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Leaderboard</h3>
      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className="flex items-center gap-3 p-3 rounded-lg bg-gray-50"
          >
            <span className={`text-xl font-bold w-8 text-center ${medalColors[entry.rank] || 'text-gray-400'}`}>
              {entry.rank <= 3 ? ['', '\u{1F947}', '\u{1F948}', '\u{1F949}'][entry.rank] : `#${entry.rank}`}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {entry.name || 'Anonymous'}
              </p>
              <p className="text-xs text-gray-500">
                {entry.referral_count} referral{entry.referral_count !== 1 ? 's' : ''}
              </p>
            </div>
            <span className="text-sm font-bold text-blue-600">
              {entry.total_points} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// --- Notify Form (no active competition) ---

function NotifyForm({
  platformSlug,
  platformName,
}: {
  platformSlug: string
  platformName: string
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [createAccountOptIn, setCreateAccountOptIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/competition/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name: name || undefined,
          platform: platformSlug,
          marketing_opt_in: marketingOptIn,
          create_account_opt_in: createAccountOptIn,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to register')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto text-center">
        <div className="text-4xl mb-4">&#9989;</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re on the list!</h2>
        <p className="text-gray-600">
          We&apos;ll notify you at <strong>{email}</strong> when our next competition launches.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        No Active Competition
      </h2>
      <p className="text-gray-600 text-center mb-6">
        Sign up to be notified when {platformName} launches its next competition.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="notify-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            id="notify-email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="notify-name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            id="notify-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={createAccountOptIn}
              onChange={(e) => setCreateAccountOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              Create a free {platformName} account for me
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              I&apos;d like to receive product updates and tips
            </span>
          </label>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Notify Me'}
        </button>
      </form>
    </div>
  )
}

// --- Entry Form ---

function EntryForm({
  competition,
  referralCode,
  onSuccess,
}: {
  competition: Competition
  referralCode: string | null
  onSuccess: (result: EntryResult) => void
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [acceptedRules, setAcceptedRules] = useState(false)
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [createAccountOptIn, setCreateAccountOptIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requiresName = competition.required_fields.includes('name')
  const requiresCompany = competition.required_fields.includes('company')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!acceptedRules) {
      setError('You must accept the rules and privacy policy to enter.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/competition/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionId: competition.id,
          email,
          name: name || undefined,
          company: company || undefined,
          referral_code: referralCode || undefined,
          marketing_opt_in: marketingOptIn,
          create_account_opt_in: createAccountOptIn,
          accepted_rules: acceptedRules,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to enter competition')
      }
      const result: EntryResult = await res.json()
      onSuccess(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Enter the Competition
      </h2>
      {competition.prize_description && (
        <p className="text-gray-600 text-center mb-6">{competition.prize_description}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="entry-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            id="entry-email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="you@example.com"
          />
        </div>
        {requiresName && (
          <div>
            <label htmlFor="entry-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="entry-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your name"
            />
          </div>
        )}
        {!requiresName && (
          <div>
            <label htmlFor="entry-name-opt" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="entry-name-opt"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your name (optional)"
            />
          </div>
        )}
        {requiresCompany && (
          <div>
            <label htmlFor="entry-company" className="block text-sm font-medium text-gray-700 mb-1">
              Company *
            </label>
            <input
              type="text"
              id="entry-company"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Your company"
            />
          </div>
        )}
        <div className="space-y-2 pt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedRules}
              onChange={(e) => setAcceptedRules(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              I accept the{' '}
              {competition.rules_url ? (
                <a href={competition.rules_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  competition rules
                </a>
              ) : (
                'competition rules'
              )}{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">
                privacy policy
              </a>{' '}
              *
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={createAccountOptIn}
              onChange={(e) => setCreateAccountOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              Create a free account for me
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              I&apos;d like to receive product updates and tips
            </span>
          </label>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Entering...' : 'Enter Competition'}
        </button>
      </form>
    </div>
  )
}

// --- Entered Status (post-entry view) ---

function EnteredStatus({
  competition,
  entry,
  platformSlug,
}: {
  competition: Competition
  entry: EntryResult
  platformSlug: string
}) {
  const [totalPoints, setTotalPoints] = useState(entry.total_points)
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set())
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/competition?ref=${entry.referral_code}`
    : ''

  const copyReferralLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = referralLink
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [referralLink])

  const handleAction = async (actionType: string, customKey?: string) => {
    const actionId = customKey || actionType
    if (completedActions.has(actionId)) return
    setLoadingAction(actionId)

    try {
      const res = await fetch('/api/competition/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionId: competition.id,
          entry_id: entry.entry_id,
          action_type: actionType,
          custom_action_key: customKey,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const result = await res.json()
      if (result.action_logged) {
        setTotalPoints(result.total_points)
        setCompletedActions((prev) => new Set([...prev, actionId]))
      } else {
        // Already completed
        setCompletedActions((prev) => new Set([...prev, actionId]))
      }
    } catch {
      // Silently fail for bonus actions
    } finally {
      setLoadingAction(null)
    }
  }

  const enabledActions = competition.entry_actions.filter((a) => a.enabled)

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="text-4xl mb-4">&#127881;</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re In!</h2>
        <p className="text-gray-600 mb-4">
          You&apos;ve entered the competition. Earn more points to increase your chances of winning.
        </p>
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-lg font-bold">
          {totalPoints} points
        </div>
      </div>

      {/* Referral Link */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Share your referral link</h3>
        <p className="text-sm text-gray-600 mb-3">
          Earn bonus points for every friend who enters using your link.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700"
          />
          <button
            onClick={copyReferralLink}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition whitespace-nowrap"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Bonus Actions */}
      {enabledActions.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Earn Bonus Points</h3>
          <div className="space-y-3">
            {enabledActions.map((action) => {
              const actionId = action.custom_action_key || action.action_type
              const isCompleted = completedActions.has(actionId)
              const isLoading = loadingAction === actionId
              const label = action.custom_action_label || getActionLabel(action.action_type, platformSlug)

              return (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.action_type, action.custom_action_key || undefined)}
                  disabled={isCompleted || isLoading}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition ${
                    isCompleted
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                  } disabled:cursor-not-allowed`}
                >
                  <span className="text-sm font-medium">
                    {isCompleted ? '\u2713 ' : ''}{label}
                  </span>
                  <span className={`text-sm font-bold ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                    {isLoading ? '...' : `+${action.points} pts`}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Active Competition (wraps entry form or entered status) ---

function ActiveCompetition({
  competition,
  leaderboard,
  platformSlug,
  referralCode,
}: {
  competition: Competition
  leaderboard: LeaderboardEntry[]
  platformSlug: string
  referralCode: string | null
}) {
  const [entry, setEntry] = useState<EntryResult | null>(null)

  // Check localStorage for existing entry
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`competition_entry_${competition.id}`)
      if (stored) {
        setEntry(JSON.parse(stored))
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [competition.id])

  const handleEntrySuccess = (result: EntryResult) => {
    setEntry(result)
    try {
      localStorage.setItem(`competition_entry_${competition.id}`, JSON.stringify(result))
    } catch {
      // Ignore localStorage errors
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{competition.title}</h1>
        {competition.description && (
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">{competition.description}</p>
        )}
        {competition.hero_image_url && (
          <img
            src={competition.hero_image_url}
            alt={competition.title}
            className="mt-6 rounded-xl shadow-lg max-w-lg mx-auto w-full"
          />
        )}
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap justify-center gap-6 text-center">
        <div className="bg-white rounded-lg shadow-md px-6 py-4">
          <p className="text-2xl font-bold text-blue-600">{competition.total_entries}</p>
          <p className="text-sm text-gray-500">Entries</p>
        </div>
        {competition.target_entries && (
          <div className="bg-white rounded-lg shadow-md px-6 py-4">
            <p className="text-2xl font-bold text-blue-600">{competition.target_entries}</p>
            <p className="text-sm text-gray-500">Target</p>
          </div>
        )}
        <div className="bg-white rounded-lg shadow-md px-6 py-4">
          <p className="text-2xl font-bold text-blue-600">{competition.winner_count}</p>
          <p className="text-sm text-gray-500">Winner{competition.winner_count !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Countdown */}
      {competition.end_date && (
        <div className="text-center">
          <p className="text-sm text-gray-500 mb-3 uppercase tracking-wide font-medium">
            Time Remaining
          </p>
          <Countdown endDate={competition.end_date} />
        </div>
      )}

      {/* Entry form or entered status */}
      <div className="max-w-md mx-auto">
        {entry ? (
          <EnteredStatus
            competition={competition}
            entry={entry}
            platformSlug={platformSlug}
          />
        ) : (
          <EntryForm
            competition={competition}
            referralCode={referralCode}
            onSuccess={handleEntrySuccess}
          />
        )}
      </div>

      {/* Leaderboard */}
      <div className="max-w-md mx-auto">
        <LeaderboardSection entries={leaderboard} />
      </div>
    </div>
  )
}

// --- Main export ---

export function CompetitionPageClient({
  competition,
  leaderboard,
  platformSlug,
  platformName,
  referralCode,
}: {
  competition: Competition | null
  leaderboard: LeaderboardEntry[]
  platformSlug: string
  platformName: string
  referralCode: string | null
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {competition ? (
          <ActiveCompetition
            competition={competition}
            leaderboard={leaderboard}
            platformSlug={platformSlug}
            referralCode={referralCode}
          />
        ) : (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Competition
              </h1>
              <p className="text-xl text-gray-600">
                There&apos;s no active competition right now, but you can sign up to be notified.
              </p>
            </div>
            <NotifyForm platformSlug={platformSlug} platformName={platformName} />
          </>
        )}
      </div>
    </div>
  )
}
