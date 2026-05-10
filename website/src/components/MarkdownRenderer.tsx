import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import type { Components } from "react-markdown";
import type { ReactNode } from "react";

interface Props {
  content: string;
  basePath: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractText(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractText((children as { props: { children: ReactNode } }).props.children);
  }
  return String(children ?? "");
}

function heading(Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") {
  return function HeadingComponent({ children }: { children?: ReactNode }) {
    const id = slugify(extractText(children));
    return <Tag id={id}>{children}</Tag>;
  };
}

function makeComponents(basePath: string): Components {
  return {
    h1: heading("h1"),
    h2: heading("h2"),
    h3: heading("h3"),
    h4: heading("h4"),
    h5: heading("h5"),
    h6: heading("h6"),
    a({ href, children }) {
      // Cross-references between docs/manpages — `foo.md` becomes `<base>/foo`.
      if (href && href.endsWith(".md") && !href.startsWith("http")) {
        const slug = href.replace(/^\.\//, "").replace(/\.md$/, "");
        // Handle `../docs/foo.md` style links inside man/*.md.
        let target = slug;
        let resolvedBase = basePath;
        if (slug.startsWith("../docs/")) {
          target = slug.replace(/^\.\.\/docs\//, "");
          resolvedBase = "/docs";
        } else if (slug.startsWith("../man/")) {
          target = slug.replace(/^\.\.\/man\//, "");
          resolvedBase = "/manual";
        }
        return (
          <Link
            to={`${resolvedBase}/${target}`}
            className="text-accent hover:text-accent-strong underline underline-offset-2"
          >
            {children}
          </Link>
        );
      }
      const isExternal =
        href && (href.startsWith("http://") || href.startsWith("https://"));
      return (
        <a
          href={href}
          className="text-accent hover:text-accent-strong underline underline-offset-2"
          {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {children}
        </a>
      );
    },
  };
}

export default function MarkdownRenderer({ content, basePath }: Props) {
  return (
    <div className="markdown-content">
      <Markdown remarkPlugins={[remarkGfm]} components={makeComponents(basePath)}>
        {content}
      </Markdown>
    </div>
  );
}
