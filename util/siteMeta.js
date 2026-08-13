// Central site metadata — single source of truth for SEO, Open Graph,
// and structured data. Update here, not in individual pages.

export const SITE_URL = "https://www.antiochurbangrowers.com";
export const SITE_NAME = "Antioch Urban Growers";
export const DEFAULT_DESCRIPTION =
  "Antioch Urban Growers — a Kansas City urban farm taking over the world one back yard at a time. Fresh local produce, events, and education.";

// Default social-share image (absolute URL required by Open Graph).
export const DEFAULT_OG_IMAGE = `${SITE_URL}/AUG-logo-transparent-background-1.png`;

const FACEBOOK_URL = "https://www.facebook.com/antiochurbangrowers";

export const ORGANIZATION = {
	name: SITE_NAME,
	// E.164 for tel: links and schema.org; telephoneDisplay is what humans read.
	telephone: "+18166994953",
	telephoneDisplay: "(816) 699-4953",
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
	mapsUrl:
		"https://www.google.com/maps/place/Antioch+Urban+Growers/@39.1736056,-94.5500099,17z/data=!4m13!1m7!3m6!1s0x87c0f9c3c2452193:0xcff71674a50bec0a!2s2727+NE+44th+St,+Kansas+City,+MO+64117!3b1!8m2!3d39.1735968!4d-94.5478165!3m4!1s0x87c0f9c3def32867:0xf72ad06e93249453!8m2!3d39.1736056!4d-94.5478212",
	facebookUrl: FACEBOOK_URL,
	sameAs: [FACEBOOK_URL],
	storeUrl: "https://antiochurbang.square.site",
};

/**
 * The address as it's written out on the page. Derived from the parts above
 * so the display string and the structured data can't disagree — issue #9 was
 * exactly that failure for the phone number, patched in one of its two copies.
 */
export const FORMATTED_ADDRESS = `${ORGANIZATION.address.street}, ${ORGANIZATION.address.city}, ${ORGANIZATION.address.region} ${ORGANIZATION.address.postalCode}`;
