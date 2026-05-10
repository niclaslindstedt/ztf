import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

interface Item {
  slug: string;
  title: string;
}

export default function SidebarLayout({
  items,
  currentSlug,
  basePath,
  label,
  children,
}: {
  items: Item[];
  currentSlug: string;
  basePath: string;
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Close mobile sidebar on slug change.
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [currentSlug]);

  const currentTitle = items.find((i) => i.slug === currentSlug)?.title ?? label;

  return (
    <div className="min-h-screen pt-[58px]">
      {/* Mobile section toggle */}
      <div className="sticky top-[58px] z-40 border-b border-border bg-surface/95 backdrop-blur-sm px-4 py-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={open ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
          <span className="font-mono text-xs uppercase tracking-wider text-text-dim">
            {label} /
          </span>
          {currentTitle}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="mx-auto flex max-w-7xl">
        <aside
          className={`
            fixed top-[103px] bottom-0 z-40 w-72 shrink-0 overflow-y-auto border-r border-border bg-surface px-4 py-6
            transition-transform duration-200 ease-in-out
            lg:sticky lg:top-[58px] lg:h-[calc(100vh-58px)] lg:w-64 lg:translate-x-0 lg:py-8
            ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}
        >
          <div className="mb-3 px-3 font-mono text-xs uppercase tracking-wider text-text-dim">
            {label}
          </div>
          <nav className="space-y-0.5">
            {items.map((it) => (
              <Link
                key={it.slug}
                to={`${basePath}/${it.slug}`}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  it.slug === currentSlug
                    ? "bg-accent-soft text-accent font-medium"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                }`}
              >
                {it.title}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-6 py-8 lg:px-12 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
