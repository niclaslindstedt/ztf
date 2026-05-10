import { Navigate, useParams } from "react-router-dom";
import { manpages } from "../generated/sourceData";
import MarkdownRenderer from "./MarkdownRenderer";
import SidebarLayout from "./SidebarLayout";

export default function Manual() {
  const { slug } = useParams<{ slug: string }>();
  const currentSlug = slug ?? manpages[0].slug;
  const current = manpages.find((m) => m.slug === currentSlug);

  if (!current) {
    return <Navigate to={`/manual/${manpages[0].slug}`} replace />;
  }

  return (
    <SidebarLayout
      items={manpages.map((m) => ({ slug: m.slug, title: m.title }))}
      currentSlug={currentSlug}
      basePath="/manual"
      label="Manual"
    >
      <MarkdownRenderer content={current.content} basePath="/manual" />
    </SidebarLayout>
  );
}
