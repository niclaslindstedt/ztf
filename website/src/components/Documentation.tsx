import { Navigate, useParams } from "react-router-dom";
import { docs } from "../generated/sourceData";
import MarkdownRenderer from "./MarkdownRenderer";
import SidebarLayout from "./SidebarLayout";

export default function Documentation() {
  const { slug } = useParams<{ slug: string }>();
  const currentSlug = slug ?? docs[0].slug;
  const current = docs.find((d) => d.slug === currentSlug);

  if (!current) {
    return <Navigate to={`/docs/${docs[0].slug}`} replace />;
  }

  return (
    <SidebarLayout
      items={docs.map((d) => ({ slug: d.slug, title: d.title }))}
      currentSlug={currentSlug}
      basePath="/docs"
      label="Documentation"
    >
      <MarkdownRenderer content={current.content} basePath="/docs" />
    </SidebarLayout>
  );
}
