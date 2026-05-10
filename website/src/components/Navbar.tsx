import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { siteConfig } from "../seo/siteConfig";

export default function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isDocs = location.pathname.startsWith("/docs");
  const isManual = location.pathname.startsWith("/manual");
  const isSubPage = isDocs || isManual;

  useEffect(() => setOpen(false), [location.pathname]);

  // Anchor links go back to the landing page when we're on a sub-route.
  const sectionHref = (hash: string) => (isSubPage ? `/${hash}` : hash);

  const links = (
    <>
      <a
        href={sectionHref("#example")}
        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        Example
      </a>
      <a
        href={sectionHref("#features")}
        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        Features
      </a>
      <a
        href={sectionHref("#install")}
        className="text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        Install
      </a>
      <Link
        to="/docs"
        className={`text-sm transition-colors ${
          isDocs
            ? "text-accent"
            : "text-text-secondary hover:text-text-primary"
        }`}
      >
        Docs
      </Link>
      <Link
        to="/manual"
        className={`text-sm transition-colors ${
          isManual
            ? "text-accent"
            : "text-text-secondary hover:text-text-primary"
        }`}
      >
        Manual
      </Link>
    </>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link
          to="/"
          className="flex items-center gap-1.5 font-mono text-base font-bold tracking-tight text-text-primary"
        >
          <span className="text-accent">$</span> {siteConfig.name}
        </Link>

        <div className="hidden items-center gap-7 md:flex">{links}</div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen((v) => !v)}
            className="p-1 text-text-secondary hover:text-text-primary transition-colors md:hidden"
            aria-label="Toggle menu"
            type="button"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={
                  open
                    ? "M6 18L18 6M6 6l12 12"
                    : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>

          <a
            href={siteConfig.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border-strong px-3 py-1.5 text-sm text-text-secondary hover:border-accent hover:text-text-primary transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 top-[58px] z-40 bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-50 border-t border-border bg-surface/95 backdrop-blur-md px-6 py-4 md:hidden">
            <div
              className="flex flex-col gap-4"
              onClick={() => setOpen(false)}
            >
              {links}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
