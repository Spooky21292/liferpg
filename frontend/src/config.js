const TUNNEL_HOST = 'https://e7e8dfb274b8-tunnel-lfcj6fgt.devinapps.com'
const TUNNEL_AUTH = 'Basic ' + btoa('user:77525a71a8d9f8b9152dc53178739cb9')

export const isNative = typeof window !== 'undefined' && (
  window.Capacitor?.isNativePlatform?.() ||
  navigator.userAgent.includes('Electron') ||
  !window.location.hostname
)

export const API = isNative ? `${TUNNEL_HOST}/api` : '/api'

const originalFetch = window.fetch.bind(window)

window.fetch = (url, options = {}) => {
  if (typeof url === 'string' && url.startsWith(TUNNEL_HOST)) {
    options.headers = {
      ...(options.headers || {}),
      'Authorization': TUNNEL_AUTH,
    }
  }
  return originalFetch(url, options)
}
