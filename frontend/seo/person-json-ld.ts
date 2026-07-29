const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://harbi.eu";

/** Person schema for Google name search / knowledge panel signals. */
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Arthur Reichard",
    url: SITE_URL,
    email: "arthur.reichard@essec.edu",
    jobTitle: "Digital Web & E-Commerce Officer",
    worksFor: {
      "@type": "Organization",
      name: "Rémy Cointreau",
    },
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: "ESSEC Business School",
    },
    sameAs: [
      "https://github.com/axeltheredpanda",
      "https://www.linkedin.com/in/arthur-reichard/",
    ],
  };
}
