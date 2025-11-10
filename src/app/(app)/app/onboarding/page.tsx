import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { AppPageFrame } from "@/components/app/app-page-frame";

export const metadata: Metadata = {
  title: "Onboarding · Klasse verknüpfen",
};
export default async function OnboardingPage() {
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: enrollmentsData, error: enrollmentsError } = await supabase
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
    .order("created_at", { ascending: true });

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

  return (
    <AppPageFrame user={user} schoolId={null}>
      <OnboardingForm enrollments={enrollments} />
    </AppPageFrame>
  );
}
