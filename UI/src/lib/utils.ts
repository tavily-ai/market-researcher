import { clsx, type ClassValue } from "clsx";
import { jsPDF } from "jspdf";
import { twMerge } from "tailwind-merge";

import type { StockDigestResponse, StockReport } from "@/types/stock-digest";

/** Combine conditional Tailwind class names without leaving conflicting utilities. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const filenameDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "stock-digest"
    : `stock-digest-${date.toISOString().slice(0, 10)}`;
};

/** Create and download a concise, client-side PDF version of a stock digest. */
export async function generateStockDigestPDF(digest: StockDigestResponse) {
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const width = pdf.internal.pageSize.getWidth() - margin * 2;
  const bottom = pdf.internal.pageSize.getHeight() - margin;
  let y = margin;

  const ensureSpace = (height: number) => {
    if (y + height > bottom) {
      pdf.addPage();
      y = margin;
    }
  };

  const text = (value: string, size = 10, style: "normal" | "bold" = "normal") => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(value || "—", width) as string[];
    const lineHeight = size * 1.35;
    lines.forEach((line) => {
      ensureSpace(lineHeight);
      pdf.text(line, margin, y);
      y += lineHeight;
    });
  };

  const heading = (value: string, size = 16) => {
    ensureSpace(size * 1.8);
    text(value, size, "bold");
    y += 6;
  };

  heading("Stock Portfolio Digest", 22);
  text(`Generated ${new Date(digest.generated_at).toLocaleString()}`);
  y += 10;

  if (digest.market_overview) {
    heading("Market Overview");
    text(digest.market_overview);
    y += 10;
  }

  Object.entries(digest.reports).forEach(([ticker, report]) => {
    const stock = report as StockReport;
    heading(`${ticker} — ${stock.company_name || "Stock Report"}`, 18);
    const sections: Array<[string, string]> = [
      ["Summary", stock.summary],
      ["Current Performance", stock.current_performance],
      ["Recommendation", stock.recommendation],
      ["Risk Assessment", stock.risk_assessment],
      ["Price Outlook", stock.price_outlook],
    ];

    sections.forEach(([label, content]) => {
      if (!content) return;
      heading(label, 12);
      text(content);
      y += 6;
    });

    if (stock.key_insights?.length) {
      heading("Key Insights", 12);
      stock.key_insights.forEach((insight) => text(`• ${insight}`));
      y += 6;
    }

    if (stock.sources?.length) {
      heading("Sources", 12);
      stock.sources.forEach((source) => text(`• ${source.title || source.url}: ${source.url}`, 8));
    }
    y += 14;
  });

  pdf.save(`${filenameDate(digest.generated_at)}.pdf`);
}
