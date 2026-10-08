import type { MetadataRoute } from "next";
import { sections } from "./data";
import { routing } from "../i18n/routing";
import { siteUrl } from "./seo";

const publicPaths = [
  "",
  ...sections.flatMap((section) => [
    `section/${section.slug}`,
    ...section.links.map((link) => `section/${section.slug}/${link.slug}`),
  ]),
];

function localizedUrl(locale: string, path: string) {
  return `${siteUrl}/${locale}${path ? `/${path}` : ""}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: localizedUrl(locale, path),
      changeFrequency: path ? ("monthly" as const) : ("weekly" as const),
      priority: path ? 0.7 : 1,
      alternates: {
        languages: {
          ...Object.fromEntries(
            routing.locales.map((code) => [code, localizedUrl(code, path)]),
          ),
          "x-default": localizedUrl(routing.defaultLocale, path),
        },
      },
    })),
  );
}
