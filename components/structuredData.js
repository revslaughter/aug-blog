import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, ORGANIZATION } from "../util/siteMeta";

/**
 * LocalBusiness structured data (JSON-LD) for the homepage. Helps search
 * engines surface the farm's address, phone, and social profiles in local
 * results and knowledge panels.
 */
export default function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE_NAME,
    url: SITE_URL,
    logo: DEFAULT_OG_IMAGE,
    image: DEFAULT_OG_IMAGE,
    telephone: ORGANIZATION.telephone,
    address: {
      "@type": "PostalAddress",
      streetAddress: ORGANIZATION.address.street,
      addressLocality: ORGANIZATION.address.city,
      addressRegion: ORGANIZATION.address.region,
      postalCode: ORGANIZATION.address.postalCode,
      addressCountry: ORGANIZATION.address.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: ORGANIZATION.geo.latitude,
      longitude: ORGANIZATION.geo.longitude,
    },
    sameAs: ORGANIZATION.sameAs,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
