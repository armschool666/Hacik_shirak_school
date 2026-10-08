import { notFound } from "next/navigation";
import { Link } from "../../../../../i18n/navigation";
import { SiteShell } from "../../../../components";
import { sections } from "../../../../data";
import { UserMaterials } from "../../../../user-materials";

export function generateStaticParams() {
  return sections.flatMap((section) =>
    section.links.map((link) => ({
      slug: section.slug,
      childSlug: link.slug,
    })),
  );
}

export default async function ChildSectionPage({
  params,
}: {
  params: Promise<{ slug: string; childSlug: string; locale: string }>;
}) {
  const { slug, childSlug } = await params;
  const section = sections.find((item) => item.slug === slug);
  const page = section?.links.find((item) => item.slug === childSlug);

  if (!section || !page) {
    notFound();
  }

  const noImage = section.slug === "about";

  return (
    <SiteShell>
      <section className={noImage ? "subhero subhero--compact" : "subhero"}>
        {!noImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={section.image} alt={page.title} loading="lazy" />
        )}
        <div>
          <Link href={`/section/${section.slug}`}>{section.title}</Link>
          <h1>{page.title}</h1>
          <p>{page.body}</p>
        </div>
      </section>

      <UserMaterials sectionSlug={section.slug} pageSlug={page.slug} />
    </SiteShell>
  );
}
