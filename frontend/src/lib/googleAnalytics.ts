const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function initializeGoogleAnalytics() {
  if (!measurementId || window.gtag) return

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer ?? []
  window.gtag = (...args: unknown[]) => { window.dataLayer?.push(args) }
  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })
}

export function trackPageView(path: string) {
  if (!measurementId || !window.gtag) return

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: document.title,
  })
}
