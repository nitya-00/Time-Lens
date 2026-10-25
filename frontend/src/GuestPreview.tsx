import { Link } from 'react-router-dom'

type GuestPreviewProps = {
  eyebrow: string
  title: string
  description: string
  points: string[]
  cta?: string
}

export function GuestPreview({ eyebrow, title, description, points, cta = 'Create your space' }: GuestPreviewProps) {
  return <main className="dashboard-shell guest-preview">
    <section className="guest-preview-card">
      <p className="eyebrow">{eyebrow}</p>
      <p className="guest-preview-audience">For students, coders, and self-directed builders</p>
      <h1>{title}</h1>
      <p className="quiet">{description}</p>
      <ul>{points.map(point => <li key={point}>{point}</li>)}</ul>
      <section className="guest-preview-glimpse" aria-label="Example TimeLens views">
        <span><small>Today</small><b>Focused hours</b></span>
        <span><small>Patterns</small><b>Best focus window</b></span>
        <span><small>Progress</small><b>Small wins, counted</b></span>
      </section>
      <Link className="guest-preview-action" to="/auth">{cta} <span>→</span></Link>
      <p className="guest-preview-note">See where your time goes. Shape where it goes next.</p>
    </section>
  </main>
}
