import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { getAttributionSource, getExperimentVariant, markOnce, trackEvent } from './lib/analytics'

type DemoCollege = { name: string; registrations: number; referrals: number }
type RegistrationResult = {
  registration_id: string
  out_referral_code: string
  out_college_name: string
  referrals: number
}
type LeaderboardRow = { college_name: string; registrations: number; referrals: number }

const demoColleges: DemoCollege[] = [
  { name: 'RV College of Engineering', registrations: 74, referrals: 22 },
  { name: 'Amrita Vishwa Vidyapeetham', registrations: 63, referrals: 19 },
  { name: 'PES University', registrations: 51, referrals: 15 },
  { name: 'BMS College of Engineering', registrations: 43, referrals: 11 },
  { name: 'VIT', registrations: 39, referrals: 10 },
  { name: 'SRM Institute of Science and Technology', registrations: 33, referrals: 8 },
]

const demoDashboard = {
  goal: 500,
  registrations: 327,
  landingViews: 1820,
  registrationStarts: 540,
  referred: 106,
  channels: [
    ['College communities', 142],
    ['WhatsApp referrals', 106],
    ['LinkedIn', 43],
    ['Other', 36],
  ] as [string, number][],
  variants: [
    ['A', 'Generic workshop message', 12.8],
    ['B', 'Build your first AI project in 60 minutes', 18.6],
    ['C', 'Build one with your friends', 15.1],
  ] as [string, string, number][],
}

const variantCopy = {
  A: {
    title: 'Build a project you can talk about in your next interview.',
    copy: 'Go from idea → working prototype in a single free workshop designed for final-year engineering students.',
    label: 'CAREER ANGLE',
  },
  B: {
    title: 'Build your first AI project in 60 minutes.',
    copy: 'Go from idea → working prototype in a single workshop designed for final-year engineering students.',
    label: 'CHALLENGE ANGLE',
  },
  C: {
    title: 'Build one AI project with your friends.',
    copy: 'Bring your classmates and leave the workshop with something tangible you can explain and keep improving.',
    label: 'PEER ANGLE',
  },
} as const

const sourceFromUtm = () => getAttributionSource() || 'College Community'

function App() {
  const path = window.location.pathname
  if (path === '/register') return <RegisterPage />
  if (path === '/success') return <SuccessPage />
  if (path === '/leaderboard') return <LeaderboardPage />
  if (path === '/dashboard') return <DashboardPage />
  return <HomePage />
}

function Nav() {
  return (
    <nav className="nav">
      <a className="brand" href="/">Campus<span>AI</span></a>
      <div className="nav-links">
        <a href="/leaderboard">Campus Race</a>
        <a href="/dashboard">Growth Dashboard</a>
      </div>
    </nav>
  )
}

function Shell({ children, experimentVariant }: { children: React.ReactNode; experimentVariant?: string }) {
  const path = window.location.pathname

  useEffect(() => {
    const source = getAttributionSource()
    const onceKey = `page_view:${path}:${experimentVariant || 'none'}`
    if (markOnce(onceKey)) {
      void trackEvent('page_view', {
        source,
        messageVariant: experimentVariant || null,
        metadata: { path, utmSource: source },
      })
    }
  }, [path, experimentVariant])

  return <div className="app-shell"><Nav /><main>{children}</main></div>
}

function HomePage() {
  const variant = getExperimentVariant()
  const copy = variantCopy[variant]
  return (
    <Shell experimentVariant={variant}>
      <section className="hero">
        <div className="eyebrow">{copy.label} • FREE • HANDS-ON • 60 MINUTES</div>
        <h1>{copy.title}</h1>
        <p className="hero-copy">{copy.copy}</p>
        <div className="hero-actions">
          <a className="btn primary" href="/register">Reserve my spot</a>
          <a className="btn ghost" href="/leaderboard">See the campus race →</a>
        </div>
        <div className="trust-row">
          <div><strong>500</strong><span>target seats</span></div>
          <div><strong>60 min</strong><span>build sprint</span></div>
          <div><strong>₹0</strong><span>registration fee</span></div>
        </div>
      </section>

      <section className="section-grid">
        <div className="feature-card">
          <span className="icon">01</span>
          <h3>Build, don't just watch</h3>
          <p>Leave with something tangible you can explain, show and keep improving.</p>
        </div>
        <div className="feature-card">
          <span className="icon">02</span>
          <h3>Bring your campus</h3>
          <p>Share your referral link and help your college climb the campus leaderboard.</p>
        </div>
        <div className="feature-card">
          <span className="icon">03</span>
          <h3>Learn by shipping</h3>
          <p>Fast experimentation is the point: idea → build → measure → learn.</p>
        </div>
      </section>

      <section className="callout">
        <div>
          <div className="eyebrow">HOW IT SPREADS</div>
          <h2>One registration can become five.</h2>
          <p>Students get a personal referral link immediately after registering, creating a peer-to-peer growth loop.</p>
        </div>
        <a className="btn primary" href="/register">Start the loop</a>
      </section>
    </Shell>
  )
}

function RegisterPage() {
  const params = new URLSearchParams(window.location.search)
  const referral = params.get('ref') || ''
  const variant = getExperimentVariant()
  const [form, setForm] = useState({
    name: '', email: '', college: 'Amrita Vishwa Vidyapeetham', graduationYear: '2026',
    source: referral ? 'Friend' : sourceFromUtm(),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (referral && markOnce(`referral_visit:${referral.toUpperCase()}`)) {
      void trackEvent('referral_link_visit', {
        referralCode: referral,
        metadata: { path: '/register' },
      })
    }
  }, [referral])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    void trackEvent('registration_started', {
      referralCode: referral || null,
      source: form.source,
      messageVariant: variant,
    })

    try {
      if (supabase) {
        const { data, error: rpcError } = await supabase.rpc('register_student', {
          p_name: form.name.trim(),
          p_email: form.email.trim().toLowerCase(),
          p_college_name: form.college,
          p_graduation_year: Number(form.graduationYear),
          p_source: form.source,
          p_referral_code: referral || null,
          p_message_variant: variant,
        })
        if (rpcError) throw rpcError
        const result = (data?.[0] ?? data) as RegistrationResult
        const registration = {
          ...form,
          referralCode: result.out_referral_code,
          collegeName: result.out_college_name,
          registrationId: result.registration_id,
          referrals: result.referrals ?? 0,
          messageVariant: variant,
        }

        localStorage.setItem('campus_ai_registration', JSON.stringify(registration))

        await trackEvent('registration_completed', {
          registrationId: result.registration_id,
          referralCode: result.out_referral_code,
          source: form.source,
          messageVariant: variant,
          metadata: { referred: Boolean(referral), experimentVariant: variant },
        })
      } else {
        const code = 'DEMO' + crypto.randomUUID().replaceAll('-', '').slice(0, 4).toUpperCase()
        localStorage.setItem('campus_ai_registration', JSON.stringify({
          ...form,
          referralCode: code,
          collegeName: form.college,
          registrationId: null,
          referrals: 0,
          messageVariant: variant,
        }))
      }
      window.location.href = '/success'
    } catch (err: any) {
      console.error('REGISTRATION ERROR:', err)
      setError(`Registration failed: ${err?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell experimentVariant={variant}>
      <div className="form-wrap">
        <div className="form-heading">
          <div className="eyebrow">STEP 1 OF 2 • VARIANT {variant}</div>
          <h1>Reserve your spot.</h1>
          <p>Register once. Get your personal campus referral link instantly.</p>
        </div>

        {referral && <div className="ref-banner">You were invited with referral code <strong>{referral}</strong>.</div>}

        <form className="form-card" onSubmit={submit}>
          <label>Name<input required value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Your name" /></label>
          <label>Email<input required type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="you@example.com" /></label>
          <label>College<input required value={form.college} onChange={e => setForm({...form, college:e.target.value})} placeholder="College name" /></label>
          <label>Graduation year
            <select value={form.graduationYear} onChange={e => setForm({...form, graduationYear:e.target.value})}>
              <option>2026</option><option>2027</option><option>2028</option>
            </select>
          </label>
          <label>How did you hear about this?
            <select value={form.source} onChange={e => setForm({...form, source:e.target.value})}>
              <option>College Community</option><option>WhatsApp</option><option>Friend</option><option>LinkedIn</option><option>Other</option>
            </select>
          </label>
          {error && <div className="error">{error}</div>}
          <button className="btn primary wide" disabled={loading}>{loading ? 'Registering…' : 'Reserve my spot'}</button>
          <p className="micro">Prototype note: demo data is used when Supabase is not configured.</p>
        </form>
      </div>
    </Shell>
  )
}

function SuccessPage() {
  const raw = localStorage.getItem('campus_ai_registration')
  const registration = raw ? JSON.parse(raw) : null
  const variant = (registration?.messageVariant === 'A' || registration?.messageVariant === 'B' || registration?.messageVariant === 'C')
    ? registration.messageVariant
    : getExperimentVariant()
  const [referrals, setReferrals] = useState<number>(registration?.referrals ?? 0)

  useEffect(() => {
    if (!registration?.referralCode || !supabase) return

    let active = true
    supabase.rpc('get_referral_stats', { p_referral_code: registration.referralCode }).then(({ data, error }) => {
      if (error || !active) return
      const stats = data?.[0] ?? data
      if (stats) {
        const referralCount = Number(stats.referrals)
        if (Number.isFinite(referralCount)) {
          setReferrals(referralCount)
          localStorage.setItem('campus_ai_registration', JSON.stringify({ ...registration, referrals: referralCount }))
        }
      }
    })

    return () => { active = false }
  }, [registration?.referralCode])

  if (!registration) {
    return <Shell><div className="empty"><h2>No registration found.</h2><a className="btn primary" href="/register">Register now</a></div></Shell>
  }

  const url = `${window.location.origin}/register?ref=${registration.referralCode}`
  const shareMessages = {
    A: `I’m joining a free AI workshop to build a project I can talk about in interviews. Join me: ${url}`,
    B: `I’m joining a free workshop to build an AI project in 60 minutes. Join me: ${url}`,
    C: `I’m joining this free AI project workshop. Want to build one together? ${url}`,
  }
  const message = shareMessages[variant as keyof typeof shareMessages]

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    void trackEvent('referral_link_copied', {
      registrationId: registration.registrationId,
      referralCode: registration.referralCode,
      metadata: { destination: url },
    })
    alert('Referral link copied.')
  }

  const shareWhatsApp = () => {
    void trackEvent('whatsapp_share_clicked', {
      registrationId: registration.registrationId,
      referralCode: registration.referralCode,
    })
  }

  return (
    <Shell experimentVariant={variant}>
      <section className="success">
        <div className="eyebrow">STEP 2 OF 2</div>
        <div className="success-badge">✓</div>
        <h1>You're in.</h1>
        <p>Now turn your registration into your campus advantage.</p>
        <div className="ref-banner">You were shown <strong>Variant {variant}</strong>. Share that message with your peers.</div>

        <div className="ref-card">
          <span className="muted">YOUR CAMPUS CODE</span>
          <strong>{registration.referralCode}</strong>
          <code>{url}</code>
          <div className="ref-progress">
            <span>{referrals} referred registration{referrals === 1 ? '' : 's'}</span>
            <span>Campus: {registration.collegeName}</span>
          </div>
          <div className="button-row">
            <button className="btn primary" onClick={copy}>Copy referral link</button>
            <a
              className="btn ghost"
              href={`https://wa.me/?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
              onClick={shareWhatsApp}
            >Share on WhatsApp</a>
          </div>
        </div>

        <div className="message-grid">
          {[
            ['A', 'Career angle', 'Build your first AI project in 60 minutes. I’m attending. Join me.'],
            ['B', 'Curiosity angle', 'Think building an AI project takes days? This free workshop does it in 60 minutes.'],
            ['C', 'Peer angle', 'I’m joining this AI project workshop. Want to build one together?'],
          ].map(([key, title, body]) => (
            <div className="message-card" key={key}>
              <div className="message-top"><span>Variant {key}</span><span>{title}</span></div>
              <p>{body}</p>
            </div>
          ))}
        </div>

        <a className="text-link" href="/leaderboard">See your campus leaderboard →</a>
      </section>
    </Shell>
  )
}

function LeaderboardPage() {
  const [rows, setRows] = useState<DemoCollege[]>([])
  const [live, setLive] = useState(false)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let active = true
    supabase.rpc('get_leaderboard').then(({ data, error }) => {
      if (!active) return
      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }
      if (!data?.length) {
        setRows([])
        setLive(true)
        setLoading(false)
        return
      }
      const mapped = data.map((row: LeaderboardRow) => ({
        name: row.college_name,
        registrations: Number(row.registrations),
        referrals: Number(row.referrals),
      }))
      setRows(mapped)
      setLive(true)
      setLoading(false)
    })

    return () => { active = false }
  }, [])

  const sortedRows = useMemo(() => [...rows].sort((a,b)=>b.registrations-a.registrations), [rows])
  const maxRegistrations = sortedRows[0]?.registrations || 1

  return (
    <Shell>
      <section className="page-head">
        <div>
          <div className="eyebrow">{loading ? 'LOADING LIVE DATA' : live ? 'LIVE DATA' : 'DEMO MODE'}</div>
          <h1>Campus race.</h1>
          <p>Which student community can drive the most registrations?</p>
        </div>
        <a className="btn primary" href="/register">Join the race</a>
      </section>

      {loading && <div className="empty"><h2>Loading live leaderboard…</h2><p>Fetching the latest aggregate registration counts.</p></div>}

      {!loading && error && <div className="empty"><h2>Couldn’t load the live leaderboard.</h2><p>{error}</p></div>}

      {!loading && !error && sortedRows.length === 0 && (
        <div className="empty"><h2>No registrations yet.</h2><p>Be the first campus to join the race.</p><a className="btn primary" href="/register">Register now</a></div>
      )}

      {!loading && !error && sortedRows.length > 0 && <div className="leaderboard">
        {sortedRows.map((row, i) => (
          <div className="leader-row" key={row.name}>
            <div className="rank">{String(i+1).padStart(2,'0')}</div>
            <div className="college">
              <strong>{row.name}</strong>
              <span>{row.referrals} referred registrations</span>
            </div>
            <div className="bar"><span style={{width:`${(row.registrations / maxRegistrations) * 100}%`}} /></div>
            <div className="count">{row.registrations}</div>
          </div>
        ))}
      </div>}
      <div className="leader-note">{live ? 'Live aggregate from Supabase. Individual student records are never exposed to the browser.' : 'Demo mode is available only when Supabase is not configured.'}</div>
    </Shell>
  )
}

function DashboardPage() {
  const [liveData, setLiveData] = useState<null | {
    goal: number
    registrations: number
    landingViews: number
    registrationStarts: number
    referred: number
    shares: number
    channels: [string, number][]
    variants: { variant: string; exposures: number; starts: number; conversions: number; conversionRate: number }[]
  }>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    if (!supabase) return

    let active = true
    supabase.rpc('get_growth_dashboard').then(({ data, error }) => {
      if (error || !active || !data) return
      const parsed = typeof data === 'string' ? JSON.parse(data) : data
      setLiveData({
        goal: Number(parsed.goal ?? 500),
        registrations: Number(parsed.registrations ?? 0),
        landingViews: Number(parsed.landingViews ?? 0),
        registrationStarts: Number(parsed.registrationStarts ?? 0),
        referred: Number(parsed.referred ?? 0),
        shares: Number(parsed.shares ?? 0),
        channels: (parsed.channels ?? []).map((row: unknown[]) => [String(row[0]), Number(row[1])] as [string, number]),
        variants: (parsed.variants ?? []).map((row: any) => ({
          variant: String(row.variant),
          exposures: Number(row.exposures ?? 0),
          starts: Number(row.starts ?? 0),
          conversions: Number(row.conversions ?? 0),
          conversionRate: Number(row.conversionRate ?? 0),
        })),
      })
      setLive(true)
    })

    return () => { active = false }
  }, [])

  const data = liveData ?? demoDashboard
  const progress = (data.registrations / data.goal) * 100
  const startRate = data.landingViews ? (data.registrationStarts / data.landingViews) * 100 : 0
  const completionRate = data.registrationStarts ? (data.registrations / data.registrationStarts) * 100 : 0
  const referralRate = data.registrations ? (data.referred / data.registrations) * 100 : 0

  const liveVariants = liveData?.variants ?? []
  const eligibleWinner = liveVariants.filter(v => v.exposures >= 3).sort((a, b) => b.conversionRate - a.conversionRate)[0]
  const winnerVariant = eligibleWinner?.variant ?? null

  return (
    <Shell>
      <section className="page-head">
        <div>
          <div className="eyebrow">{live ? 'LIVE DATA' : 'SIMULATION • DEMO DATA'}</div>
          <h1>Growth dashboard.</h1>
          <p>Track acquisition, referral behavior and which experiments deserve more distribution.</p>
        </div>
        <span className="status-dot">● {live ? 'Live funnel' : 'Prototype live'}</span>
      </section>

      <section className="stats">
        <Stat label="Registrations" value={`${data.registrations}`} sub={`of ${data.goal} target`} />
        <Stat label="Referral registrations" value={`${data.referred}`} sub={`${referralRate.toFixed(1)}% of total`} />
        <Stat label="Landing views" value={`${data.landingViews}`} sub={live ? 'tracked sessions' : 'simulated traffic'} />
        <Stat label="Goal progress" value={`${progress.toFixed(1)}%`} sub="toward 500" />
      </section>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-title"><h3>Registration funnel</h3><span>{live ? 'live' : 'demo'}</span></div>
          <FunnelRow label="Landing page visits" value={data.landingViews} pct={100} />
          <FunnelRow label="Registration starts" value={data.registrationStarts} pct={startRate} />
          <FunnelRow label="Completed registrations" value={data.registrations} pct={data.landingViews ? (data.registrations/data.landingViews)*100 : 0} />
          <FunnelRow label="Referred registrations" value={data.referred} pct={data.landingViews ? (data.referred/data.landingViews)*100 : 0} />
          <div className="insight">
            {live
              ? <>Start rate: <strong>{startRate.toFixed(1)}%</strong> · Start → completion: <strong>{completionRate.toFixed(1)}%</strong> · Shares: <strong>{liveData?.shares ?? 0}</strong></>
              : <>Simulation mode — real funnel tracking activates automatically when Supabase data is available.</>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title"><h3>Source performance</h3><span>{live ? 'live registrations' : 'simulation'}</span></div>
          {(live ? data.channels : demoDashboard.channels).map(([label, value]) => (
            <div className="metric-row" key={label}>
              <span>{label}</span><strong>{value}</strong>
            </div>
          ))}
          <div className="insight">Next learning: compare source quality, not just volume.</div>
        </div>

        <div className="panel">
          <div className="panel-title"><h3>Message experiment</h3><span>{live ? 'live test' : 'planned test'}</span></div>
          {(live && liveVariants.length ? liveVariants : demoDashboard.variants.map(([variant, label, pct]) => ({
            variant, exposures: 0, starts: 0, conversions: 0, conversionRate: pct, label,
          }))).map((row: any) => {
            const label = row.label ?? (row.variant === 'A' ? 'Career angle' : row.variant === 'B' ? 'Challenge angle' : 'Peer angle')
            return (
              <div className={`variant-row ${winnerVariant === row.variant ? 'winner' : ''}`} key={row.variant}>
                <div><strong>Variant {row.variant}</strong><span>{label} · {row.exposures || '—'} exposures · {row.conversions || '—'} registrations</span></div>
                <strong>{row.conversionRate}%</strong>
              </div>
            )
          })}
          <div className="insight">
            {live && liveVariants.length
              ? winnerVariant
                ? <>Current leader: <strong>Variant {winnerVariant}</strong> at <strong>{eligibleWinner?.conversionRate.toFixed(1)}%</strong> exposure → registration. Keep collecting data before scaling.</>
                : <>Collect at least a few exposures per variant before declaring a winner.</>
              : <>The A/B/C instrumentation is installed. Once real traffic arrives, this panel will replace simulation figures with measured conversion.</>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title"><h3>Three growth tests</h3><span>instrumented</span></div>
          <div className="metric-row"><span>1. Message angle → conversion</span><strong>Track A/B/C</strong></div>
          <div className="metric-row"><span>2. Referral CTA → sharing</span><strong>Track copies + WhatsApp</strong></div>
          <div className="metric-row"><span>3. Channel → registrations</span><strong>Track source</strong></div>
          <div className="insight">Each test maps directly to a measurable acquisition or conversion decision.</div>
        </div>

        <div className="panel recommendation">
          <div className="panel-title"><h3>Next action</h3><span>decision</span></div>
          <h2>{live && data.referred > 0 ? 'Scale the referral loop.' : 'Recruit more college community partners.'}</h2>
          <p>
            {live
              ? data.referred > 0
                ? `${data.referred} registrations currently came through referrals. I would increase campus distribution while monitoring referral share and registration completion.`
                : 'The funnel is collecting data, but referral-driven growth has not appeared yet. I would focus on campus/community distribution and make sharing the next conversion point to test.'
              : 'In this simulation, concentrated campus distribution is outperforming generic traffic. I would scale the winning channel before spending the ₹2,000 test budget.'}
          </p>
        </div>
      </div>

      <p className="footer-note">
        {live
          ? 'Live funnel and source metrics are aggregate-only. Student profile rows are never exposed to the browser.'
          : 'The dashboard is using simulation data until Supabase is connected and real events are available.'}
      </p>
    </Shell>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>
}

function FunnelRow({ label, value, pct }: { label: string; value: number; pct: number }) {
  return <div className="funnel-row"><div><span>{label}</span><strong>{value}</strong></div><div className="funnel-bar"><span style={{width:`${Math.min(100,pct)}%`}} /></div></div>
}

export default App
