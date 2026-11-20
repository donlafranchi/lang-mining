import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/auth";

/** Who is signed in, for the header that sits on every page. Nothing private beyond their own name. */
export async function GET() {
  const user = await currentUser();
  if (!user) return unauthorized();
  return NextResponse.json({ name: user.name, isAdmin: user.isAdmin });
}
