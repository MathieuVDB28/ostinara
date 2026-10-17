import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
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
