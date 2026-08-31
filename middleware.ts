import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase session on every request and keeps the product behind
 * a login. The tokenised client shortlist at /share/[token] is the single
 * public surface, and it reads through a SECURITY DEFINER function rather than
 * through any table the anonymous role can reach.
 */
const PUBLIC_PREFIXES = ["/login", "/share", "/auth"];

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

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
