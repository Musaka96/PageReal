"use client";

import { buildReconciliationPdf } from "@/lib/pdf";
import type { ReconciliationResult } from "@/lib/types";

export function PdfExportButton({
  creatorName,
  source,
  result,
  auditChainHead,
  filename,
}: {
  creatorName: string;
  source: "demo" | "live";
  result: ReconciliationResult;
  auditChainHead: string | null;
  filename: string;
}) {
  function handleExport() {
    const doc = buildReconciliationPdf({ creatorName, source, result, auditChainHead });
    doc.save(filename);
  }

  return (
    <button
      onClick={handleExport}
      className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
    >
      Export PDF
    </button>
  );
}
