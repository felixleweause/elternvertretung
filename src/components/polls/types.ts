export type PollScopeOption = {
  scopeType: "class" | "school";
  scopeId: string;
  label: string;
};

export type PollListItem = {
  id: string;
  title: string;
  description: string | null;
  scopeType: "class" | "school";
  scopeId: string;
  scopeLabel: string;
  kind: "general" | "election";
  type: "open" | "secret";
  status: "draft" | "open" | "closed";
  deadline: string | null;
  quorum: number | null;
  allowAbstain: boolean;
  createdAt: string;
  createdBy: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
  totalVotes: number;
  secretResultsHidden: boolean;
};

export type PollOption = {
  id: string;
  label: string;
  votes: number;
};

export type PollDetail = {
  id: string;
  schoolId: string;
  scopeType: "class" | "school";
  scopeId: string;
  scopeLabel: string;
  kind: "general" | "election";
  title: string;
  description: string | null;
  type: "open" | "secret";
  status: "draft" | "open" | "closed";
  deadline: string | null;
  quorum: number | null;
  allowAbstain: boolean;
  seats: number;
  options: PollOption[];
  mandateRule: string | null;
  createdAt: string;
  createdBy: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
  myVote: string | null;
  totalVotes: number;
  canManage: boolean;
  canVote: boolean;
  resultsHidden: boolean;
};
