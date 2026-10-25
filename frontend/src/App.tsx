import { ChangeEvent, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { apiFetch, localDateInput } from './lib/api'
import { NavLink, Route, Routes } from 'react-router-dom'
import Dashboard from './Dashboard'
import Analytics from './Analytics'
import Goals from './Goals'
import Challenge from './Challenge'
import Checkins from './Checkins'
import Experiments from './Experiments'
import Auth from './Auth'
import Account from './Account'
import { GuestPreview } from './GuestPreview'

type Category = { id: string; name: string }
type Distraction = 'NONE' | 'PHONE' | 'YOUTUBE' | 'FRIENDS' | 'UNEXPECTED_WORK' | 'TIRED' | 'PROCRASTINATION' | 'OTHER'
type HourlyBlock = {
  hourIndex: number
  category: { name: string } | null
  categoryId: string | null
  activity: string | null
  plannedTask: string | null
  distraction: Distraction
  customDistraction: string | null
  missedPlanReason: string | null
}
type DailyLog = { date: string; blocks: HourlyBlock[] }

function addDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00`)
  next.setDate(next.getDate() + days)
  return localDateInput(next)
}

function hourLabel(hour: number) {
  const format = (value: number) => {
    const suffix = value >= 12 && value < 24 ? 'PM' : 'AM'
    const normalized = value % 12 || 12
    return `${normalized} ${suffix}`
  }
  return `${format(hour)} – ${format((hour + 1) % 24)}`
}

function ProfilePhoto() {
  const [photo, setPhoto] = useState(() => localStorage.getItem('timelens-profile-photo') ?? '')
  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => { const image = String(reader.result); localStorage.setItem('timelens-profile-photo', image); setPhoto(image) }
    reader.readAsDataURL(file)
  }
  return <label className="profile-photo" title="Choose your photo">
    {photo ? <img src={photo} alt="Your profile" /> : <span>✦</span>}
    <input type="file" accept="image/*" onChange={choosePhoto} />
  </label>
}

function DailyLogPage() {
  const [date, setDate] = useState(localDateInput())
  const [log, setLog] = useState<DailyLog | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [distractionOptions, setDistractionOptions] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [guest, setGuest] = useState(false)
  const logRef = useRef<DailyLog | null>(null)
  const dateRef = useRef(date)
  const saving = useRef(new Set<number>())
  const versions = useRef<Record<number, number>>({})

  const loadDay = useCallback(async (selectedDate: string) => {
    setMessage('')
    try {
      const [logResponse, categoryResponse, accountResponse] = await Promise.all([
        apiFetch(`/api/daily-log/${selectedDate}`),
        apiFetch('/api/categories'),
        apiFetch('/api/auth/account'),
      ])
      if (logResponse.status === 401 || categoryResponse.status === 401 || accountResponse.status === 401) { setGuest(true); return }
      if (!logResponse.ok || !categoryResponse.ok || !accountResponse.ok) throw new Error('Could not load the daily log.')
      const loaded = await logResponse.json() as DailyLog
      logRef.current = loaded
      setLog(loaded)
      setCategories((await categoryResponse.json() as { categories: Category[] }).categories)
      setDistractionOptions((await accountResponse.json() as { distractionOptions: string[] }).distractionOptions)
    } catch {
      setMessage('Unable to load this day. Please refresh and try again.')
    }
  }, [])

  useEffect(() => { dateRef.current = date; void loadDay(date) }, [date, loadDay])

  function updateDraft(hourIndex: number, values: Partial<HourlyBlock>) {
    const current = logRef.current
    if (!current) return
    const next = {
      ...current,
      blocks: current.blocks.map((block) => block.hourIndex === hourIndex ? { ...block, ...values } : block),
    }
    logRef.current = next
    setLog(next)
  }

  async function persistBlock(hourIndex: number) {
    const block = logRef.current?.blocks.find((item) => item.hourIndex === hourIndex)
    if (!block) return
    setMessage('')
    try {
      const response = await apiFetch(`/api/daily-log/${dateRef.current}/blocks/${block.hourIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: block.categoryId,
          activity: block.activity || null,
          plannedTask: block.plannedTask || null,
          distraction: block.distraction,
          customDistraction: block.customDistraction,
          missedPlanReason: block.missedPlanReason || null,
        }),
      })
      if (!response.ok) throw new Error('Could not save the block.')
      await response.json()
    } catch {
      setMessage('Unable to save this block. Please try again.')
    }
  }

  async function saveLatest(hourIndex: number) {
    if (saving.current.has(hourIndex)) return
    saving.current.add(hourIndex)
    try {
      let savedVersion: number
      do {
        savedVersion = versions.current[hourIndex] ?? 0
        await persistBlock(hourIndex)
      } while ((versions.current[hourIndex] ?? 0) !== savedVersion)
    } finally { saving.current.delete(hourIndex) }
  }

  function updateAndSave(hourIndex: number, values: Partial<HourlyBlock>) {
    updateDraft(hourIndex, values)
    versions.current[hourIndex] = (versions.current[hourIndex] ?? 0) + 1
    void saveLatest(hourIndex)
  }

  const isActualDistraction = (block: HourlyBlock) => block.distraction !== 'NONE'
  const distractionTime = (block: HourlyBlock) => isActualDistraction(block) ? (!block.categoryId || block.activity?.trim().toLowerCase() === block.distraction.toLowerCase() ? 1 : 1 / 3) : 0
  const filledBlocks = log?.blocks.filter((block) => block.categoryId).length ?? 0
  const plannedBlocks = log?.blocks.filter((block) => block.plannedTask && block.plannedTask.toLowerCase() !== 'optional').length ?? 0
  const completedPlannedBlocks = log?.blocks.filter((block) => block.plannedTask && block.plannedTask.toLowerCase() !== 'optional' && block.category?.name.toLowerCase() === block.plannedTask.toLowerCase()).length ?? 0
  const distractionBlocks = Number((log?.blocks.reduce((sum, block) => sum + distractionTime(block), 0) ?? 0).toFixed(1))
  const planCompletionPercentage = plannedBlocks ? Math.round((completedPlannedBlocks / plannedBlocks) * 100) : 0
  const plannedDayPercentage = Math.round((plannedBlocks / 24) * 100)
  const distractionPercentage = filledBlocks ? Math.round((distractionBlocks / filledBlocks) * 100) : 0
  const selectedDay = new Date(`${date}T12:00:00`)
  const formattedDate = selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  if (guest) return <GuestPreview eyebrow="TODAY" title="Your time has a pattern." description="TimeLens helps you see it. Build a calmer day, one focused hour at a time." points={['Plan a clear, flexible day', 'Keep a gentle record of your time', 'Less guilt. More clarity.']} cta="Start planning my day" />

  return (
    <main className="app-shell daily-workspace">
      <header className="daily-topbar">
        <div><p className="eyebrow">{formattedDate}</p><h1>Daily log</h1><p className="daily-motto">One focused hour is still progress.</p></div>
        <section className="date-bar" aria-label="Choose a day"><button onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">←</button><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /><button onClick={() => setDate(localDateInput())}>Today</button><button onClick={() => setDate(addDays(date, 1))} aria-label="Next day">→</button></section>
      </header>
      <section className="daily-metrics" aria-label="Daily summary">
        <article><span className="metric-ring focus-ring" style={{ '--metric-progress': `${planCompletionPercentage}%` } as CSSProperties}><b>{planCompletionPercentage}%</b></span><div><strong>{completedPlannedBlocks} / {plannedBlocks}</strong><small>Plan complete</small></div></article>
        <article><span className="metric-ring plan-ring" style={{ '--metric-progress': `${plannedDayPercentage}%` } as CSSProperties}><b>{plannedDayPercentage}%</b></span><div><strong>{plannedBlocks}h</strong><small>Day planned</small></div></article>
        <article><span className="metric-ring distract-ring" style={{ '--metric-progress': `${distractionPercentage}%` } as CSSProperties}><b>{distractionPercentage}%</b></span><div><strong>{distractionBlocks}h</strong><small>Distractions</small></div></article>
      </section>

      {message && <p className="notice" role="status">{message}</p>}
      <section className="table-frame" aria-label="24 hour daily log">
        <table>
          <thead><tr><th>Time</th><th>Category</th><th>Activity</th><th>Planned task</th><th>Distraction</th></tr></thead>
          <tbody>
            {log?.blocks.map((block) => <tr key={block.hourIndex}>
              <th scope="row">{hourLabel(block.hourIndex)}</th>
              <td><select aria-label={`${hourLabel(block.hourIndex)} category`} value={block.categoryId ?? ''} onChange={(event) => { const category = categories.find((item) => item.id === event.target.value); updateAndSave(block.hourIndex, { categoryId: event.target.value || null, category: category ? { name: category.name } : null }) }}><option value="">—</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></td>
              <td><input aria-label={`${hourLabel(block.hourIndex)} activity`} value={block.activity ?? ''} placeholder="What did you do?" onChange={(event) => updateAndSave(block.hourIndex, { activity: event.target.value })} onBlur={() => void saveLatest(block.hourIndex)} /></td>
              <td><select aria-label={`${hourLabel(block.hourIndex)} planned task`} value={block.plannedTask ?? ''} onChange={(event) => updateAndSave(block.hourIndex, { plannedTask: event.target.value || null })}><option value="">Optional</option>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></td>
              <td><select aria-label={`${hourLabel(block.hourIndex)} distraction`} value={block.distraction === 'NONE' ? '' : block.customDistraction ?? ''} onChange={(event) => { const label = event.target.value; updateAndSave(block.hourIndex, label ? { distraction: 'OTHER', customDistraction: label } : { distraction: 'NONE', customDistraction: null }) }}><option value="">None</option>{distractionOptions.map((label) => <option key={label} value={label}>{label}</option>)}</select></td>
            </tr>)}
          </tbody>
        </table>
      </section>
    </main>
  )
}

export default function App() {
  const [dark, setDark] = useState(() => localStorage.getItem('timelens-dark-mode') !== 'false')
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('timelens-dark-mode', String(dark)) }, [dark])
  return <><nav className="main-nav" aria-label="Main navigation"><NavLink className="app-brand" to="/"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Time<span>Lens</span></span></NavLink><div className="nav-links"><NavLink to="/">Today</NavLink><NavLink to="/dashboard">Overview</NavLink><NavLink to="/analytics">Analytics</NavLink><NavLink to="/goals">Goals</NavLink><NavLink to="/challenge">100 days</NavLink><NavLink to="/checkins">Check-ins</NavLink><NavLink to="/experiments">Experiments</NavLink></div><div className="nav-profile"><button className="theme-toggle" type="button" onClick={() => setDark(value => !value)}>{dark ? '☀' : '☾'} <span>{dark ? 'Light mode' : 'Dark mode'}</span></button><ProfilePhoto /><NavLink to="/account">Account</NavLink></div></nav><Routes><Route path="/" element={<DailyLogPage />} /><Route path="/dashboard" element={<Dashboard />} /><Route path="/analytics" element={<Analytics />} /><Route path="/goals" element={<Goals />} /><Route path="/challenge" element={<Challenge />} /><Route path="/checkins" element={<Checkins />} /><Route path="/experiments" element={<Experiments />} /><Route path="/account" element={<Account />} /><Route path="/auth" element={<Auth />} /></Routes></>
}
