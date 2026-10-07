/* eslint-disable no-restricted-globals */
// src/Components/bulkAnalyze.worker.js
//
// Thin Web Worker wrapper: parses a CSV / XLSX file OFF the main thread.
// The parsing itself lives in bulkAnalyzeFile.js (shared with the main-thread
// fallback in BulkValidator.js).
//
// In : { id, file }
// Out: { id, type: "result", stats }
//      { id, type: "error", hard, message, detail }

import { analyzeFile, describeAnalyzeError } from "./bulkAnalyzeFile";

self.onmessage = async (event) => {
  const { id, file } = event.data || {};

  try {
    const stats = await analyzeFile(file);
    self.postMessage({ id, type: "result", stats });
  } catch (err) {
    self.postMessage({ id, type: "error", ...describeAnalyzeError(err) });
  }
};
