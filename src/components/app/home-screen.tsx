"use client";

import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Announcement,
  AnnouncementDescription,
  AnnouncementTag,
  AnnouncementTitle,
} from "@/components/ui/kibo/announcement";
import { useHomeQuery } from "@/lib/react-query/hooks";
import {
  HIGHLIGHTS_BY_ROLE,
  NEXT_STEPS_BY_ROLE,
  QUICK_ACTIONS,
  ROLE_LABELS,
  type UserRole,
} from "@/lib/constants/home";
import { useUser } from "@supabase/auth-helpers-react";

export function HomeScreen() {
  const { data, isLoading } = useHomeQuery();
  const user = useUser();

  if (isLoading || !data) {
    return (
      <section className="space-y-8">
        <Card>
          <CardContent className="p-6">Lade Übersicht ...</CardContent>
        </Card>
      </section>
    );
  }

  if (data.profileMissing) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Dein Profil ist noch nicht vollständig. Bitte schließe erst das Onboarding ab.
      </div>
    );
  }

  const userName =
    user?.user_metadata?.name ?? user?.email ?? "Mitglied";

  const roleBadges = data.roles.map((role) => ROLE_LABELS[role as UserRole]);

  return (
    <section className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 p-8 shadow-lg dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
        <div className="absolute inset-y-0 -right-36 h-[160%] w-[60%] rounded-full bg-gradient-to-tr from-blue-500/10 via-emerald-500/10 to-purple-500/10 blur-3xl dark:from-blue-600/20 dark:via-emerald-600/20 dark:to-purple-600/20" />
        <div className="relative flex flex-col gap-6">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            <ShieldCheck className="h-4 w-4" />
            Willkommen zurück
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Hallo {userName}!
            </h1>
            <p className="max-w-3xl text-base text-zinc-600 dark:text-zinc-300">
              {data.nextSteps.length > 0
                ? "Deine nächsten Schritte, damit alles rund läuft."
                : "Hier entsteht das Cockpit für Eltern- und Schulelternvertretungen."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {roleBadges.map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1.2fr]">
        <Card className="shadow-md dark:shadow-none">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Nächste Schritte
            </CardTitle>
            <CardDescription>
              Prioritäten basierend auf deiner aktuellen Rolle in der Vertretung.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.nextSteps.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Aktuell keine offenen Aufgaben.
              </p>
            ) : (
              data.nextSteps.map((step) => (
                <div
                  key={step}
                  className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-zinc-50/80 p-3 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300"
                >
                  <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{step}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md dark:shadow-none">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Direkt loslegen
            </CardTitle>
            <CardDescription>
              Shortcuts zu den Bereichen, die du aktuell betreust.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {QUICK_ACTIONS.filter((action) =>
              action.roles.some((role) => data.roles.includes(role))
            ).map((action) => {
              const Icon = action.icon;
              return (
              <Button
                key={action.label}
                asChild
                variant="secondary"
                className="group flex w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/70"
              >
                <Link href={action.href} className="flex w-full items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{action.label}</span>
                    <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      {action.description}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-zinc-400 transition group-hover:translate-x-1 group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300" />
                </Link>
              </Button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm dark:shadow-none">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Rollen & Bereiche
            </CardTitle>
            <CardDescription>
              Deine aktiven Zugehörigkeiten und Mandate auf einen Blick.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
              <GraduationCap className="h-4 w-4 text-blue-500" />
              <span>Schule: {data.schoolName ?? "deine Schule"}</span>
            </div>
            {data.classLabels.length > 0 ? (
              data.classLabels.map((label) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Klasse: {label}</span>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                Noch keine Klassenmandate aktiv.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {data.highlights.map((highlight) => (
            <Announcement key={highlight}>
              <AnnouncementTag>Hinweis</AnnouncementTag>
              <AnnouncementTitle>{highlight}</AnnouncementTitle>
              <AnnouncementDescription>
                Diese Funktion steht allen Rollen zur Verfügung, die den jeweiligen Bereich
                verwalten. Nutze sie, um Transparenz und Nachvollziehbarkeit zu sichern.
              </AnnouncementDescription>
            </Announcement>
          ))}
        </div>
      </div>
    </section>
  );
}
