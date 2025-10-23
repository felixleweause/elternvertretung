export type AnnouncementScopeOption = {
  scopeType: "class" | "school";
  scopeId: string;
  label: string;
};

export type AnnouncementListItem = {
  id: string;
  schoolId: string;
  scopeType: "class" | "school";
  scopeId: string;
  scopeLabel: string;
  title: string;
  body: string;
  attachments: unknown[];
  allowComments: boolean;
  requiresAck: boolean;
  pinned: boolean;
  createdAt: string;
  createdBy: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
  isRead: boolean;
};
