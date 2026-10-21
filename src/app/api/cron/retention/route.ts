import { NextResponse } from "next/server";
import { purgeExpired } from "@/lib/retention";
import { supabaseSourceTextStore } from "@/lib/supabase";

// Vercel Cron calls this daily with "Authorization: Bearer $CRON_SECRET".
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const deleted = await purgeExpired(supabaseSourceTextStore, new Date());
  return NextResponse.json({ deleted });
}
