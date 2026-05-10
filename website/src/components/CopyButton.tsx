import { useState } from "react";

export default function CopyButton({
  text,
  className = "",
  label = "copy",
}: {
  text: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // user can still select manually
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-transparent px-2 py-1 font-mono text-xs text-text-secondary transition-colors hover:border-accent hover:text-text-primary ${className}`}
    >
      {copied ? "copied" : label}
    </button>
  );
}
