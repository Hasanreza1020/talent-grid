/**
 * Whether this deployment is the public showcase or the private product.
 *
 * One codebase, two Vercel projects, two domains. The flag is off unless a
 * deployment sets it, so the existing product is unaffected by everything in
 * the public tree — and a mistake in the public site cannot expose the private
 * one, because they are separate deployments with separate environments.
 */
export function isPublicSite(): boolean {
  return process.env.NEXT_PUBLIC_GRID_PUBLIC_SITE === "1";
}
