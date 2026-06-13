import { NextResponse } from "next/server";
import { syncResultsFromApiFootball } from "@/lib/result-sync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  const userAgent = request.headers.get("user-agent") ?? "";
  const isVercelCron = userAgent.includes("vercel-cron/1.0");

  if (cronSecret && !isVercelCron && authorization !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const report = await syncResultsFromApiFootball();
    return NextResponse.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Sync-Fehler";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
