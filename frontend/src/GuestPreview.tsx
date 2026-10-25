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
      <h1>{title}</h1>
      <p className="quiet">{description}</p>
      <Link className="guest-preview-action" to="/auth">{cta} <span>→</span></Link>
    </section>
  </main>
}
