export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const CV_MAX_PAGES = 20;
export const CV_MIN_PAGES = 1;
export const CV_PDF_MIME_TYPE = "application/pdf";

export interface CvFileMeta {
  mimeType: string;
  byteSize: number;
}

export interface CvValidationResult {
  valid: boolean;
  error: string | null;
}

export function validateCvFile(meta: CvFileMeta): CvValidationResult {
  if (meta.mimeType !== CV_PDF_MIME_TYPE) {
    return { valid: false, error: "CV must be a PDF file" };
  }
  if (meta.byteSize < 1 || meta.byteSize > CV_MAX_BYTES) {
    return { valid: false, error: "CV must be between 1 byte and 5 MB" };
  }
  return { valid: true, error: null };
}

export function validateCvPageCount(pageCount: number): CvValidationResult {
  if (pageCount < CV_MIN_PAGES || pageCount > CV_MAX_PAGES) {
    return { valid: false, error: "CV must be between 1 and 20 pages" };
  }
  return { valid: true, error: null };
}
