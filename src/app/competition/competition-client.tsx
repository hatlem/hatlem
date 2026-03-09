'use client'

import { useState, useEffect, useCallback, useRef, FormEvent } from 'react'
import type { Competition, LeaderboardEntry, EntryResult } from '@/lib/competition-client'

// ============================================================
// CSS Animations (injected once)
// ============================================================

function AnimationStyles() {
  return (
    <style>{`
      @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 20px var(--primary-glow, rgba(59,130,246,0.3)); } 50% { box-shadow: 0 0 40px var(--primary-glow, rgba(59,130,246,0.5)); } }
      @keyframes slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes slide-in-left { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
      @keyframes count-up { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
      @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      @keyframes confetti-fall { 0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
      @keyframes trophy-bounce { 0%,100% { transform: scale(1) rotate(0deg); } 25% { transform: scale(1.2) rotate(-5deg); } 75% { transform: scale(1.1) rotate(5deg); } }
      @keyframes progress-fill { from { width: 0; } }
      @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes tick { 0% { transform: scale(1.3); } 100% { transform: scale(1); } }
      @keyframes sparkle { 0%,100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
      .animate-float { animation: float 3s ease-in-out infinite; }
      .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
      .animate-slide-up { animation: slide-up 0.6s ease-out forwards; }
      .animate-slide-in-left { animation: slide-in-left 0.4s ease-out forwards; }
      .animate-count-up { animation: count-up 0.5s ease-out; }
      .animate-trophy-bounce { animation: trophy-bounce 0.6s ease-in-out; }
      .animate-progress-fill { animation: progress-fill 1.5s ease-out forwards; }
      .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      .animate-tick { animation: tick 0.3s ease-out; }
      .animate-sparkle { animation: sparkle 2s ease-in-out infinite; }
      .shimmer-bg { background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%); background-size: 200% 100%; animation: shimmer 2s infinite; }
      .stagger-1 { animation-delay: 0.1s; opacity: 0; }
      .stagger-2 { animation-delay: 0.2s; opacity: 0; }
      .stagger-3 { animation-delay: 0.3s; opacity: 0; }
      .stagger-4 { animation-delay: 0.4s; opacity: 0; }
      .stagger-5 { animation-delay: 0.5s; opacity: 0; }
      .gradient-cta { background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%); transition: all 0.3s ease; }
      .gradient-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 25px hsl(var(--primary) / 0.4); }
      .gradient-cta:active { transform: translateY(0); }
    `}</style>
  )
}

// ============================================================
// Confetti Effect
// ============================================================

function ConfettiOverlay({ active }: { active: boolean }) {
  if (!active) return null
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9']
  const pieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 3,
    color: colors[i % colors.length],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  }))

  return (
    <div className="fixed inset-0 pointer-events-none z-50" style={{ animation: 'fade-in 0.3s' }}>
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: '-20px',
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            backgroundColor: p.color,
            borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  )
}

// ============================================================
// Animated Number Counter
// ============================================================

function AnimatedNumber({ value, duration = 1500 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let start = 0
    const startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      start = Math.round(eased * value)
      setDisplay(start)
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value, duration])

  return <span ref={ref} className="animate-count-up tabular-nums">{display.toLocaleString()}</span>
}

// ============================================================
// Action Labels
// ============================================================

function getActionLabel(actionType: string, platformName: string): string {
  const labels: Record<string, string> = {
    signup: `Create a free ${platformName} account`,
    referral: 'Refer a friend',
    social_share_twitter: 'Share on X (Twitter)',
    social_share_linkedin: 'Share on LinkedIn',
    social_share_facebook: 'Share on Facebook',
    social_follow_twitter: 'Follow us on X',
    social_follow_linkedin: 'Follow us on LinkedIn',
    newsletter_subscribe: 'Subscribe to our newsletter',
    review: 'Leave a review',
    feedback: 'Submit feedback',
    blog_comment: 'Comment on a blog post',
    product_hunt_upvote: 'Upvote on Product Hunt',
  }
  return labels[actionType] || actionType.replace(/_/g, ' ')
}

function getActionIcon(actionType: string): string {
  const icons: Record<string, string> = {
    signup: '\u{1F511}',
    referral: '\u{1F91D}',
    social_share_twitter: '\u{1F426}',
    social_share_linkedin: '\u{1F4BC}',
    social_share_facebook: '\u{1F30D}',
    social_follow_twitter: '\u{2B50}',
    social_follow_linkedin: '\u{1F4BC}',
    newsletter_subscribe: '\u{1F4E7}',
    review: '\u{2B50}',
    feedback: '\u{1F4AC}',
    blog_comment: '\u{270D}\u{FE0F}',
    product_hunt_upvote: '\u{1F680}',
  }
  return icons[actionType] || '\u{1F3AF}'
}

// ============================================================
// Referral Tiers
// ============================================================

const REFERRAL_TIERS = [
  { count: 1, label: 'First Referral', bonus: '+2 extra entries', icon: '\u{1F331}' },
  { count: 3, label: 'Connector', bonus: '+5 extra entries', icon: '\u{1F31F}' },
  { count: 5, label: 'Influencer', bonus: '+10 extra entries', icon: '\u{1F525}' },
  { count: 10, label: 'Champion', bonus: '+25 extra entries', icon: '\u{1F451}' },
]

// ============================================================
// Countdown Timer
// ============================================================

function Countdown({ endDate }: { endDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [tick, setTick] = useState(false)

  useEffect(() => {
    const target = new Date(endDate).getTime()
    const update = () => {
      const diff = Math.max(0, target - Date.now())
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      })
      setTick(t => !t)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [endDate])

  const totalHours = timeLeft.days * 24 + timeLeft.hours
  const isUrgent = totalHours < 24

  const boxes = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Min', value: timeLeft.minutes },
    { label: 'Sec', value: timeLeft.seconds },
  ]

  return (
    <div className="animate-slide-up stagger-2">
      {isUrgent && (
        <div className="flex items-center justify-center gap-2 mb-3 animate-pulse">
          <span className="text-red-500 text-lg">\u{1F525}</span>
          <span className="text-red-500 font-bold text-sm uppercase tracking-wider">Ending soon!</span>
          <span className="text-red-500 text-lg">\u{1F525}</span>
        </div>
      )}
      <div className="flex gap-3 justify-center">
        {boxes.map((box) => (
          <div key={box.label} className="flex flex-col items-center">
            <div className={`
              relative overflow-hidden rounded-xl w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center
              ${isUrgent ? 'bg-red-900/90 border-2 border-red-500/50' : 'bg-card border-2 border-border'}
              shadow-lg
            `}>
              <span key={`${box.label}-${tick}`} className={`text-2xl sm:text-3xl font-bold tabular-nums animate-tick ${isUrgent ? 'text-red-200' : 'text-foreground'}`}>
                {String(box.value).padStart(2, '0')}
              </span>
              <div className="absolute inset-0 shimmer-bg" />
            </div>
            <span className={`text-xs mt-2 font-medium uppercase tracking-wider ${isUrgent ? 'text-red-400' : 'text-muted-foreground'}`}>{box.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Progress Bar (entries toward target)
// ============================================================

function EntryProgress({ current, target }: { current: number; target: number }) {
  const pct = Math.min((current / target) * 100, 100)
  const spotsLeft = Math.max(0, target - current)

  return (
    <div className="animate-slide-up stagger-3">
      <div className="flex justify-between items-end mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{current.toLocaleString()} entries</span>
          <span className="text-xs text-muted-foreground">/ {target.toLocaleString()} target</span>
        </div>
        {spotsLeft > 0 && spotsLeft < target * 0.3 && (
          <span className="text-xs font-bold text-red-500 animate-pulse">
            Only {spotsLeft.toLocaleString()} spots left!
          </span>
        )}
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-primary animate-progress-fill relative"
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 shimmer-bg" />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Leaderboard
// ============================================================

function LeaderboardSection({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null

  const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}']

  return (
    <div className="bg-card rounded-2xl border border-border shadow-lg p-6 animate-slide-up stagger-5">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-2xl animate-trophy-bounce">\u{1F3C6}</span>
        <h3 className="text-lg font-bold text-foreground">Leaderboard</h3>
      </div>
      <div className="space-y-2">
        {entries.map((entry, idx) => (
          <div
            key={entry.rank}
            className="animate-slide-in-left flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            style={{ animationDelay: `${idx * 0.08}s`, opacity: 0 }}
          >
            <span className="text-xl w-8 text-center">
              {entry.rank <= 3 ? medals[entry.rank - 1] : (
                <span className="text-sm font-bold text-muted-foreground">#{entry.rank}</span>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {entry.name || 'Anonymous'}
              </p>
              {entry.referral_count > 0 && (
                <p className="text-xs text-muted-foreground">
                  {entry.referral_count} referral{entry.referral_count !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-primary">{entry.total_points} pts</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// Notify Form (no active competition)
// ============================================================

function NotifyForm({ platformSlug, platformName }: { platformSlug: string; platformName: string }) {
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
        body: JSON.stringify({ email, name: name || undefined, platform: platformSlug, marketing_opt_in: marketingOptIn, create_account_opt_in: createAccountOptIn }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed') }
      setSubmitted(true)
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong') }
    finally { setLoading(false) }
  }

  if (submitted) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-xl p-10 max-w-md mx-auto text-center animate-slide-up">
        <div className="text-6xl mb-4 animate-trophy-bounce">\u{1F389}</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">You&apos;re on the list!</h2>
        <p className="text-muted-foreground">
          We&apos;ll email <strong className="text-foreground">{email}</strong> when our next competition launches.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-10 animate-slide-up">
        <div className="text-6xl mb-6 animate-float">\u{1F3C6}</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
          Competition Coming Soon
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          We&apos;re preparing something exciting for {platformName}. Be the first to know when it launches.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-xl p-8 animate-slide-up stagger-2">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="notify-email" className="block text-sm font-semibold text-foreground mb-1.5">Email *</label>
            <input type="email" id="notify-email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="notify-name" className="block text-sm font-semibold text-foreground mb-1.5">Name</label>
            <input type="text" id="notify-name" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition" placeholder="Your name" />
          </div>
          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={createAccountOptIn} onChange={(e) => setCreateAccountOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition">
                Create a free {platformName} account for me
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition">
                I&apos;d like to receive product updates and tips
              </span>
            </label>
          </div>
          {error && <p className="text-destructive text-sm font-medium">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full gradient-cta text-primary-foreground py-3.5 px-6 rounded-xl font-bold text-lg disabled:opacity-50 disabled:transform-none">
            {loading ? 'Submitting...' : '\u{1F514} Notify Me When It Launches'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// Entry Form
// ============================================================

function EntryForm({ competition, referralCode, onSuccess }: {
  competition: Competition; referralCode: string | null; onSuccess: (r: EntryResult) => void
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

  // Find referral action to show bonus points
  const referralAction = competition.entry_actions.find(a => a.action_type === 'referral' && a.enabled)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!acceptedRules) { setError('You must accept the rules and privacy policy to enter.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/competition/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitionId: competition.id, email, name: name || undefined, company: company || undefined,
          referral_code: referralCode || undefined, marketing_opt_in: marketingOptIn,
          create_account_opt_in: createAccountOptIn, accepted_rules: acceptedRules,
        }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Failed') }
      onSuccess(await res.json())
    } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong') }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-xl p-8 animate-slide-up animate-pulse-glow">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Enter to Win</h2>
        {competition.prize_description && (
          <p className="text-muted-foreground">{competition.prize_description}</p>
        )}
      </div>

      {referralCode && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-6 text-center">
          <p className="text-sm font-medium text-primary">\u{1F381} You were referred! Both you and your friend earn bonus points.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="entry-email" className="block text-sm font-semibold text-foreground mb-1.5">Email *</label>
          <input type="email" id="entry-email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition" placeholder="you@example.com" />
        </div>

        <div>
          <label htmlFor="entry-name" className="block text-sm font-semibold text-foreground mb-1.5">
            Name {requiresName ? '*' : '(optional)'}
          </label>
          <input type="text" id="entry-name" required={requiresName} value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition" placeholder="Your name" />
        </div>

        {(requiresCompany || competition.required_fields.includes('company')) && (
          <div>
            <label htmlFor="entry-company" className="block text-sm font-semibold text-foreground mb-1.5">Company {requiresCompany ? '*' : '(optional)'}</label>
            <input type="text" id="entry-company" required={requiresCompany} value={company} onChange={(e) => setCompany(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition" placeholder="Your company" />
          </div>
        )}

        <div className="space-y-3 pt-2 border-t border-border">
          <label className="flex items-start gap-3 cursor-pointer group pt-3">
            <input type="checkbox" checked={acceptedRules} onChange={(e) => setAcceptedRules(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition">
              I accept the{' '}
              {competition.rules_url ? (
                <a href={competition.rules_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">competition rules</a>
              ) : 'competition rules'}{' '}
              and <a href="/privacy" className="text-primary hover:underline font-medium">privacy policy</a> *
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" checked={createAccountOptIn} onChange={(e) => setCreateAccountOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition">
              Create a free account for me
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer group">
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition">
              I&apos;d like to receive product updates and tips
            </span>
          </label>
        </div>

        {error && <p className="text-destructive text-sm font-medium">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full gradient-cta text-primary-foreground py-4 px-6 rounded-xl font-bold text-lg disabled:opacity-50 disabled:transform-none relative overflow-hidden">
          <span className="relative z-10">{loading ? 'Entering...' : '\u{1F3AF} Enter Competition Now'}</span>
          {!loading && <div className="absolute inset-0 shimmer-bg" />}
        </button>

        {referralAction && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            \u{1F4A1} <strong>Pro tip:</strong> After entering, share your referral link to earn +{referralAction.points} bonus points per friend who joins!
          </p>
        )}
      </form>
    </div>
  )
}

// ============================================================
// Entered Status (post-entry)
// ============================================================

function EnteredStatus({ competition, entry, platformSlug, platformName }: {
  competition: Competition; entry: EntryResult; platformSlug: string; platformName: string
}) {
  const [totalPoints, setTotalPoints] = useState(entry.total_points)
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set())
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [referralCount] = useState(0) // Would come from API in a real implementation

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/competition?ref=${entry.referral_code}`
    : ''

  const referralAction = competition.entry_actions.find(a => a.action_type === 'referral' && a.enabled)

  const copyReferralLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = referralLink
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [referralLink])

  const handleAction = async (actionType: string, customKey?: string) => {
    const actionId = customKey || actionType
    if (completedActions.has(actionId)) return
    setLoadingAction(actionId)
    try {
      const res = await fetch('/api/competition/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitionId: competition.id, entry_id: entry.entry_id, action_type: actionType, custom_action_key: customKey }),
      })
      if (!res.ok) throw new Error('Failed')
      const result = await res.json()
      if (result.action_logged) {
        setTotalPoints(result.total_points)
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
      }
      setCompletedActions(prev => new Set([...prev, actionId]))
    } catch { /* silently fail for bonus actions */ }
    finally { setLoadingAction(null) }
  }

  const enabledActions = competition.entry_actions.filter(a => a.enabled && a.action_type !== 'email_signup')

  // Current referral tier
  const currentTier = REFERRAL_TIERS.filter(t => referralCount >= t.count).pop()
  const nextTier = REFERRAL_TIERS.find(t => referralCount < t.count)

  return (
    <div className="space-y-6">
      <ConfettiOverlay active={showConfetti} />

      {/* Points display */}
      <div className="bg-card rounded-2xl border border-border shadow-xl p-8 text-center animate-slide-up">
        <div className="text-5xl mb-3 animate-trophy-bounce">\u{1F389}</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">You&apos;re In!</h2>
        <p className="text-muted-foreground mb-5">
          You&apos;ve entered the competition. Earn more points to increase your chances of winning!
        </p>
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-6 py-3 rounded-full">
          <span className="text-3xl font-extrabold tabular-nums"><AnimatedNumber value={totalPoints} /></span>
          <span className="text-sm font-medium opacity-80">points</span>
        </div>
      </div>

      {/* HOW IT WORKS — explain the system */}
      <div className="bg-card rounded-2xl border border-border shadow-lg p-6 animate-slide-up stagger-1">
        <h3 className="text-lg font-bold text-foreground mb-4">\u{1F4A1} How to Win</h3>
        <div className="grid gap-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
            <span className="text-xl">\u{1F3AF}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">More points = more chances</p>
              <p className="text-xs text-muted-foreground">Each point acts like an extra ticket in the draw. The more you earn, the higher your odds!</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
            <span className="text-xl">\u{1F91D}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Refer friends for bonus entries</p>
              <p className="text-xs text-muted-foreground">
                Share your unique link below. Every friend who enters gives you
                {referralAction ? ` +${referralAction.points} bonus points` : ' bonus points'}!
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
            <span className="text-xl">\u{2B50}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">Complete bonus actions</p>
              <p className="text-xs text-muted-foreground">Each action below earns you extra points. Stack them up!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="bg-card rounded-2xl border-2 border-primary/30 shadow-lg p-6 animate-slide-up stagger-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">\u{1F517}</span>
          <h3 className="text-lg font-bold text-foreground">Your Referral Link</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Every friend who enters through your link earns you
          <strong className="text-primary"> {referralAction ? `+${referralAction.points} bonus points` : 'bonus points'}</strong>.
          The more friends, the better your odds!
        </p>
        <div className="flex gap-2 mb-4">
          <input type="text" readOnly value={referralLink}
            className="flex-1 px-4 py-2.5 border border-border rounded-xl bg-muted text-sm text-foreground font-mono truncate" />
          <button onClick={copyReferralLink}
            className="gradient-cta text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap">
            {copied ? '\u{2705} Copied!' : '\u{1F4CB} Copy'}
          </button>
        </div>

        {/* Share buttons */}
        <div className="flex gap-2 flex-wrap">
          <a href={`https://twitter.com/intent/tweet?text=I+just+entered+this+competition!+Join+me:&url=${encodeURIComponent(referralLink)}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition">
            Share on X
          </a>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition">
            Share on LinkedIn
          </a>
          <a href={`mailto:?subject=Check out this competition&body=I+just+entered+this+competition!+Join+me:+${encodeURIComponent(referralLink)}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition">
            Email a Friend
          </a>
        </div>

        {/* Referral tier progress */}
        {nextTier && (
          <div className="mt-5 pt-4 border-t border-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-foreground">
                {currentTier ? `${currentTier.icon} ${currentTier.label}` : 'Referral Progress'}
              </span>
              <span className="text-xs text-muted-foreground">
                {nextTier.count - referralCount} more to unlock {nextTier.icon} {nextTier.label}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min((referralCount / nextTier.count) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-3 gap-1">
              {REFERRAL_TIERS.map(tier => (
                <div key={tier.count} className={`text-center flex-1 ${referralCount >= tier.count ? 'opacity-100' : 'opacity-40'}`}>
                  <div className="text-lg">{tier.icon}</div>
                  <div className="text-[10px] font-medium text-muted-foreground">{tier.bonus}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bonus Actions */}
      {enabledActions.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-lg p-6 animate-slide-up stagger-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl animate-sparkle">\u{2B50}</span>
            <h3 className="text-lg font-bold text-foreground">Earn Bonus Points</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Complete these actions to earn extra entries. Each action can only be done once.
          </p>
          <div className="space-y-2">
            {enabledActions.map((action) => {
              const actionId = action.custom_action_key || action.action_type
              const isCompleted = completedActions.has(actionId)
              const isLoading = loadingAction === actionId
              const label = action.custom_action_label || getActionLabel(action.action_type, platformName)
              const icon = getActionIcon(action.action_type)

              return (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.action_type, action.custom_action_key || undefined)}
                  disabled={isCompleted || isLoading}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 ${
                    isCompleted
                      ? 'bg-primary/5 border-primary/30 scale-[0.99]'
                      : 'bg-card border-border hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5'
                  } disabled:cursor-not-allowed`}
                >
                  <span className={`text-xl ${isCompleted ? 'animate-trophy-bounce' : ''}`}>
                    {isCompleted ? '\u{2705}' : icon}
                  </span>
                  <span className="flex-1 text-left text-sm font-medium text-foreground">{label}</span>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    isCompleted ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {isLoading ? '...' : `+${action.points} pts`}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">
              \u{1F4CA} Each point = 1 extra ticket in the draw. You currently have <strong className="text-foreground">{totalPoints} tickets</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Prize Showcase
// ============================================================

function PrizeShowcase({ competition }: { competition: Competition }) {
  const prizeIcon = competition.prize_type === 'cash' ? '\u{1F4B0}'
    : competition.prize_type === 'product' ? '\u{1F381}'
    : competition.prize_type === 'subscription' ? '\u{1F4AB}'
    : '\u{1F3C6}'

  return (
    <div className="bg-card rounded-2xl border-2 border-primary/20 shadow-xl p-8 text-center animate-slide-up stagger-1 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
      <div className="text-5xl mb-4 animate-float">{prizeIcon}</div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-primary mb-2">Prize</h3>
      {competition.prize_description && (
        <p className="text-xl font-bold text-foreground mb-2">{competition.prize_description}</p>
      )}
      {competition.prize_value > 0 && (
        <p className="text-3xl font-extrabold text-primary">
          ${competition.prize_value.toLocaleString()}
        </p>
      )}
      <div className="mt-4 flex justify-center gap-4 text-sm text-muted-foreground">
        <span>{competition.winner_count} winner{competition.winner_count !== 1 ? 's' : ''}</span>
        {competition.draw_type === 'random' && <span>Random draw</span>}
        {competition.draw_type === 'points' && <span>Highest points wins</span>}
        {competition.draw_type === 'milestone' && <span>Drawn at {competition.target_entries?.toLocaleString()} entries</span>}
      </div>
    </div>
  )
}

// ============================================================
// Active Competition (main wrapper)
// ============================================================

function ActiveCompetition({ competition, leaderboard, platformSlug, platformName, referralCode }: {
  competition: Competition; leaderboard: LeaderboardEntry[]; platformSlug: string; platformName: string; referralCode: string | null
}) {
  const [entry, setEntry] = useState<EntryResult | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`competition_entry_${competition.id}`)
      if (stored) setEntry(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [competition.id])

  const handleEntrySuccess = (result: EntryResult) => {
    setEntry(result)
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 4000)
    try { localStorage.setItem(`competition_entry_${competition.id}`, JSON.stringify(result)) }
    catch { /* ignore */ }
  }

  return (
    <div className="space-y-8">
      <ConfettiOverlay active={showConfetti} />

      {/* Hero */}
      <div className="text-center animate-slide-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          Competition Live
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 tracking-tight leading-tight">
          {competition.title}
        </h1>
        {competition.description && (
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {competition.description}
          </p>
        )}
      </div>

      {/* Hero Image */}
      {competition.hero_image_url && (
        <div className="animate-slide-up stagger-1">
          <img
            src={competition.hero_image_url}
            alt={competition.title}
            className="rounded-2xl shadow-2xl max-w-2xl mx-auto w-full border border-border"
          />
        </div>
      )}

      {/* Prize Showcase */}
      <PrizeShowcase competition={competition} />

      {/* Stats Bar */}
      <div className="flex flex-wrap justify-center gap-4 animate-slide-up stagger-2">
        <div className="bg-card rounded-xl border border-border shadow-lg px-6 py-4 text-center min-w-[120px]">
          <p className="text-2xl sm:text-3xl font-extrabold text-primary tabular-nums">
            <AnimatedNumber value={competition.total_entries} />
          </p>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Entries</p>
        </div>
        {competition.target_entries && (
          <div className="bg-card rounded-xl border border-border shadow-lg px-6 py-4 text-center min-w-[120px]">
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
              {competition.target_entries.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Target</p>
          </div>
        )}
        <div className="bg-card rounded-xl border border-border shadow-lg px-6 py-4 text-center min-w-[120px]">
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground">{competition.winner_count}</p>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Winner{competition.winner_count !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Entry progress */}
      {competition.target_entries && (
        <div className="max-w-lg mx-auto">
          <EntryProgress current={competition.total_entries} target={competition.target_entries} />
        </div>
      )}

      {/* Countdown */}
      {competition.end_date && <Countdown endDate={competition.end_date} />}

      {/* Entry form or entered status */}
      <div className="max-w-lg mx-auto">
        {entry ? (
          <EnteredStatus competition={competition} entry={entry} platformSlug={platformSlug} platformName={platformName} />
        ) : (
          <EntryForm competition={competition} referralCode={referralCode} onSuccess={handleEntrySuccess} />
        )}
      </div>

      {/* Social proof nudge */}
      {!entry && competition.total_entries > 10 && (
        <div className="text-center animate-slide-up stagger-4">
          <p className="text-sm text-muted-foreground">
            \u{1F465} <strong className="text-foreground">{competition.total_entries.toLocaleString()} people</strong> have already entered.
            Don&apos;t miss out!
          </p>
        </div>
      )}

      {/* Leaderboard */}
      <div className="max-w-lg mx-auto">
        <LeaderboardSection entries={leaderboard} />
      </div>
    </div>
  )
}

// ============================================================
// Main Export
// ============================================================

export function CompetitionPageClient({ competition, leaderboard, platformSlug, platformName, referralCode }: {
  competition: Competition | null; leaderboard: LeaderboardEntry[]; platformSlug: string; platformName: string; referralCode: string | null
}) {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <AnimationStyles />
      <div className="max-w-4xl mx-auto">
        {competition ? (
          <ActiveCompetition
            competition={competition}
            leaderboard={leaderboard}
            platformSlug={platformSlug}
            platformName={platformName}
            referralCode={referralCode}
          />
        ) : (
          <NotifyForm platformSlug={platformSlug} platformName={platformName} />
        )}
      </div>
    </div>
  )
}
