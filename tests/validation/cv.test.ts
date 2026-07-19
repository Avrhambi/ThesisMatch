import { describe, expect, it } from "vitest";
import { CV_MAX_BYTES, validateCvFile, validateCvPageCount } from "../../lib/validation/cv";

describe("validateCvFile", () => {
  it("rejects non-PDF mime types", () => {
    const result = validateCvFile({ mimeType: "image/png", byteSize: 1000 });
    expect(result.valid).toBe(false);
  });

  it("rejects files over 5 MB", () => {
    const result = validateCvFile({ mimeType: "application/pdf", byteSize: CV_MAX_BYTES + 1 });
    expect(result.valid).toBe(false);
  });

  it("accepts a PDF at the 5 MB boundary", () => {
    const result = validateCvFile({ mimeType: "application/pdf", byteSize: CV_MAX_BYTES });
    expect(result.valid).toBe(true);
  });

  it("rejects empty files", () => {
    const result = validateCvFile({ mimeType: "application/pdf", byteSize: 0 });
    expect(result.valid).toBe(false);
  });
});

describe("validateCvPageCount", () => {
  it("rejects zero pages", () => {
    expect(validateCvPageCount(0).valid).toBe(false);
  });

  it("rejects more than 20 pages", () => {
    expect(validateCvPageCount(21).valid).toBe(false);
  });

  it("accepts 1 to 20 pages", () => {
    expect(validateCvPageCount(1).valid).toBe(true);
    expect(validateCvPageCount(20).valid).toBe(true);
  });
});
