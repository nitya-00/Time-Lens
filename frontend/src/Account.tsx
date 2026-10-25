import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from './lib/api'

type ProductiveDayRule = { enabled: boolean; study: number; work: number; fun: number; health: number }
type Category = { id: string; name: string; group: string }
const emptyRule: ProductiveDayRule = { enabled: false, study: 0, work: 0, fun: 0, health: 0 }

export default function Account() {
  const [rule, setRule] = useState<ProductiveDayRule>(emptyRule)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [distractionOptions, setDistractionOptions] = useState<string[]>([])
  const [categoryName, setCategoryName] = useState('')
  const [distractionName, setDistractionName] = useState('')
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()
  useEffect(() => {
    apiFetch('/api/auth/account').then(async response => {
      if (response.status === 401) { nav('/auth'); return }
      if (!response.ok) throw new Error()
      const account = await response.json() as { displayName: string; productiveDayRule: ProductiveDayRule; categories: Category[]; distractionOptions: string[] }
      setName(account.displayName); setRule(account.productiveDayRule); setCategories(account.categories); setDistractionOptions(account.distractionOptions)
    }).catch(() => setMessage('Unable to load your account settings.')).finally(() => setLoading(false))
  }, [nav])
  function update(key: keyof Omit<ProductiveDayRule, 'enabled'>, value: string) { setRule(current => ({ ...current, [key]: Math.max(0, Math.min(24, Number(value) || 0)) })) }
  async function save(event: FormEvent) {
    event.preventDefault(); setMessage('')
    const response = await apiFetch('/api/auth/account/productive-day', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rule) })
    if (!response.ok) { const body = await response.json().catch(() => null) as { message?: string } | null; setMessage(body?.message ?? 'Unable to save this experiment.'); return }
    setMessage('Your productive-day experiment is ready.')
  }
  async function addCategory(event: FormEvent) {
    event.preventDefault(); if (!categoryName.trim()) return
    const response = await apiFetch('/api/auth/account/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: categoryName, group: 'OTHER' }) })
    const body = await response.json().catch(() => null) as { category?: Category; message?: string } | null
    if (!response.ok || !body?.category) { setMessage(body?.message ?? 'Unable to add category.'); return }
    setCategories(current => [...current, body.category!]); setCategoryName('')
  }
  async function removeCategory(id: string) {
    const response = await apiFetch(`/api/auth/account/categories/${id}`, { method: 'DELETE' })
    if (!response.ok) { const body = await response.json().catch(() => null) as { message?: string } | null; setMessage(body?.message ?? 'Unable to remove category.'); return }
    setCategories(current => current.filter(category => category.id !== id))
  }
  async function saveDistractions(next: string[]) {
    const response = await apiFetch('/api/auth/account/distractions', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ options: next }) })
    if (!response.ok) { setMessage('Unable to save distraction options.'); return }
    setDistractionOptions(next)
  }
  function addDistraction(event: FormEvent) {
    event.preventDefault(); const value = distractionName.trim()
    if (!value || distractionOptions.some(option => option.toLowerCase() === value.toLowerCase())) return
    void saveDistractions([...distractionOptions, value]); setDistractionName('')
  }
  if (loading) return <main className="dashboard-shell"><p className="quiet">Loading your account…</p></main>
  return <main className="dashboard-shell account-page"><header className="masthead"><div><p className="eyebrow">ACCOUNT</p><h1>Your experiments</h1><p className="quiet">Shape the rules that fit your real life{name ? ', ' + name : ''}.</p></div></header><form className="panel productive-rule-form" onSubmit={save}><div className="productive-rule-heading"><div><p className="eyebrow">OPTIONAL EXPERIMENT</p><h2>What counts as a productive day?</h2><p className="quiet">Choose the hours that feel meaningful to you. TimeLens will calculate this automatically from your daily log.</p></div><label className="switch"><input type="checkbox" checked={rule.enabled} onChange={event => setRule(current => ({ ...current, enabled: event.target.checked }))} /><span>Use this experiment</span></label></div><div className="productive-rule-inputs"><label>Study hours<input type="number" min="0" max="24" step="0.5" value={rule.study} onChange={event => update('study', event.target.value)} disabled={!rule.enabled} /></label><label>Work hours<input type="number" min="0" max="24" step="0.5" value={rule.work} onChange={event => update('work', event.target.value)} disabled={!rule.enabled} /></label><label>Fun hours<input type="number" min="0" max="24" step="0.5" value={rule.fun} onChange={event => update('fun', event.target.value)} disabled={!rule.enabled} /></label><label>Health hours<input type="number" min="0" max="24" step="0.5" value={rule.health} onChange={event => update('health', event.target.value)} disabled={!rule.enabled} /></label></div><p className="quiet">Example: 2 hours each of study, work, fun, and health.</p><button disabled={!rule.enabled}>Save productive-day rule</button></form><section className="panel preference-editor"><p className="eyebrow">YOUR DAILY LOG</p><h2>Your categories</h2><p className="quiet">These appear in your category and planned-task menus, plus your dashboard.</p><div className="preference-chips">{categories.map(category => <span key={category.id}>{category.name}<button type="button" onClick={() => void removeCategory(category.id)} aria-label={`Remove ${category.name}`}>×</button></span>)}</div><form className="add-preference" onSubmit={addCategory}><input value={categoryName} maxLength={40} onChange={event => setCategoryName(event.target.value)} placeholder="Add a category" /><button>Add</button></form></section><section className="panel preference-editor"><p className="eyebrow">YOUR DAILY LOG</p><h2>Your distraction options</h2><p className="quiet">Keep only the interruptions you actually want to notice.</p><div className="preference-chips">{distractionOptions.map(option => <span key={option}>{option}<button type="button" onClick={() => void saveDistractions(distractionOptions.filter(item => item !== option))} aria-label={`Remove ${option}`}>×</button></span>)}</div><form className="add-preference" onSubmit={addDistraction}><input value={distractionName} maxLength={40} onChange={event => setDistractionName(event.target.value)} placeholder="Add an interruption" /><button>Add</button></form>{message && <p className="notice" role="status">{message}</p>}</section></main>
}
