import { NextResponse } from "next/server";
import { after } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";
import { notifyUser, vapidFromEnv } from "@/lib/push";

// Waits out the delay after the response is sent.
export const maxDuration = 60;

const DELAY_MS = 15_000;

/** Sends the signed-in person a test notification after 15 seconds, so they can lock the phone and watch for it. */
export async function POST() {
  const user = await currentUser();
  if (!user) return unauthorized();
  if (!vapidFromEnv()) return NextResponse.json({ error: "Notifications are not set up on the server yet." }, { status: 503 });
  after(async () => {
    await new Promise((r) => setTimeout(r, DELAY_MS));
    await notifyUser(user.id, { title: "Test notification", body: "It works. This is what a finished lesson looks like.", url: "/" });
  });
  return NextResponse.json({ ok: true, seconds: DELAY_MS / 1000 });
}
