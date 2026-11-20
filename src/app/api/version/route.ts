import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Which build is live right now. The app compares it with the build it is running, to offer an update. Not private. */
export async function GET() {
  return NextResponse.json({ id: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" }, { headers: { "Cache-Control": "no-store" } });
}
