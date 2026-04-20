const ROLE_LABELS = {
  house_tutor: 'House Tutor',
  assistant_provost: 'Assistant Provost',
  provost: 'Provost',
  treasurer: 'Treasurer',
  vc: 'Vice Chancellor',
  supervisor: 'Supervisor'
};

const ROLE_ORDER = ['house_tutor', 'assistant_provost', 'provost', 'treasurer', 'vc'];

export function normalizeRole(role) {
  return String(role || '').trim().toLowerCase().replace(/\s+/g, '_');
}

export function formatRoleLabel(role) {
  const normalized = normalizeRole(role);
  return ROLE_LABELS[normalized] || role || 'Unknown';
}

export function getLastApprovedRole(file) {
  const approvals = [...(file?.application_approvals || [])]
    .sort((a, b) => (a.role_order || 0) - (b.role_order || 0));

  const approvedSteps = approvals.filter((step) => normalizeRole(step.status) === 'approved');
  if (approvedSteps.length > 0) {
    return normalizeRole(approvedSteps[approvedSteps.length - 1].role);
  }

  const currentRole = normalizeRole(file?.current_step);
  const currentIndex = ROLE_ORDER.indexOf(currentRole);
  if (currentIndex > 0) {
    return ROLE_ORDER[currentIndex - 1];
  }

  return 'supervisor';
}

export function getLastApprovedRoleName(file) {
  return formatRoleLabel(getLastApprovedRole(file));
}
