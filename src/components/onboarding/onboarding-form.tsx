"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Announcement, AnnouncementDescription, AnnouncementTag, AnnouncementTitle } from "@/components/ui/kibo/announcement";
import {
  KiboForm,
  KiboFormBody,
  KiboFormDescription,
  KiboFormFooter,
  KiboFormHeader,
  KiboFormTitle,
} from "@/components/ui/kibo/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EnrollmentSummary = {
  id: string;
  classroomName: string;
  classroomYear: number | null;
  childInitials: string | null;
};

type OnboardingFormProps = {
  enrollments: EnrollmentSummary[];
};

type ApiResponse =
  | { data: { enrollment_id: string; classroom_id: string; school_id: string; child_initials: string | null } }
  | { error: string };

export function OnboardingForm({ enrollments }: OnboardingFormProps) {
  const router = useRouter();
  const [classCode, setClassCode] = useState("");
  const [childInitials, setChildInitials] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCode = classCode.trim().toUpperCase();
    if (!trimmedCode) {
      setError("Bitte gib deinen Klassen-Code ein.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/onboarding", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: trimmedCode,
            childInitials: childInitials.trim() || null,
          }),
        });

        const payload = (await response.json()) as ApiResponse;

        if (!response.ok) {
          const message =
            "error" in payload
              ? mapApiError(payload.error)
              : "Unbekannter Fehler. Bitte versuche es später erneut.";
          setError(message);
          return;
        }

        setSuccess("Klassen-Zugang erfolgreich verknüpft. Weiterleitung...");
        setClassCode("");

        setTimeout(() => {
          router.replace(`/app`);
          router.refresh();
        }, 1200);
      } catch (err) {
        console.error("Onboarding request failed", err);
        setError(
          "Beim Verbinden ist ein Fehler aufgetreten. Bitte prüfe deine Verbindung oder versuche es erneut."
        );
      }
    });
  };

  const hasEnrollments = enrollments.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <Announcement>
        <AnnouncementTag>Schritt 1</AnnouncementTag>
        <AnnouncementTitle>Klassen-Zugang herstellen</AnnouncementTitle>
        <AnnouncementDescription>
          Nutze den Klassen-Code oder den QR-Link von deiner Klassenvertretung. Wir verknüpfen dich
          automatisch mit der richtigen Schule und Klasse.
        </AnnouncementDescription>
      </Announcement>

      <KiboForm>
        <KiboFormHeader>
          <KiboFormTitle>Klassen-Code eingeben</KiboFormTitle>
          <KiboFormDescription>
            Der Code besteht typischerweise aus Buchstaben und Zahlen (z.&nbsp;B. <code>1A-24-GEV</code>).
            Optional kannst du ein Kürzel deines Kindes hinterlegen, damit du mehrere Klassen leichter
            unterscheiden kannst.
          </KiboFormDescription>
        </KiboFormHeader>

        <form className="grid gap-6" onSubmit={handleSubmit}>
          <KiboFormBody>
            <div className="grid gap-2">
              <Label htmlFor="classCode">Klassen-Code</Label>
              <Input
                id="classCode"
                placeholder="z. B. 1A-24-GEV"
                autoComplete="off"
                value={classCode}
                onChange={(event) => setClassCode(event.target.value)}
                className="uppercase tracking-wider"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="childInitials">Kürzel deines Kindes (optional)</Label>
              <Input
                id="childInitials"
                placeholder="z. B. LS für Lea Schmidt"
                maxLength={8}
                value={childInitials}
                onChange={(event) => setChildInitials(event.target.value)}
              />
            </div>
          </KiboFormBody>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Bei Problemen wende dich an deine Klassenvertretung oder Admin.
            </p>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Verbinde..." : "Klasse verknüpfen"}
            </Button>
          </div>
        </form>

        <KiboFormFooter>
          <div className="flex flex-col gap-1">
            {error ? (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            ) : null}
            {success ? (
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{success}</p>
            ) : null}
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Deine Daten werden ausschließlich innerhalb deiner Schule gespeichert (DSGVO-konform).
          </p>
        </KiboFormFooter>
      </KiboForm>

      <KiboForm className="bg-zinc-50 dark:bg-zinc-900/50">
        <KiboFormHeader className="border-b-0 pb-0">
          <KiboFormTitle>Bereits verknüpfte Klassen</KiboFormTitle>
          <KiboFormDescription>
            Aktuell bist du mit {hasEnrollments ? enrollments.length : "keiner"} Klasse verbunden.
          </KiboFormDescription>
        </KiboFormHeader>
        <KiboFormBody>
          {hasEnrollments ? (
            <ul className="grid gap-3">
              {enrollments.map((enrollment) => (
                <li
                  key={enrollment.id}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  )}
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {enrollment.classroomName}
                    {enrollment.classroomYear ? ` · Jahrgang ${enrollment.classroomYear}` : ""}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Kind-Kürzel: {enrollment.childInitials ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Noch keine Klasse verknüpft. Gib deinen Code oben ein, um den Einstieg abzuschließen.
            </p>
          )}
        </KiboFormBody>
      </KiboForm>
    </div>
  );
}

function mapApiError(code: string): string {
  switch (code) {
    case "missing_code":
      return "Bitte gib deinen Klassen-Code ein.";
    case "not_authenticated":
      return "Du bist nicht angemeldet. Melde dich erneut an und versuche es noch einmal.";
    case "invalid_or_expired_code":
      return "Dieser Klassen-Code ist ungültig oder abgelaufen.";
    case "code_no_longer_valid":
      return "Dieser Klassen-Code wurde bereits vollständig verwendet.";
    default:
      return code;
  }
}
