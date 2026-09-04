import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isPublicSite } from "@/lib/public/site";

/**
 * Refreshes the Supabase session on every request and keeps the product behind
 * a login. The tokenised client shortlist at /share/[token] is the single
 * public surface, and it reads through a SECURITY DEFINER function rather than
 * through any table the anonymous role can reach.
 */
// The tokenised client shortlist is the only surface reachable without a
// session. /auth was listed here for a callback route that does not exist, and
// an unused public prefix is an opening nobody is watching.
const PUBLIC_PREFIXES = ["/login", "/share"];

/**
 * The public showcase and the private product are the same codebase deployed
 * twice, told apart by one environment variable.
 *
 * On the public deployment the /public tree is served at the root and nothing
 * else is reachable — no sign-in, no admin, no compare, no shortlists. On the
 * private deployment the /public tree does not exist. Neither can be reached
 * from the other by editing a URL, and the private product is untouched by all
 * of it because the flag is off there.
 */
const PUBLIC_SITE_ROUTES: Record<string, string> = {
  "/": "/public",
  "/creators": "/public/creators",
  "/strategiser": "/public/strategiser",
};

function publicSiteResponse(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const mapped = PUBLIC_SITE_ROUTES[pathname];
  if (mapped) {
    const url = request.nextUrl.clone();
    url.pathname = mapped;
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/creators/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/public${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Anything else — the CMS, the login form, the compare tray's API, the
  // private tree itself — simply does not exist on this domain.
  const home = request.nextUrl.clone();
  home.pathname = "/";
  home.search = "";
  return NextResponse.redirect(home);
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // With no Supabase configured there is no database, no session and nothing
  // to authorise against. Every route is stopped here with a plain explanation
  // rather than allowed through to throw a 500 on each page. Nothing can leak:
  // there is no connection to leak from.
  if (!supabaseUrl || !supabaseAnonKey) {
    return new NextResponse(
      `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
        `<meta name="viewport" content="width=device-width,initial-scale=1">` +
        `<title>Talent Grid is not configured</title>` +
        `<style>body{margin:0;background:#FAFAF8;color:#141414;` +
        `font:16px/1.6 ui-sans-serif,system-ui,sans-serif;` +
        `display:grid;place-items:center;min-height:100dvh;padding:24px}` +
        `main{max-width:34rem}h1{font-family:ui-serif,Georgia,serif;font-weight:400;` +
        `font-size:28px;margin:0 0 12px}p{color:#6B6B68;margin:0 0 12px}` +
        `code{background:#E8E2DA;padding:2px 6px;border-radius:4px;font-size:14px}` +
        `</style></head><body><main>` +
        `<h1>Talent Grid is not configured</h1>` +
        `<p>This deployment has no Supabase project attached, so there is no ` +
        `database to read and no way to sign anyone in.</p>` +
        `<p>Set <code>NEXT_PUBLIC_SUPABASE_URL</code>, ` +
        `<code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and ` +
        `<code>SUPABASE_SERVICE_ROLE_KEY</code> in the project&rsquo;s environment ` +
        `variables, run the migrations against that project, and redeploy.</p>` +
        `</main></body></html>`,
      { status: 503, headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  if (isPublicSite()) {
    const publicResponse = publicSiteResponse(request);
    applySecurityHeaders(publicResponse.headers, true);
    return publicResponse;
  }

  // The private tree is not part of the private deployment's URL space either,
  // so the two cannot be confused if the flag is ever set wrongly.
  if (request.nextUrl.pathname.startsWith("/public")) {
    return new NextResponse("Not found", { status: 404 });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Return the person to where they were headed once they sign in.
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Security headers applied to every response this matcher sees.
  applySecurityHeaders(response.headers);
  return response;
}

/**
 * Headers that cost nothing and close whole classes of attack.
 *
 * The script policy still allows inline and eval because the App Router's
 * hydration payload needs both without a per-request nonce; the rest is as
 * tight as the app actually needs. frame-ancestors none is the one that
 * matters most here — it makes clickjacking the admin screens impossible.
 */
function applySecurityHeaders(headers: Headers, indexable = false) {
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  );
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  // The private product and the CMS stay out of every index. The showcase is
  // the one deployment that is meant to be found.
  if (!indexable) headers.set("X-Robots-Tag", "noindex, nofollow");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
