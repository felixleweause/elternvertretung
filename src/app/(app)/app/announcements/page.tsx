import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { AnnouncementFeed } from "@/components/announcements/announcement-feed";
import type {
  AnnouncementListItem,
  AnnouncementScopeOption,
} from "@/components/announcements/types";

export const metadata: Metadata = {
  title: "Ankündigungen",
};

export default async function AnnouncementsPage() {
  const supabase = await getServerSupabase();

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, email, school_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.school_id) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Dein Profil ist noch nicht vollständig. Bitte kontaktiere den Admin, damit
        dir eine Schule zugewiesen wird.
      </div>
    );
  }

  const [mandatesResponse, announcementsResponse, receiptsResponse] =
    await Promise.all([
      supabase
        .from("mandates")
        .select("scope_type, scope_id, role, status")
        .eq("user_id", user.id)
        .eq("status", "active"),
      supabase
        .from("announcements")
        .select(
          `
            id,
            school_id,
            scope_type,
            scope_id,
            title,
            body,
            attachments,
            allow_comments,
            requires_ack,
            pinned,
            created_at,
            created_by,
            profiles (
              id,
              name,
              email
            )
          `
        )
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("read_receipts")
        .select("announcement_id, read_at")
        .eq("user_id", user.id),
    ]);

  if (announcementsResponse.error) {
    console.error(
      "Failed to load announcements",
      announcementsResponse.error
    );
  }

  const announcementsData = announcementsResponse.data ?? [];
  const readReceipts = receiptsResponse.data ?? [];

  const classIds = Array.from(
    new Set(
      announcementsData
        .filter((item) => item.scope_type === "class")
        .map((item) => item.scope_id)
    )
  );

  const classInfo =
    classIds.length > 0
      ? await supabase
          .from("classrooms")
          .select("id, name, year")
          .in("id", classIds)
      : { data: [], error: null };

  if (classInfo.error) {
    console.error("Failed to load class details", classInfo.error);
  }

  const classMap = new Map(
    (classInfo.data ?? []).map((clazz) => [
      clazz.id,
      `${clazz.name}${clazz.year ? ` · Jahrgang ${clazz.year}` : ""}`,
    ])
  );

  const readSet = new Set(
    readReceipts.map((receipt) => receipt.announcement_id)
  );

  const announcements: AnnouncementListItem[] = announcementsData.map(
    (item) => ({
      id: item.id,
      schoolId: item.school_id,
      scopeType: item.scope_type,
      scopeId: item.scope_id,
      scopeLabel:
        item.scope_type === "school"
          ? "Gesamte Schule"
          : classMap.get(item.scope_id) ?? "Klasse",
      title: item.title,
      body: item.body,
      attachments: item.attachments ?? [],
      allowComments: item.allow_comments ?? false,
      requiresAck: item.requires_ack ?? false,
      pinned: item.pinned ?? false,
      createdAt: item.created_at,
      createdBy: {
        id: item.profiles?.id ?? null,
        name: item.profiles?.name ?? null,
        email: item.profiles?.email ?? null,
      },
      isRead: readSet.has(item.id),
    })
  );

  const composerScopes: AnnouncementScopeOption[] = buildComposerScopes(
    mandatesResponse.data ?? [],
    classMap,
    profile.school_id
  );

  return (
    <AnnouncementFeed
      announcements={announcements}
      composerScopes={composerScopes}
    />
  );
}

type MandateRow = {
  scope_type: "class" | "school";
  scope_id: string;
  role: string;
  status: string;
};

function buildComposerScopes(
  mandates: MandateRow[],
  classMap: Map<string, string>,
  schoolId: string
): AnnouncementScopeOption[] {
  const scopes: AnnouncementScopeOption[] = [];
  const schoolGranted = mandates.some(
    (mandate) =>
      mandate.scope_type === "school" &&
      (mandate.role === "gev" || mandate.role === "admin")
  );

  if (schoolGranted) {
    scopes.push({
      scopeType: "school",
      scopeId: schoolId,
      label: "Gesamte Schule",
    });
  }

  mandates
    .filter(
      (mandate) =>
        mandate.scope_type === "class" &&
        ["class_rep", "class_rep_deputy"].includes(mandate.role)
    )
    .forEach((mandate) => {
      const label =
        classMap.get(mandate.scope_id) ?? "Klasse (unbekanntes Label)";
      scopes.push({
        scopeType: "class",
        scopeId: mandate.scope_id,
        label,
      });
    });

  return scopes;
}
