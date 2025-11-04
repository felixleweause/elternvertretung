"use client";

import { useMeQuery } from "@/lib/react-query/hooks";

export function useSchoolId() {
  const { data: user } = useMeQuery();
  const schoolId = user?.schoolId;  // Fixed: was school_id, now schoolId
  
  return schoolId;
}
