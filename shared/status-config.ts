// Shared status configuration type and default values
export interface StatusConfigItem {
  label: string;
  variant: "secondary" | "default" | "destructive";
}

export interface StatusConfig {
  draft: StatusConfigItem;
  initiated: StatusConfigItem;
  pending_review: StatusConfigItem;
  in_review: StatusConfigItem;
  ready_for_submission: StatusConfigItem;
  rejected: StatusConfigItem;
}

export const defaultStatusConfig: StatusConfig = {
  draft: { label: "Draft", variant: "secondary" },
  initiated: { label: "Initiated", variant: "secondary" },
  pending_review: { label: "Pending Review", variant: "default" },
  in_review: { label: "In Review", variant: "default" },
  ready_for_submission: { label: "Ready for Submission", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

// Normalization logic to handle legacy status values
export const normalizeStatus = (
  value: string | null | undefined
): keyof StatusConfig | undefined => {
  if (!value) return undefined;
  const raw = (value + "").toLowerCase().trim();
  // common whitespace/hyphen variations -> underscore
  const underscored = raw.replace(/[\s-]+/g, "_");
  // legacy and friendly mappings
  const map: Record<string, keyof StatusConfig> = {
    pending_approval: "pending_review",
    approved: "ready_for_submission",
    in_review: "in_review",
    inreview: "in_review",
    pending_review: "pending_review",
    pendingreview: "pending_review",
    ready_for_submission: "ready_for_submission",
    readyforsubmission: "ready_for_submission",
    draft: "draft",
    initiated: "initiated",
    rejected: "rejected",
  };
  if (map[underscored]) return map[underscored];
  // final check if statusConfig has the key after normalization
  return (underscored in defaultStatusConfig) ? (underscored as keyof StatusConfig) : undefined;
};
