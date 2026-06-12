import { Download } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DiagnosisResult, Locale } from "../lib/decisionTree";

interface PdfExportProps {
  result: DiagnosisResult;
  locale: Locale;
}

const text = {
  es: {
    button: "Descargar PDF",
    filename: "diagnostico-ai-act-jose-robles.pdf",
    title: "Diagnostico orientativo AI Act",
    classification: "Clasificacion",
    obligations: "Obligaciones aplicables",
    annex: "Encaje detectado",
    cta: "Reserva un diagnostico tecnico completo (1.500 EUR) con Jose Robles",
    footer: "jose@josediegorobles.com · https://calendly.com/josediegorobles",
    disclaimer:
      "Esta herramienta provee una clasificacion orientativa basada en el Reglamento (UE) 2024/1689 (AI Act). No constituye asesoramiento legal. Verifica con abogado especializado antes de tomar decisiones de cumplimiento."
  },
  en: {
    button: "Download PDF",
    filename: "ai-act-diagnosis-jose-robles.pdf",
    title: "Orientative AI Act diagnosis",
    classification: "Classification",
    obligations: "Applicable obligations",
    annex: "Detected scope",
    cta: "Book a complete technical diagnosis (EUR 1,500) with Jose Robles",
    footer: "jose@josediegorobles.com · https://calendly.com/josediegorobles",
    disclaimer:
      "This tool provides an orientative classification based on Regulation (EU) 2024/1689 (AI Act). It does not constitute legal advice. Verify with a specialised lawyer before making compliance decisions."
  }
} satisfies Record<Locale, Record<string, string>>;

export default function PdfExport({ result, locale }: PdfExportProps) {
  async function handleDownload() {
    const doc = await PDFDocument.create();
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const accent = rgb(0.06, 0.46, 0.43);
    const ink = rgb(0.08, 0.13, 0.24);
    const muted = rgb(0.35, 0.39, 0.47);
    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 56;
    let page = doc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const drawLine = () => {
      page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.85, 0.87, 0.9) });
      y -= 22;
    };

    const ensureSpace = (needed: number) => {
      if (y - needed > 64) {
        return;
      }
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    };

    const drawWrapped = (value: string, size = 11, color = ink, font = regular, gap = 15) => {
      const lines = wrapText(value, 86);
      for (const line of lines) {
        ensureSpace(gap + 4);
        page.drawText(line, { x: margin, y, size, font, color });
        y -= gap;
      }
    };

    page.drawText("JR", { x: margin, y, size: 26, font: bold, color: accent });
    page.drawText("Jose Robles", { x: margin + 48, y: y + 8, size: 14, font: bold, color: ink });
    page.drawText("AI Act Compliance", { x: margin + 48, y: y - 8, size: 9, font: regular, color: muted });
    y -= 48;

    page.drawText(text[locale].title, { x: margin, y, size: 24, font: bold, color: ink });
    y -= 34;
    page.drawText(`${text[locale].classification}: ${sanitize(result.shortLabel)}`, {
      x: margin,
      y,
      size: 16,
      font: bold,
      color: accent
    });
    y -= 26;
    drawWrapped(sanitize(result.summary), 11);
    y -= 6;
    drawLine();

    if (result.annexMatches.length > 0) {
      page.drawText(text[locale].annex, { x: margin, y, size: 13, font: bold, color: ink });
      y -= 20;
      result.annexMatches.forEach((match) => drawWrapped(`- ${sanitize(match)}`, 10));
      y -= 6;
    }

    page.drawText(text[locale].obligations, { x: margin, y, size: 13, font: bold, color: ink });
    y -= 20;
    result.obligations.forEach((obligation) => {
      ensureSpace(46);
      page.drawText(`${sanitize(obligation.article)} - ${sanitize(obligation.title)}`, {
        x: margin,
        y,
        size: 11,
        font: bold,
        color: ink
      });
      y -= 16;
      drawWrapped(sanitize(obligation.summary), 9.5, muted, regular, 13);
      y -= 3;
    });

    y -= 8;
    ensureSpace(62);
    page.drawRectangle({ x: margin, y: y - 34, width: pageWidth - margin * 2, height: 48, borderColor: accent, borderWidth: 1 });
    page.drawText(text[locale].cta, { x: margin + 14, y: y - 6, size: 11, font: bold, color: accent });
    y -= 58;
    drawWrapped(text[locale].disclaimer, 8.5, muted, regular, 12);

    const pages = doc.getPages();
    pages.forEach((currentPage, index) => {
      currentPage.drawText(`${text[locale].footer} · ${index + 1}/${pages.length}`, {
        x: margin,
        y: 28,
        size: 8,
        font: regular,
        color: muted
      });
    });

    const bytes = await doc.save();
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const blob = new Blob([arrayBuffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = text[locale].filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-signal"
    >
      <Download size={18} aria-hidden="true" />
      {text[locale].button}
    </button>
  );
}

function wrapText(value: string, maxLength: number): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxLength && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

function sanitize(value: string): string {
  return value.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/€/g, "EUR");
}
