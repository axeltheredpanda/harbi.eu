import Script from "next/script";

/**
 * Privacy-friendly pageview analytics (Umami).
 * Only loads when NEXT_PUBLIC_UMAMI_SCRIPT_URL + NEXT_PUBLIC_UMAMI_WEBSITE_ID are set.
 */
export function Analytics() {
  const scriptUrl = process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL;
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  if (!scriptUrl || !websiteId) return null;

  return (
    <Script
      async
      defer
      src={scriptUrl}
      data-website-id={websiteId}
      data-domains={process.env.NEXT_PUBLIC_UMAMI_DOMAINS}
    />
  );
}
