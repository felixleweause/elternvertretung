export const cacheTags = {
  announcements: (schoolId: string) => `announcements:${schoolId}`,
  events: (schoolId: string) => `events:${schoolId}`,
  polls: (schoolId: string) => `polls:${schoolId}`,
  home: (schoolId: string) => `home:${schoolId}`,
};
