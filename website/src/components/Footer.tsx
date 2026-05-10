import { Link } from "react-router-dom";
import { lastUpdated, version } from "../generated/sourceData";
import { siteConfig } from "../seo/siteConfig";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export default function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 text-sm text-text-dim">
        <div className="font-mono">
          <span className="text-accent">$</span> {siteConfig.name}{" "}
          <span className="text-text-secondary">v{version}</span>{" "}
          <span className="text-text-dim">·</span> MIT{" "}
          <span className="text-text-dim">·</span> last updated{" "}
          <time dateTime={lastUpdated}>{formatDate(lastUpdated)}</time>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <a
            href={siteConfig.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            GitHub
          </a>
          <a
            href={siteConfig.cratesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            crates.io
          </a>
          <Link to="/docs" className="hover:text-text-primary transition-colors">
            Docs
          </Link>
          <Link to="/manual" className="hover:text-text-primary transition-colors">
            Manual
          </Link>
          <a
            href={`${siteConfig.repoUrl}/blob/main/CHANGELOG.md`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            Changelog
          </a>
          <a
            href={`${siteConfig.repoUrl}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-primary transition-colors"
          >
            License
          </a>
        </div>
      </div>
    </footer>
  );
}
