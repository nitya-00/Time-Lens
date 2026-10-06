import { useEffect, useState } from 'react'
import { apiFetch, localDateInput } from './lib/api'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

type AnalyticsData = {
  days: number; loggedHours: number; totalSlots: number
  categories: Array<{ name: string; hours: number; percentage: number; previousHours: number; changePercentage: number | null }>
  hourly: Array<{ hour: string; focus: number; distractions: number }>
  planned: { total: number; completed: number; diverted: number; completionPercentage: number | null }
  distractions: Array<{ name: string; count: number }>
  studyBreakdown: Array<{ name: string; hours: number }>
  otherActivities: Array<{ name: string; hours: number }>
  phoneDistractions: number
}
const colors=['#6558c8','#50a889','#f0a03c','#6085e8','#dd6b75','#9b7be2','#4aa9b9','#c97954']
function PieCard({title,data}:{title:string;data:Array<{name:string;hours:number}>}){return <article className="panel pie-card"><p className="eyebrow">{title}</p>{data.length?<><div className="chart-wrap pie-wrap"><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={data} dataKey="hours" nameKey="name" innerRadius={0} outerRadius={84} paddingAngle={1}>{data.map((item,index)=><Cell key={item.name} fill={colors[index%colors.length]}/>)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><ul className="metric-list">{data.map((item,index)=><li key={item.name}><span><i className="legend-dot" style={{background:colors[index%colors.length]}}/> {item.name}</span><strong>{item.hours}h</strong></li>)}</ul></>:<p className="quiet">Nothing recorded here yet.</p>}</article>}

export default function Analytics() {
  const [days, setDays] = useState(7)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setData(null); setError(false)
    apiFetch(`/api/analytics/${days}?date=${localDateInput()}`).then(async (response) => {
      if (!response.ok) throw new Error('Analytics request failed')
      setData(await response.json() as AnalyticsData)
    }).catch(() => setError(true))
  }, [days])

  if (error) return <main className="dashboard-shell"><p className="notice">Unable to load analytics. Please refresh and try again.</p></main>
  if (!data) return <main className="dashboard-shell"><p className="quiet">Calculating your patterns…</p></main>
  return <main className="dashboard-shell">
    <header className="masthead"><div><p className="eyebrow">TIME LENS</p><h1>Patterns over time</h1></div><p className="quiet">Only recorded hours are included. Comparisons use the immediately preceding matching period.</p></header>
    <div className="period-tabs" role="tablist" aria-label="Analytics period">{[7, 15, 30].map((period) => <button key={period} role="tab" aria-selected={days === period} onClick={() => setDays(period)}>{period} days</button>)}</div>
    <p className="analytics-note">{data.loggedHours} of {data.totalSlots} possible hourly blocks have a category.</p>
    <section className="analytics-table panel"><h2>Where your time went</h2><table><thead><tr><th>Category</th><th>This period</th><th>Of period</th><th>Previous</th><th>Change</th></tr></thead><tbody>{data.categories.map((item) => <tr key={item.name}><th>{item.name}</th><td>{item.hours}h</td><td>{item.percentage}%</td><td>{item.previousHours}h</td><td>{item.changePercentage === null ? '—' : `${item.changePercentage > 0 ? '+' : ''}${item.changePercentage}%`}</td></tr>)}</tbody></table></section>
    <section className="dashboard-columns analytics-gap"><PieCard title="PLANNED VS ACTUAL" data={[{name:'Done as planned',hours:data.planned.completed},{name:'Changed course',hours:data.planned.diverted}].filter(item=>item.hours>0)}/><article className="panel"><p className="eyebrow">DISTRACTIONS</p><h2>Recorded interruptions</h2><p className="phone-callout"><strong>{data.phoneDistractions}</strong> phone interruptions</p>{data.distractions.length ? <ul className="metric-list">{data.distractions.map((item) => <li key={item.name}><span>{item.name}</span><strong>{item.count}</strong></li>)}</ul> : <p className="quiet">No distractions were recorded for this period.</p>}</article></section>
    <section className="panel chart-panel"><p className="eyebrow">HOURLY PATTERN</p><h2>Focus and distractions by hour</h2><div className="chart-wrap"><ResponsiveContainer width="100%" height={280}><BarChart data={data.hourly}><CartesianGrid strokeDasharray="3 3" stroke="#dce7e1" /><XAxis dataKey="hour" tick={{ fontSize: 11 }} interval={2} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="focus" name="Study / Work" fill="#426c60" radius={[3, 3, 0, 0]} /><Bar dataKey="distractions" name="Distractions" fill="#b5794f" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></section>
    <section className="dashboard-columns analytics-gap"><PieCard title="CATEGORY DISTRIBUTION" data={data.studyBreakdown}/><PieCard title="OTHER ACTIVITIES" data={data.otherActivities}/></section>
  </main>
}
