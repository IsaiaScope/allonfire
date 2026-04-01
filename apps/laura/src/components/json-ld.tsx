type JsonLdProps = {
  baseUrl: string;
  locale: string;
  siteName: string;
  description: string;
};

export function JsonLd({
  baseUrl,
  locale,
  siteName,
  description,
}: JsonLdProps) {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: baseUrl,
    description,
    inLanguage: locale === "it" ? "it-IT" : "en-US",
  };

  const webAppSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteName,
    url: baseUrl,
    applicationCategory: "EntertainmentApplication",
    operatingSystem: "Any",
    description,
    featureList: ["Photo Gallery", "Memory Game", "Quiz Game", "Leaderboards"],
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
    },
  };

  return (
    <>
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires innerHTML; data is from static objects
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        type="application/ld+json"
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD requires innerHTML; data is from static objects
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
        type="application/ld+json"
      />
    </>
  );
}
