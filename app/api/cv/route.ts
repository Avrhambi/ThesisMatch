import { NextResponse } from "next/server";
import { extractPdfText } from "../../../lib/pdf";
import { redactContactDetails } from "../../../lib/redact";
import { getCurrentCv, replaceCurrentCvOnPool } from "../../../lib/repositories/cv";
import { CV_PDF_MIME_TYPE, validateCvFile, validateCvPageCount } from "../../../lib/validation/cv";

export const dynamic = "force-dynamic";

export async function GET() {
  const cv = await getCurrentCv();
  return NextResponse.json({ cv });
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A PDF file is required" }, { status: 400 });
  }

  const fileValidation = validateCvFile({
    mimeType: file.type || CV_PDF_MIME_TYPE,
    byteSize: file.size,
  });
  if (!fileValidation.valid) {
    return NextResponse.json({ error: fileValidation.error }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let extracted;
  try {
    extracted = await extractPdfText(buffer);
  } catch {
    return NextResponse.json({ error: "Could not read the PDF file" }, { status: 400 });
  }

  const pageValidation = validateCvPageCount(extracted.pageCount);
  if (!pageValidation.valid) {
    return NextResponse.json({ error: pageValidation.error }, { status: 400 });
  }

  const redactedText = redactContactDetails(extracted.text);

  const id = await replaceCurrentCvOnPool({
    filename: file.name,
    extractedText: extracted.text,
    redactedText,
    byteSize: file.size,
    pageCount: extracted.pageCount,
  });

  const cv = await getCurrentCv();
  return NextResponse.json({ id, cv });
}
