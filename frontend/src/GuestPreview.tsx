import { Link } from 'react-router-dom'

type GuestPreviewProps = {
  eyebrow: string
  title: string
  description: string
  points: string[]
}

export function GuestPreview({ eyebrow, title, description, points }: GuestPreviewProps) {
  return <main className="dashboard-shell guest-preview">
    <section className="guest-preview-card">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="quiet">{description}</p>
      <ul>{points.map(point => <li key={point}>{point}</li>)}</ul>
      <Link className="guest-preview-action" to="/auth">Create your private space <span>→</span></Link>
      <p className="guest-preview-note">Your details stay private until you choose to create an account.</p>
    </section>
  </main>
}
