import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from './lib/api'

type ProductiveDayRule = { enabled: boolean; study: number; work: number; fun: number; health: number }
const emptyRule: ProductiveDayRule = { enabled: false, study: 0, work: 0, fun: 0, health: 0 }

export default function Account() {
  const [rule, setRule] = useState<ProductiveDayRule>(emptyRule)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()
  useEffect(() => {
    apiFetch('/api/auth/account').then(async response => {
      if (response.status === 401) { nav('/auth'); return }
      if (!response.ok) throw new Error()
      const account = await response.json() as { displayName: string; productiveDayRule: ProductiveDayRule }
      setName(account.displayName); setRule(account.productiveDayRule)
    }).catch(() => setMessage('Unable to load your account settings.')).finally(() => setLoading(false))
  }, [nav])
  function update(key: keyof Omit<ProductiveDayRule, 'enabled'>, value: string) { setRule(current => ({ ...current, [key]: Math.max(0, Math.min(24, Number(value) || 0)) })) }
  async function save(event: FormEvent) {
    event.preventDefault(); setMessage('')
    const response = await apiFetch('/api/auth/account/productive-day', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rule) })
    if (!response.ok) { const body = await response.json().catch(() => null) as { message?: string } | null; setMessage(body?.message ?? 'Unable to save this experiment.'); return }
    setMessage('Your productive-day experiment is ready.')
  }
  if (loading) return <main className="dashboard-shell"><p className="quiet">Loading your account…</p></main>
  return <main className="dashboard-shell account-page"><header className="masthead"><div><p className="eyebrow">ACCOUNT</p><h1>Your experiments</h1><p className="quiet">Shape the rules that fit your real life{name ? ', ' + name : ''}.</p></div></header><form className="panel productive-rule-form" onSubmit={save}><div className="productive-rule-heading"><div><p className="eyebrow">OPTIONAL EXPERIMENT</p><h2>What counts as a productive day?</h2><p className="quiet">Choose the hours that feel meaningful to you. TimeLens will calculate this automatically from your daily log.</p></div><label className="switch"><input type="checkbox" checked={rule.enabled} onChange={event => setRule(current => ({ ...current, enabled: event.target.checked }))} /><span>Use this experiment</span></label></div><div className="productive-rule-inputs"><label>Study hours<input type="number" min="0" max="24" step="0.5" value={rule.study} onChange={event => update('study', event.target.value)} disabled={!rule.enabled} /></label><label>Work hours<input type="number" min="0" max="24" step="0.5" value={rule.work} onChange={event => update('work', event.target.value)} disabled={!rule.enabled} /></label><label>Fun hours<input type="number" min="0" max="24" step="0.5" value={rule.fun} onChange={event => update('fun', event.target.value)} disabled={!rule.enabled} /></label><label>Health hours<input type="number" min="0" max="24" step="0.5" value={rule.health} onChange={event => update('health', event.target.value)} disabled={!rule.enabled} /></label></div><p className="quiet">Example: 2 hours each of study, work, fun, and health.</p><button disabled={!rule.enabled}>Save productive-day rule</button>{message && <p className="notice" role="status">{message}</p>}</form></main>
}
