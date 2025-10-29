import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { listCandidateRecords } from "@/lib/polls/candidate-service";
import type { Database } from "@/lib/supabase/database";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

async function ensureManageAccess(supabase: ReturnType<typeof createRouteHandlerClient<Database>>, pollId: string) {
  const { data, error } = await supabase.rpc("can_manage_poll", { p_poll_id: pollId });
  if (error) {
    console.error("can_manage_poll failed", error);
  }
  return data === true;
}

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: poll, error: pollError } = await supabase
    .from("polls")
    .select("id, title, kind, scope_type, school_id")
    .eq("id", id)
    .maybeSingle();

  if (pollError) {
    console.error("Failed to load poll", pollError);
    return NextResponse.json({ error: "poll_lookup_failed" }, { status: 400 });
  }

  if (!poll) {
    return NextResponse.json({ error: "poll_not_found" }, { status: 404 });
  }

  if (poll.kind !== "election") {
    return NextResponse.json({ error: "pdf_not_supported" }, { status: 400 });
  }

  const canManage = await ensureManageAccess(supabase, id);
  if (!canManage) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const candidates = await listCandidateRecords(supabase, id);

  if (candidates.length === 0) {
    return NextResponse.json({ error: "no_candidates" }, { status: 404 });
  }

  const requestUrl = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin;
  const normalizedOrigin = origin.endsWith("/") ? origin.slice(0, -1) : origin;

  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const A4_WIDTH = 595.28; // pt
  const A4_HEIGHT = 841.89;
  const margin = 36; // 0.5 inch
  const cardWidth = A4_WIDTH - margin * 2;
  const cardHeight = (A4_HEIGHT - margin * 3) / 2;

  const officeLabel = (office: "class_rep" | "class_rep_deputy") =>
    office === "class_rep" ? "Klassenvertretung" : "Stellvertretung";

  for (const candidate of candidates) {
    const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    const claimUrl = `${normalizedOrigin}/claim?c=${candidate.claimCode}`;
    const expiry = candidate.expiresAt
      ? new Date(candidate.expiresAt).toLocaleDateString("de-DE")
      : "";

    const positions = [A4_HEIGHT - margin - cardHeight, margin];

    for (const yPos of positions) {
      const x = margin;
      const y = yPos;

      page.drawRectangle({
        x,
        y,
        width: cardWidth,
        height: cardHeight,
        borderColor: rgb(0.75, 0.75, 0.75),
        borderWidth: 1,
        color: rgb(0.98, 0.98, 0.98),
      });

      page.drawText(candidate.displayName, {
        x: x + 24,
        y: y + cardHeight - 48,
        size: 20,
        font: boldFont,
        color: rgb(0.1, 0.1, 0.1),
      });

      page.drawText(officeLabel(candidate.office), {
        x: x + 24,
        y: y + cardHeight - 72,
        size: 14,
        font: regularFont,
        color: rgb(0.3, 0.3, 0.3),
      });

      page.drawText(candidate.claimCode, {
        x: x + 24,
        y: y + cardHeight / 2,
        size: 34,
        font: boldFont,
        color: rgb(0.05, 0.05, 0.05),
      });

      page.drawText(`Einlösen auf ${claimUrl}`, {
        x: x + 24,
        y: y + cardHeight / 2 - 48,
        size: 12,
        font: regularFont,
        color: rgb(0.25, 0.25, 0.25),
      });

      page.drawText("1. Mit E-Mail anmelden", {
        x: x + 24,
        y: y + cardHeight / 2 - 72,
        size: 11,
        font: regularFont,
        color: rgb(0.35, 0.35, 0.35),
      });

      page.drawText("2. Code auf /claim eingeben", {
        x: x + 24,
        y: y + cardHeight / 2 - 88,
        size: 11,
        font: regularFont,
        color: rgb(0.35, 0.35, 0.35),
      });

      if (expiry) {
        page.drawText(`Gültig bis ${expiry}`, {
          x: x + 24,
          y: y + 32,
          size: 10,
          font: regularFont,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  const fileNameBase = poll.title
    ? poll.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "wahl";
  const fileName = `${fileNameBase || "wahl"}-candidate-codes.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
