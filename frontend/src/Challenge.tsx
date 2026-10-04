import { FormEvent, useEffect, useState } from 'react'
import { apiFetch } from './lib/api'

type Entry = { id: string; dayNumber: number; date: string; description: string; category: string }
type Data = { dayNumber: number; targetDays: number; progress: number; completedDays: number; todayEntries: number; entries: Entry[]; distribution: Array<{ category: string; count: number; percentage: number }> }

const categories = ['SKILL', 'EXPERIENCE', 'HEALTH', 'SOCIAL', 'CREATIVITY', 'OTHER']
const label = (value: string) => value[0] + value.slice(1).toLowerCase()

export default function Challenge() {
  const [data, setData] = useState<Data | null>(null)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('SKILL')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const response = await apiFetch('/api/challenge')
      if (!response.ok) throw new Error()
      setData(await response.json() as Data)
    } catch { setMessage('Unable to load the challenge. Please refresh and try again.') }
  }

  useEffect(() => { void load() }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const response = await apiFetch('/api/challenge/today', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description, category }) })
      const result = await response.json().catch(() => null) as (Data & { message?: string }) | null
      if (!response.ok) { setMessage(result?.message ?? 'Unable to save today’s entry.'); return }
      setDescription('')
      setData(result)
      setMessage('Saved! Add another activity whenever you try something new today.')
    } finally { setSaving(false) }
  }

  if (!data) return <main className="dashboard-shell"><p className="quiet">Loading your challenge…</p></main>
  const today = data.entries.filter((entry) => entry.dayNumber === data.dayNumber)

  return <main className="dashboard-shell challenge-page">
    <section className="challenge-hero"><div><p className="eyebrow">100 DAYS OF NEW</p><h1>Day {data.dayNumber}<span> / {data.targetDays}</span></h1><p>One fresh experience can turn an ordinary day into a memorable one.</p></div><div className="challenge-orb" aria-label={`${data.progress}% complete`}><strong>{data.progress}%</strong><small>complete</small></div></section>
    <section className="challenge-stats" aria-label="Challenge progress"><div><strong>{data.completedDays}</strong><span>days completed</span></div><div><strong>{data.todayEntries}</strong><span>new things today</span></div><div><strong>{data.entries.length}</strong><span>total discoveries</span></div></section>
    <div className="progress-track challenge-progress" aria-label={`${data.progress}% complete`}><span style={{ width: `${data.progress}%` }} /></div>
    <form className="challenge-form challenge-composer panel" onSubmit={submit}><div><p className="eyebrow">TODAY’S DISCOVERY</p><h2>What did you try?</h2><p className="quiet">You can save as many entries as you like on the same day.</p></div><textarea value={description} onChange={(event) => setDescription(event.target.value)} required placeholder="I tried…" /><div className="challenge-controls"><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><button disabled={saving}>{saving ? 'Saving…' : 'Add discovery ✦'}</button></div></form>
    {message && <p className="notice" role="status">{message}</p>}
    <section className="dashboard-columns challenge-columns"><article className="panel"><p className="eyebrow">TODAY’S LIST</p><h2>{today.length ? 'Keep the momentum' : 'Your day is open'}</h2><ul className="discovery-list">{today.length ? today.map((entry) => <li key={entry.id}><span className="discovery-icon">✦</span><div><strong>{entry.description}</strong><small>{label(entry.category)}</small></div></li>) : <li className="empty-discovery">Your first discovery of the day will land here.</li>}</ul></article><article className="panel"><p className="eyebrow">YOUR MIX</p><h2>Explore widely</h2><ul className="distribution-list">{data.distribution.length ? data.distribution.map((item) => <li key={item.category}><span>{label(item.category)}</span><div><i style={{ width: `${item.percentage}%` }} /></div><strong>{item.count}</strong></li>) : <li className="empty-discovery">Your categories will appear here.</li>}</ul></article></section>
    <section className="panel discovery-history"><p className="eyebrow">DISCOVERY TRAIL</p><h2>Everything you’ve tried</h2><ul className="discovery-list">{data.entries.length ? data.entries.map((entry) => <li key={entry.id}><span className="discovery-day">{entry.dayNumber}</span><div><strong>{entry.description}</strong><small>{entry.date} · {label(entry.category)}</small></div></li>) : <li className="empty-discovery">Your challenge story starts with one small yes.</li>}</ul></section>
  </main>
}
