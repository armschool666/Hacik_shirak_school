import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "../../i18n/routing";
import { schoolConfig, type SchoolLocale } from "../../school.config";
import { schoolStructuredData, siteUrl } from "../seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "layout" });
  const safeLocale = (routing.locales as readonly string[]).includes(locale)
    ? (locale as SchoolLocale)
    : routing.defaultLocale;
  const title = `${schoolConfig.name[safeLocale]} | ${t("titleSuffix")}`;
  const description = t("description");

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: schoolConfig.name[safeLocale],
      title,
      description,
      locale: safeLocale === "hy" ? "hy_AM" : safeLocale === "ru" ? "ru_RU" : "en_US",
      images: [{ url: schoolConfig.assets.logo, alt: schoolConfig.name[safeLocale] }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [schoolConfig.assets.logo],
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const messages = await getMessages();
  const structuredData = schoolStructuredData(locale as SchoolLocale);

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
