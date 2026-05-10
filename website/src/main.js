import "./styles.css";
import sourceData from "./generated/sourceData.json";

function highlightToml(text) {
  // Minimal TOML highlighter: comments, sections, keys, strings, numbers.
  // Operate token-by-token after escaping HTML.
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = text.split("\n").map((line) => {
    if (/^\s*#/.test(line)) {
      return `<span class="tok-comment">${esc(line)}</span>`;
    }
    // section headers like [scenario.act] or [[scenario]]
    const sectionMatch = line.match(/^(\s*)(\[\[?[^\]]+\]\]?)(\s*)$/);
    if (sectionMatch) {
      return `${sectionMatch[1]}<span class="tok-section">${esc(
        sectionMatch[2],
      )}</span>${sectionMatch[3]}`;
    }
    // key = value
    const kv = line.match(/^(\s*)([A-Za-z_][\w-]*)(\s*=\s*)(.*)$/);
    if (kv) {
      const [, indent, key, eq, rest] = kv;
      let value = esc(rest);
      // strings (single or triple)
      value = value.replace(
        /(&#39;&#39;&#39;[\s\S]*?&#39;&#39;&#39;|&quot;[^&]*?&quot;|&#39;[^&]*?&#39;)/g,
        '<span class="tok-string">$1</span>',
      );
      // numbers
      value = value.replace(
        /\b(-?\d+(?:\.\d+)?)\b/g,
        '<span class="tok-num">$1</span>',
      );
      return `${indent}<span class="tok-key">${esc(
        key,
      )}</span>${esc(eq)}${value}`;
    }
    return esc(line);
  });
  return lines.join("\n");
}

function renderExample() {
  const el = document.getElementById("example-toml");
  if (!el) return;
  el.innerHTML = highlightToml(sourceData.exampleScenario);
}

function fillTemplates() {
  document.querySelectorAll("[data-version]").forEach((el) => {
    el.textContent = `v${sourceData.version}`;
  });
  document.querySelectorAll("[data-last-updated]").forEach((el) => {
    const d = new Date(sourceData.lastUpdated);
    if (Number.isNaN(d.getTime())) {
      el.textContent = sourceData.lastUpdated;
    } else {
      el.textContent = d.toISOString().slice(0, 10);
    }
  });
}

function wireCopyButtons() {
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = btn.getAttribute("data-copy");
      const node = target ? document.querySelector(target) : null;
      const text = node ? node.textContent : btn.dataset.text || "";
      try {
        await navigator.clipboard.writeText(text.trim());
        const original = btn.textContent;
        btn.textContent = "copied";
        setTimeout(() => {
          btn.textContent = original;
        }, 1200);
      } catch {
        // ignore — user can still select manually
      }
    });
  });
}

renderExample();
fillTemplates();
wireCopyButtons();
