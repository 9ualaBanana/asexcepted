/**
 * Vercel [Deployment Protection] blocks anonymous loads of preview URLs. Third-party
 * iframes (e.g. Notion) cannot send Vercel auth cookies, which often surfaces as
 * "refused to connect". When Protection Bypass for Automation is enabled, Vercel
 * injects `VERCEL_AUTOMATION_BYPASS_SECRET`; appending it per their docs allows
 * iframe loads without weakening production links we mint from production.
 *
 * @see https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
 */
export function withVercelDeploymentProtectionBypassForEmbed(
  absoluteUrl: string,
): string {
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (!bypass) return absoluteUrl;

  const forceRaw = process.env.EMBED_VERCEL_BYPASS?.trim().toLowerCase();
  const force = forceRaw === "1" || forceRaw === "true" || forceRaw === "yes";
  const onPreview = process.env.VERCEL_ENV === "preview";
  if (!onPreview && !force) return absoluteUrl;

  let u: URL;
  try {
    u = new URL(absoluteUrl);
  } catch {
    return absoluteUrl;
  }

  u.searchParams.set("x-vercel-protection-bypass", bypass);
  // Lets the document response set a SameSite=None bypass cookie so `/_next/*` loads work inside iframes.
  u.searchParams.set("x-vercel-set-bypass-cookie", "samesitenone");
  return u.toString();
}
