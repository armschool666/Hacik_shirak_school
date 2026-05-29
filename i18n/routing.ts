import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["hy", "ru", "en"],
  defaultLocale: "hy",
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
