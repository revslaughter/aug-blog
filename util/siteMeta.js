// Central site metadata — single source of truth for SEO, Open Graph,
// and structured data. Update here, not in individual pages.

export const SITE_URL = "https://www.antiochurbangrowers.com";
export const SITE_NAME = "Antioch Urban Growers";
export const DEFAULT_DESCRIPTION =
  "Antioch Urban Growers — a Kansas City urban farm taking over the world one back yard at a time. Fresh local produce, events, and education.";

// Default social-share image (absolute URL required by Open Graph).
export const DEFAULT_OG_IMAGE = `${SITE_URL}/AUG-logo-transparent-background-1.png`;

export const ORGANIZATION = {
	name: SITE_NAME,
	telephone: "+18166994953",
	email: null,
	address: {
		street: "2727 NE 44th St",
		city: "Kansas City",
		region: "MO",
		postalCode: "64117",
		country: "US",
	},
	geo: {
		latitude: 39.1736056,
		longitude: -94.5478212,
	},
	sameAs: ["https://www.facebook.com/antiochurbangrowers"],
	storeUrl: "https://antiochurbang.square.site",
};
