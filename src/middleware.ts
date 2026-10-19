import { type NextRequest, type NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from '@/i18n/config'
import { detectLocale } from '@/i18n/detect'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  return withLocaleCookie(request, response)
}

/**
 * Premiere visite : on fige la langue detectee (pays de l'IP, puis langue
 * du navigateur) dans un cookie. Les visites suivantes le lisent tel quel,
 * et le choix fait dans Reglages le remplace.
 */
function withLocaleCookie(request: NextRequest, response: NextResponse) {
  if (isLocale(request.cookies.get(LOCALE_COOKIE)?.value)) return response
  response.cookies.set(LOCALE_COOKIE, detectLocale(request.headers), {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax',
  })
  return response
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico (favicon)
     * - images publiques
     * - fichiers publics du PWA et des robots (sw.js, workbox, manifest,
     *   robots.txt) : redirige vers /login, un visiteur sans session ne
     *   pouvait ni enregistrer le service worker ni installer l'app
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|json|txt|xml)$).*)',
  ],
}
