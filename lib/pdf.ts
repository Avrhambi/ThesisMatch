import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";

// Under Next.js bundling, pdf.js cannot resolve its worker module relative to
// the bundled chunk, so point it at the on-disk file explicitly.
PDFParse.setWorker(
  pathToFileURL(
    path.join(process.cwd(), "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs"),
  ).href,
);

export interface ExtractedPdf {
  text: string;
  pageCount: number;
}

export async function extractPdfText(data: Buffer): Promise<ExtractedPdf> {
  const parser = new PDFParse({ data });
  try {
    const info = await parser.getInfo();
    const textResult = await parser.getText();
    return { text: textResult.text, pageCount: info.total };
  } finally {
    await parser.destroy();
  }
}
