import { NextResponse } from "next/server";
import { getProfile, upsertProfile } from "../../../lib/repositories/profile";
import { validateProfileText } from "../../../lib/validation/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getProfile();
  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.researchProfileText === "string" ? body.researchProfileText : "";

  const validation = validateProfileText(text);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  await upsertProfile(text.trim());
  const profile = await getProfile();
  return NextResponse.json({ profile });
}
