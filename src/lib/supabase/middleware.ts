import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Prefixes accessibles sans session. Tout le reste est considere protege.
 *
 * On raisonne par liste blanche : l'ancienne liste noire enumerait
 * /library, /covers, /friends… et n'avait pas suivi la refonte des routes
 * (/biblio, /commu, /profil, /jouer), si bien qu'elle ne protegeait plus
 * rien. Les pages restaient couvertes par (main)/layout.tsx, mais le
 * middleware ne servait plus a rien.
 */
const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/cgu',
  '/mentions-legales',
  '/politique-confidentialite',
  '/auth',
]

const AUTH_ROUTES = ['/login', '/register']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  /**
   * getClaims() verifie la signature du JWT localement a partir du JWKS
   * (mis en cache), sans aller-retour reseau vers Supabase a chaque requete
   * comme le faisait getUser(). La verification reste cryptographique, donc
   * utilisable pour une decision d'autorisation — contrairement a
   * getSession(), qui se contente de lire le cookie.
   *
   * Si le projet signe encore en HS256, getClaims() retombe de lui-meme sur
   * getUser() : le comportement est alors identique a avant, jamais pire.
   */
  const { data } = await supabase.auth.getClaims()
  const isAuthenticated = Boolean(data?.claims?.sub)

  const pathname = request.nextUrl.pathname

  // Les routes API gerent elles-memes leur authentification et ne doivent
  // jamais etre redirigees : un webhook Stripe recevant une 307 vers /login
  // serait rejoue en boucle.
  if (pathname.startsWith('/api')) {
    return supabaseResponse
  }

  const isPublic =
    pathname === '/' ||
    PUBLIC_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
    )
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  if (!isPublic && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  if ((isAuthRoute || pathname === '/') && isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/jouer'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
