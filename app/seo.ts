import { schoolConfig, type SchoolLocale } from "../school.config";

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.hatsikschool.am"
).replace(/\/$/, "");

export function schoolStructuredData(locale: SchoolLocale) {
  return {
    "@context": "https://schema.org",
    "@type": "School",
    name: schoolConfig.name[locale],
    url: `${siteUrl}/${locale}`,
    logo: `${siteUrl}${schoolConfig.assets.logo}`,
    email: schoolConfig.email,
    telephone: schoolConfig.phone.tel,
    address: {
      "@type": "PostalAddress",
      addressLocality: schoolConfig.address[locale],
      addressRegion: schoolConfig.region[locale],
      addressCountry: "AM",
    },
    sameAs: Object.values(schoolConfig.social).filter(Boolean),
  };
}
