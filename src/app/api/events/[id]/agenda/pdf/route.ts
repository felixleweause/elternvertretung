import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  normalizeAgendaDocument,
  normalizeMinutesDocument,
} from "@/lib/events/documents";
import { fetchEventWithReminderFallback } from "@/lib/supabase/event-queries";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

const TITLE_FONT_SIZE = 18;
const SUBTITLE_FONT_SIZE = 12;
const BODY_FONT_SIZE = 11;
const LINE_HEIGHT = 16;
const PAGE_MARGIN = 50;

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const fetched = await fetchEventWithReminderFallback(
    supabase,
    id,
    "agenda pdf export"
  ).catch((error) => {
    console.error("Failed to load event for agenda pdf", error);
    return null;
  });

  if (!fetched?.event) {
    return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  }

  if (!fetched.agendaAvailable) {
    return NextResponse.json(
      {
        error:
          "Agenda und Protokoll sind noch nicht aktiviert. Bitte führe die Migration 20241026150000_events_agenda_minutes aus.",
      },
      { status: 409 }
    );
  }

  const event = fetched.event;
  const agenda = normalizeAgendaDocument(event.agenda);
  const minutes = normalizeMinutesDocument(event.minutes);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let cursorY = height - PAGE_MARGIN;

  const drawText = (
    text: string,
    options: {
      font: typeof helvetica;
      size: number;
      color?: { r: number; g: number; b: number };
      gap?: number;
    }
  ) => {
    const maxWidth = width - PAGE_MARGIN * 2;
    const paragraphs = text.split(/\r?\n/);

    for (const paragraph of paragraphs) {
      const words = paragraph.split(/\s+/);
      let line = "";

      for (const word of words) {
        const candidate = line.length === 0 ? word : `${line} ${word}`;
        const candidateWidth = options.font.widthOfTextAtSize(
          candidate,
          options.size
        );
        if (candidateWidth > maxWidth && line.length > 0) {
          if (cursorY <= PAGE_MARGIN) {
            cursorY = height - PAGE_MARGIN;
            pdfDoc.addPage();
          }
          page.drawText(line, {
            x: PAGE_MARGIN,
            y: cursorY,
            size: options.size,
            font: options.font,
            color: options.color,
          });
          cursorY -= LINE_HEIGHT;
          line = word;
        } else {
          line = candidate;
        }
      }

      if (line.length > 0) {
        if (cursorY <= PAGE_MARGIN) {
          cursorY = height - PAGE_MARGIN;
          pdfDoc.addPage();
        }
        page.drawText(line, {
          x: PAGE_MARGIN,
          y: cursorY,
          size: options.size,
          font: options.font,
          color: options.color,
        });
        cursorY -= LINE_HEIGHT;
      }
    }

    cursorY -= options.gap ?? 6;
  };

  const eventStart = new Date(event.start_at);
  const eventEnd = event.end_at ? new Date(event.end_at) : null;
  const dateLabel = new Intl.DateTimeFormat("de-DE", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(eventStart);

  drawText("Agenda & Protokoll", {
    font: helveticaBold,
    size: TITLE_FONT_SIZE,
    gap: 10,
  });

  drawText(event.title, {
    font: helvetica,
    size: SUBTITLE_FONT_SIZE,
  });

  drawText(dateLabel, {
    font: helvetica,
    size: SUBTITLE_FONT_SIZE,
  });

  if (eventEnd) {
    const endLabel = new Intl.DateTimeFormat("de-DE", {
      timeStyle: "short",
    }).format(eventEnd);
    drawText(`Ende: ${endLabel}`, {
      font: helvetica,
      size: SUBTITLE_FONT_SIZE,
    });
  }

  if (event.location) {
    drawText(`Ort: ${event.location}`, {
      font: helvetica,
      size: SUBTITLE_FONT_SIZE,
    });
  }

  cursorY -= 10;

  drawText("Tagesordnung", {
    font: helveticaBold,
    size: SUBTITLE_FONT_SIZE,
    gap: 6,
  });

  if (agenda.items.length === 0) {
    drawText("Keine Agenda hinterlegt.", {
      font: helvetica,
      size: BODY_FONT_SIZE,
    });
  } else {
    agenda.items.forEach((item, index) => {
      const headerParts = [`TOP ${index + 1}: ${item.topic}`];
      if (item.startsAt) {
        headerParts.push(`Start ${item.startsAt}`);
      }
      if (item.durationMinutes) {
        headerParts.push(`${item.durationMinutes} Min.`);
      }
      drawText(headerParts.join(" · "), {
        font: helveticaBold,
        size: BODY_FONT_SIZE,
        gap: 2,
      });

      if (item.owner) {
        drawText(`Leitung: ${item.owner}`, {
          font: helvetica,
          size: BODY_FONT_SIZE,
        });
      }
      if (item.notes) {
        drawText(item.notes, {
          font: helvetica,
          size: BODY_FONT_SIZE,
        });
      }
      cursorY -= 4;
    });
  }

  cursorY -= 10;

  drawText("Protokoll", {
    font: helveticaBold,
    size: SUBTITLE_FONT_SIZE,
    gap: 6,
  });

  if (minutes.entries.length === 0) {
    drawText("Keine Protokoll-Einträge vorhanden.", {
      font: helvetica,
      size: BODY_FONT_SIZE,
    });
  } else {
    minutes.entries.forEach((entry, index) => {
      const recorded = Number.isNaN(Date.parse(entry.recordedAt))
        ? null
        : recordedFormatter.format(new Date(entry.recordedAt));
      const header: string[] = [`Eintrag ${index + 1}`];
      if (recorded) {
        header.push(recorded);
      }
      if (entry.agendaItemId) {
        const agendaItem = agenda.items.find(
          (item) => item.id === entry.agendaItemId
        );
        if (agendaItem) {
          header.push(`TOP: ${agendaItem.topic}`);
        }
      }
      drawText(header.join(" · "), {
        font: helveticaBold,
        size: BODY_FONT_SIZE,
        gap: 2,
      });
      if (entry.author) {
        drawText(`Protokolliert von: ${entry.author}`, {
          font: helvetica,
          size: BODY_FONT_SIZE,
        });
      }
      drawText(entry.note, {
        font: helvetica,
        size: BODY_FONT_SIZE,
      });
      cursorY -= 4;
    });
  }

  if (agenda.preparedBy || minutes.preparedBy) {
    cursorY -= 6;
    const footerParts: string[] = [];
    if (agenda.preparedBy) {
      footerParts.push(`Agenda erstellt von ${agenda.preparedBy}`);
    }
    if (minutes.preparedBy) {
      footerParts.push(`Protokoll erstellt von ${minutes.preparedBy}`);
    }
    drawText(footerParts.join(" · "), {
      font: helvetica,
      size: BODY_FONT_SIZE,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const pdfArray =
    pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
  const arrayBuffer = pdfArray.buffer.slice(
    pdfArray.byteOffset,
    pdfArray.byteOffset + pdfArray.byteLength
  );

  const storagePath = `events/${id}/protokoll-${Date.now()}.pdf`;
  const uploadResult = await supabase.storage.from("docs").upload(storagePath, arrayBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (uploadResult.error) {
    console.warn("Failed to persist agenda pdf to storage", uploadResult.error);
  }

  const auditInsert = await supabase.from("audit_log").insert({
    school_id: event.school_id,
    actor_id: user.id,
    action: "event.agenda.pdf_generated",
    entity: "event",
    entity_id: id,
    meta: {
      storagePath,
      agendaItems: agenda.items.length,
      minutesEntries: minutes.entries.length,
    },
  });

  if (auditInsert.error) {
    console.warn("Failed to append audit log for agenda pdf", auditInsert.error);
  }

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="event-${id}-protokoll.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

const recordedFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});
