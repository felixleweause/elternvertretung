import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const metadata: Metadata = {
  title: "Onboarding · Klasse verknüpfen",
};

export default async function OnboardingPage() {
  const supabase = await getServerSupabase();

  const [
    { data: { user } },
    { data: enrollmentsData, error: enrollmentsError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("enrollments")
      .select(
        `
          id,
          child_initials,
          classroom_id,
          classrooms (
            name,
            year
          )
        `
      )
      .order("created_at", { ascending: true }),
  ]);

  if (!user) {
    redirect("/login");
  }

  if (enrollmentsError) {
    console.error("Failed to load enrollments", enrollmentsError);
  }

  const enrollments =
    enrollmentsData?.map((enrollment) => ({
      id: enrollment.id,
      classroomName: enrollment.classrooms?.name ?? "Unbekannte Klasse",
      classroomYear: enrollment.classrooms?.year ?? null,
      childInitials: enrollment.child_initials,
    })) ?? [];

  return <OnboardingForm enrollments={enrollments} />;
}
