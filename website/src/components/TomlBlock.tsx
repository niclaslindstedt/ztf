import type { ReactNode } from "react";

// Minimal TOML highlighter — small enough to ship inline. Tokenizes by line:
// comments, section headers, key/value pairs, strings, numbers. Triple-quoted
// strings are not coloured (we render them as plain text inside the token
// stream) but still display correctly.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightLine(line: string): string {
  if (/^\s*#/.test(line)) {
    return `<span class="tok-comment">${escapeHtml(line)}</span>`;
  }
  const sectionMatch = line.match(/^(\s*)(\[\[?[^\]]+\]\]?)(\s*)$/);
  if (sectionMatch) {
    return `${sectionMatch[1]}<span class="tok-section">${escapeHtml(
      sectionMatch[2],
    )}</span>${sectionMatch[3]}`;
  }
  const kv = line.match(/^(\s*)([A-Za-z_][\w-]*)(\s*=\s*)(.*)$/);
  if (kv) {
    const [, indent, key, eq, rest] = kv;
    let value = escapeHtml(rest);
    value = value.replace(
      /(&#39;&#39;&#39;[\s\S]*?&#39;&#39;&#39;|&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g,
      '<span class="tok-string">$1</span>',
    );
    value = value.replace(
      /\b(-?\d+(?:\.\d+)?)\b/g,
      '<span class="tok-num">$1</span>',
    );
    return `${indent}<span class="tok-key">${escapeHtml(
      key,
    )}</span>${escapeHtml(eq)}${value}`;
  }
  return escapeHtml(line);
}

export function highlightToml(source: string): string {
  return source.split("\n").map(highlightLine).join("\n");
}

export default function TomlBlock({
  source,
  filename,
  actions,
}: {
  source: string;
  filename?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-code">
      {filename && (
        <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-2 font-mono text-xs text-text-secondary">
          <span className="flex items-center gap-3">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
              <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
            </span>
            {filename}
          </span>
          {actions}
        </div>
      )}
      <pre className="m-0 overflow-x-auto p-4 text-[0.85rem] leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: highlightToml(source) }} />
      </pre>
    </div>
  );
}
