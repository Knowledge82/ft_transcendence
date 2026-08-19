interface OrganizationBadgeProps {
  organization: { name: string; color: string } | null;
}

// Renders nothing at all if the person belongs to no faction — callers
// don't need to check for null themselves before using this
export function OrganizationBadge({ organization }: OrganizationBadgeProps) {
  if (!organization) {
    return null;
  }

  return (
    <p className="text-xs uppercase tracking-wide inline-flex items-center gap-1.5">
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: organization.color }}
        aria-hidden="true"
      />
      <span style={{ color: organization.color }}>{organization.name}</span>
    </p>
  );
}
