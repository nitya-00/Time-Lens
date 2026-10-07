import { useEffect, useState } from 'react'
import { apiFetch, localDateInput } from './lib/api'

type Card = { name: string; hours: number; dayPercentage: number; changePercentage: number | null }
type DashboardData = {
  date: string
  cards: Card[]
  studyBreakdown: Array<{ name: string; hours: number }>
  weekly: Array<{ name: string; hours: number; changePercentage: number | null }>
  insight: string
  recommendation: string
  celebration: string | null
  daily: { planned: number; complete: number; distractionHours: number; loggedHours: number }
  challenge: { completedDays: number; targetDays: number; percentage: number }
}

function formatChange(value: number | null) {
  if (value === null) return 'No comparison yet'
  return `${value > 0 ? '↑' : value < 0 ? '↓' : '→'} ${Math.abs(value)}% vs yesterday`
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00`)
  next.setDate(next.getDate() + days)
  return localDateInput(next)
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState(false)
  const [engine, setEngine] = useState<{level:string;insight:string;recommendation:string}|null>(null)
  const [date, setDate] = useState(localDateInput())

  useEffect(() => {
    setError(false)
    apiFetch(`/api/analytics/dashboard?date=${date}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Dashboard request failed')
        setData(await response.json() as DashboardData)
      })
      .catch(() => setError(true))
  }, [date])
  useEffect(()=>{apiFetch('/api/insights').then(async r=>setEngine(await r.json() as {level:string;insight:string;recommendation:string})).catch(()=>undefined)},[])

  if (error) return <main className="dashboard-shell"><p className="notice">Unable to load your dashboard. Please refresh and try again.</p></main>
  if (!data) return <main className="dashboard-shell"><p className="quiet">Loading your day…</p></main>

  return <main className="dashboard-shell">
    <header className="masthead dashboard-header"><div><p className="eyebrow">TIME LENS</p><h1>Your day, in focus</h1><p className="quiet">A high-level view of {data.date}.</p></div><section className="date-bar" aria-label="Choose dashboard date"><button onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">←</button><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /><button onClick={() => setDate(localDateInput())}>Today</button><button onClick={() => setDate(addDays(date, 1))} aria-label="Next day">→</button></section></header>
    <section className="summary-grid" aria-label="Today’s time summary">
      {data.cards.map((card) => <article className="summary-card" key={card.name}>
        <p>{card.name}</p><strong>{card.hours}h</strong><span>{card.dayPercentage}% of day</span><small>{formatChange(card.changePercentage)}</small>
      </article>)}
    </section>
    <section className="dashboard-columns">
      <article className="panel"><p className="eyebrow">TODAY</p><h2>Your category mix</h2><ul className="metric-list">{data.studyBreakdown.map((item) => <li key={item.name}><span>{item.name}</span><strong>{item.hours}h</strong></li>)}</ul></article>
      <article className="panel"><p className="eyebrow">100 DAYS</p><h2>{data.challenge.completedDays} / {data.challenge.targetDays}</h2><div className="progress-track"><span style={{ width: `${data.challenge.percentage}%` }} /></div><p className="quiet">{data.challenge.percentage}% complete · {data.challenge.completedDays} recorded new experiences</p></article>
    </section>
    <section className="weekly-panel panel"><div><p className="eyebrow">THIS WEEK SO FAR</p><h2>Compared with the same number of days last week</h2></div><ul className="weekly-list">{data.weekly.map((item) => <li key={item.name}><span>{item.name}</span><strong>{item.hours}h</strong><small>{item.changePercentage === null ? 'No comparison yet' : `${item.changePercentage > 0 ? '+' : ''}${item.changePercentage}%`}</small></li>)}</ul></section>
    <section className="insight-grid"><article className="insight"><p className="eyebrow">{engine?.level ?? 'ONE INSIGHT'}</p><p>{engine?.insight ?? data.insight}</p></article><article className="recommendation"><p className="eyebrow">{data.celebration ? 'DAILY BREAKTHROUGH' : 'NEXT SMALL EXPERIMENT'}</p><p>{data.celebration ?? engine?.recommendation ?? data.recommendation}</p></article></section>
  </main>
}
