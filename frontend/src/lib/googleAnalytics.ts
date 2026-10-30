const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID
const debugMode = new URLSearchParams(window.location.search).get('ga_debug') === '1'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function trackPageView(path: string) {
  if (!measurementId || !window.gtag) return

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: document.title,
    debug_mode: debugMode,
  })
}
