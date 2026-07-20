import { describe, expect, it } from "vitest";
import { generateOutreachRequestSchema, markOutreachRequestSchema, researcherNoteContentSchema } from "../../lib/validation/outreach";

describe("researcherNoteContentSchema", () => {
  it("accepts a note within 1-10000 characters", () => {
    expect(researcherNoteContentSchema.safeParse("Some knowledge about the researcher").success).toBe(true);
  });

  it("rejects an empty note", () => {
    expect(researcherNoteContentSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects a note over 10000 characters", () => {
    expect(researcherNoteContentSchema.safeParse("a".repeat(10001)).success).toBe(false);
  });
});

describe("generateOutreachRequestSchema", () => {
  it("defaults confirmExtra and regenerate to false", () => {
    const parsed = generateOutreachRequestSchema.parse({ note: "context" });
    expect(parsed.confirmExtra).toBe(false);
    expect(parsed.regenerate).toBe(false);
  });

  it("rejects a missing note", () => {
    expect(generateOutreachRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("markOutreachRequestSchema", () => {
  it("accepts a copy action without a decision", () => {
    expect(markOutreachRequestSchema.safeParse({ action: "copy" }).success).toBe(true);
  });

  it("accepts a sent action with an explicit decision", () => {
    const parsed = markOutreachRequestSchema.parse({ action: "sent", decision: "meeting_scheduled" });
    expect(parsed.decision).toBe("meeting_scheduled");
  });

  it("rejects an unknown action", () => {
    expect(markOutreachRequestSchema.safeParse({ action: "delete" }).success).toBe(false);
  });
});
