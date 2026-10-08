import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "../i18n/navigation";
import type { Locale } from "../i18n/routing";
import { schoolConfig } from "../school.config";
import { LanguageSwitcher } from "./lang-switcher";
import { MobileMenu, type MobileNavItem } from "./mobile-menu";
import { HeaderScrollController } from "./header-scroll";

// Navigation structure — hrefs are locale-independent; labels come from messages
const NAV_ITEMS = [
  { key: "home", href: "/" },
  {
    key: "about",
    href: "/section/about",
    children: [
      { key: "aboutHistory", href: "/section/about/history" },
      { key: "aboutAchievements", href: "/section/about/achievements" },
      { key: "aboutAnnouncements", href: "/section/about/announcements" },
      { key: "aboutAdmission", href: "/section/about/admission" },
      { key: "aboutVacancies", href: "/section/about/vacancies" },
      { key: "aboutReports", href: "/section/about/reports" },
      { key: "aboutLicense", href: "/section/about/license" },
      { key: "aboutInternalEvaluation", href: "/section/about/evaluation" },
      { key: "aboutEvaluationPlan", href: "/section/about/evaluationPlan" },
    ],
  },
  {
    key: "councils",
    href: "/section/councils",
    children: [
      { key: "councilsJointManagement", href: "/section/councils/joint-management" },
      { key: "councilsPedagogical", href: "/section/councils/pedagogical" },
      { key: "councilsParent", href: "/section/councils/parent" },
      { key: "councilsStudent", href: "/section/councils/student" },
      { key: "councilsMethodological", href: "/section/councils/methodological" },
    ],
  },
  {
    key: "staff",
    href: "/section/staff",
    children: [
      { key: "staffLeadership", href: "/section/staff/leadership" },
      { key: "staffTeachers", href: "/section/staff/teachers" },
      { key: "staffQualification", href: "/section/staff/qualification" },
      { key: "staffResearch", href: "/section/staff/research" },
    ],
  },
  {
    key: "resources",
    href: "/section/resources",
    children: [
      { key: "resourcesClassrooms", href: "/section/resources/classrooms" },
      { key: "resourcesLaboratories", href: "/section/resources/laboratories" },
      { key: "resourcesComputerRoom", href: "/section/resources/computer-room" },
      { key: "resourcesGym", href: "/section/resources/gym" },
      { key: "resourcesMedicalRoom", href: "/section/resources/medical-room" },
      { key: "resourcesCafeteria", href: "/section/resources/cafeteria" },
    ],
  },
  {
    key: "learning",
    href: "/section/learning",
    children: [
      { key: "learningExams", href: "/section/learning/exams" },
      { key: "learningMaterials", href: "/section/learning/materials" },
      { key: "learningProjects", href: "/section/learning/projects" },
    ],
  },
  {
    key: "events",
    href: "/section/events",
    children: [
      { key: "eventsNews", href: "/section/events/news" },
      { key: "eventsEvents", href: "/section/events/events" },
    ],
  },
  {
    key: "students",
    href: "/section/students",
    children: [
      { key: "studentsAdvanced", href: "/section/students/advanced" },
      { key: "studentsAwardWinners", href: "/section/students/award-winners" },
      { key: "studentsAlumni", href: "/section/students/alumni" },
    ],
  },
  {
    key: "creativity",
    href: "/section/creativity",
    children: [
      { key: "creativityLiterature", href: "/section/creativity/literature" },
      { key: "creativityDrawing", href: "/section/creativity/drawing" },
      { key: "creativityPhotography", href: "/section/creativity/photography" },
      { key: "creativityHandmade", href: "/section/creativity/handmade" },
    ],
  },
  {
    key: "competitions",
    href: "/section/competitions",
    children: [
      { key: "competitionsOlympiads", href: "/section/competitions/olympiads" },
      { key: "competitionsEssays", href: "/section/competitions/essays" },
      { key: "competitionsQuizzes", href: "/section/competitions/quizzes" },
    ],
  },
  { key: "contact", href: "/section/contact" },
] as const;

const FOOTER_QUICK_LINKS = [
  "home",
  "about",
  "councils",
  "learning",
  "events",
  "contact",
] as const;

const NAV_HREF: Record<(typeof FOOTER_QUICK_LINKS)[number], string> = {
  home: "/",
  about: "/section/about",
  councils: "/section/councils",
  learning: "/section/learning",
  events: "/section/events",
  contact: "/section/contact",
};

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const schoolName = schoolConfig.name[locale];

  const navData: MobileNavItem[] = NAV_ITEMS.map((item) => ({
    key: item.key,
    href: item.href,
    label: t(`nav.${item.key}` as Parameters<typeof t>[0]),
    children: "children" in item
      ? item.children.map((child) => ({
          key: child.key,
          href: child.href,
          label: t(`nav.${child.key}` as Parameters<typeof t>[0]),
        }))
      : undefined,
  }));

  return (
    <>
      <HeaderScrollController />
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Image
              src={schoolConfig.assets.logo}
              alt=""
              width={44}
              height={44}
              priority
            />
          </span>
          <span>
            <strong>{schoolName}</strong>
          </span>
        </Link>
        <nav className="nav" aria-label={t("header.navAriaLabel")}>
          {NAV_ITEMS.map((item) => {
            const label = t(`nav.${item.key}` as Parameters<typeof t>[0]);
            const hasChildren = "children" in item && item.children.length > 0;
            return (
              <div className="nav-item" key={item.key}>
                <Link className="nav-link" href={item.href}>
                  {label}
                  {hasChildren ? <span className="nav-arrow">▾</span> : null}
                </Link>
                {hasChildren ? (
                  <div className="dropdown" aria-label={`${label} — ${t("header.submenu")}`}>
                    {"children" in item &&
                      item.children.map((child) => (
                        <Link key={child.href} href={child.href}>
                          {t(`nav.${child.key}` as Parameters<typeof t>[0])}
                        </Link>
                      ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="header-end">
          <LanguageSwitcher />
          <MobileMenu items={navData} />
        </div>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div className="footer-main">
          <div className="footer-col">
            <Link href="/" className="footer-brand">
              <span className="footer-brand-mark">
                <Image
                  src={schoolConfig.assets.logo}
                  alt=""
                  width={44}
                  height={44}
                />
              </span>
              <span>
                <span className="footer-brand-name">{schoolName}</span>
                <span className="footer-brand-region">
                  {schoolConfig.region[locale]}
                </span>
              </span>
            </Link>
            <p className="footer-description">{t("footer.description")}</p>
          </div>

          <div className="footer-col">
            <h3>{t("footer.quickLinks")}</h3>
            <ul className="footer-links">
              {FOOTER_QUICK_LINKS.map((key) => (
                <li key={key}>
                  <Link href={NAV_HREF[key]}>
                    {t(`nav.${key}` as Parameters<typeof t>[0])}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h3>{t("footer.contacts")}</h3>
            <div className="footer-contact">
              <div className="footer-contact-item">
                <span className="footer-contact-label">
                  {t("contact.addressLabel")}
                </span>
                <span className="footer-contact-value">
                  {schoolConfig.address[locale]}
                </span>
              </div>
              <div className="footer-contact-item">
                <span className="footer-contact-label">
                  {t("contact.phoneLabel")}
                </span>
                <a
                  href={`tel:${schoolConfig.phone.tel}`}
                  className="footer-contact-value"
                >
                  {schoolConfig.phone.display}
                </a>
              </div>
              <div className="footer-contact-item">
                <span className="footer-contact-label">
                  {t("contact.emailLabel")}
                </span>
                <a
                  href={`mailto:${schoolConfig.email}`}
                  className="footer-contact-value"
                >
                  {schoolConfig.email}
                </a>
              </div>
            </div>
          </div>

          <div className="footer-col">
            <h3>{t("footer.follow")}</h3>
            <div className="footer-social-row">
              {schoolConfig.social.facebook ? (
                <a
                  href={schoolConfig.social.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="footer-social-btn footer-social-btn--facebook"
                  aria-label={t("contact.facebookLabel")}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M22 12a10 10 0 1 0-11.56 9.87v-6.99H7.9V12h2.54v-2.2c0-2.5 1.49-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.88h-2.33v6.99A10 10 0 0 0 22 12z" />
                  </svg>
                </a>
              ) : null}
              {schoolConfig.social.youtube ? (
                <a
                  href={schoolConfig.social.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="footer-social-btn footer-social-btn--youtube"
                  aria-label={t("contact.youtubeLabel")}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.57 3.5 12 3.5 12 3.5s-7.57 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.13C4.43 20.5 12 20.5 12 20.5s7.57 0 9.38-.56a3.02 3.02 0 0 0 2.12-2.13A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.75 15.5V8.5l6.25 3.5-6.25 3.5z" />
                  </svg>
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-inner">
            <span>
              © {new Date().getFullYear()} {schoolName}. {t("footer.rights")}
            </span>
            <span className="footer-bottom-credits">
              Website by{" "}
              <a
                href="https://businessin.am/"
                target="_blank"
                rel="nofollow noreferrer"
              >
                BusinessIN
              </a>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
