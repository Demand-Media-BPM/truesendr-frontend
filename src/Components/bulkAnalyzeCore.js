// src/Components/bulkAnalyzeCore.js
//
// Shared, dependency-free email analysis used by:
//   - bulkAnalyze.worker.js (CSV / XLSX uploads, runs off the main thread)
//   - BulkValidator.js      (Copy & Paste modal summary)
//
// IMPORTANT: this intentionally mirrors `analyzeRows()` in
// backend/routes/bulkValidator.js so the numbers shown on the left panel
// match the report shown after "Verify". If one changes, change the other.
//   - same EMAIL_RE
//   - same normalization (trim + lowercase)
//   - an empty email cell counts as "empty / junk"
//   - invalid format and duplicates are counted exactly like the backend

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function createEmailAnalyzer() {
  const seenEmails = new Set();
  const seenDomains = new Set();

  let totalEmails = 0; // non-empty email cells
  let emptyOrJunk = 0;
  let invalidFormat = 0;
  let duplicates = 0;

  return {
    add(raw) {
      const value = String(raw ?? "").trim();

      if (!value) {
        emptyOrJunk++;
        return;
      }

      totalEmails++;

      const email = value.toLowerCase();

      if (!EMAIL_RE.test(email)) {
        invalidFormat++;
        return;
      }

      if (seenEmails.has(email)) {
        duplicates++;
        return;
      }

      seenEmails.add(email);
      seenDomains.add(email.slice(email.lastIndexOf("@") + 1));
    },

    result() {
      return {
        totalEmails,
        emptyOrJunk,
        invalidFormat,
        duplicates,
        uniqueEmails: seenEmails.size,
        uniqueDomains: seenDomains.size,
      };
    },
  };
}

// Same rule as backend detectEmailCol(): exact "email" first, then any header
// that contains "email". Returns -1 when nothing matches.
export function findEmailColumnIndex(headers) {
  const names = (headers || []).map((h) =>
    String(h ?? "")
      .trim()
      .toLowerCase(),
  );

  const exact = names.findIndex((n) => n === "email");
  if (exact >= 0) return exact;

  return names.findIndex((n) => n.includes("email"));
}
