function normalizeRole(role) {
  return String(role || '').trim().toLowerCase().replace(/\s+/g, '_');
}

const ROLE_LABELS = {
  house_tutor: '🏠 House Tutor',
  assistant_provost: '📘 Assistant Provost',
  provost: '🏛️ Provost',
  treasurer: '💰 Treasurer',
  vc: '🎓 Vice Chancellor',
  pending: '⏳ Initial Review',
  completed: '✅ Completed',
  rejected: '❌ Rejected'
};

export function formatRoleName(role) {
  const normalized = normalizeRole(role);
  return ROLE_LABELS[normalized] || role || '-';
}

const ORDERED_FLOW_ROLES = ['house_tutor', 'assistant_provost', 'provost', 'treasurer', 'vc'];

function sortApprovalsByOrder(approvals) {
  return [...(approvals || [])].sort((a, b) => (a.role_order || 0) - (b.role_order || 0));
}

function normalizeApprovalStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'approved' || normalized === 'rejected' || normalized === 'pending' || normalized === 'waiting') {
    return normalized;
  }
  return 'waiting';
}

function collectFlowRoles(file, approvals) {
  const roleSet = new Set();

  ORDERED_FLOW_ROLES.forEach((role) => {
    if (file?.[`${role}_id`]) roleSet.add(role);
  });

  approvals.forEach((step) => {
    const role = normalizeRole(step.role);
    if (role) roleSet.add(role);
  });

  return ORDERED_FLOW_ROLES.filter((role) => roleSet.has(role));
}

function buildNormalizedApprovals(file) {
  const approvals = sortApprovalsByOrder(file?.application_approvals);
  const flowRoles = collectFlowRoles(file, approvals);
  if (flowRoles.length === 0) return [];

  const currentStepRole = normalizeRole(file?.current_step);
  const currentStepIndex = flowRoles.indexOf(currentStepRole);
  const fileStatus = normalizeApprovalStatus(file?.status);
  const isTerminalApproved = fileStatus === 'approved' && currentStepRole === 'completed';
  const isTerminalRejected = fileStatus === 'rejected' && currentStepRole === 'rejected';
  const approvalMap = new Map(
    approvals.map((step) => [normalizeRole(step.role), step])
  );

  return flowRoles.map((role, idx) => {
    const existing = approvalMap.get(role);
    if (existing) {
      return {
        ...existing,
        role,
        role_order: existing.role_order || idx + 1,
        status: normalizeApprovalStatus(existing.status)
      };
    }

    let status = 'waiting';
    if (isTerminalApproved) {
      status = 'approved';
    } else if (isTerminalRejected) {
      if (currentStepIndex >= 0 && idx < currentStepIndex) status = 'approved';
      if (currentStepIndex >= 0 && idx === currentStepIndex) status = 'rejected';
    } else if (currentStepIndex === -1) {
      status = idx === 0 ? 'pending' : 'waiting';
    } else if (idx < currentStepIndex) {
      status = 'approved';
    } else if (idx === currentStepIndex) {
      status = 'pending';
    }

    return {
      id: `synthetic-${role}`,
      role,
      role_order: idx + 1,
      approved_by: file?.[`${role}_id`] || null,
      status,
      approved_at: null,
      approver: null
    };
  });
}

export function deriveFileState(file) {
  const approvals = buildNormalizedApprovals(file);
  const rejectedStep = approvals.find((step) => normalizeApprovalStatus(step.status) === 'rejected');
  const approvedCount = approvals.filter((step) => normalizeApprovalStatus(step.status) === 'approved').length;
  const allApproved = approvals.length > 0 && approvedCount === approvals.length;

  if (rejectedStep || normalizeApprovalStatus(file?.status) === 'rejected') {
    return {
      status: 'rejected',
      currentStep: 'rejected',
      approvals,
      approvedCount,
      totalSteps: approvals.length
    };
  }

  if (allApproved) {
    return {
      status: 'approved',
      currentStep: 'completed',
      approvals,
      approvedCount,
      totalSteps: approvals.length
    };
  }

  const pendingStep = approvals.find((step) => normalizeApprovalStatus(step.status) === 'pending');
  const waitingStep = approvals.find((step) => normalizeApprovalStatus(step.status) === 'waiting');
  const fallbackStep = normalizeRole(file?.current_step) || 'pending';

  return {
    status: approvedCount > 0 ? 'in_progress' : 'pending',
    currentStep: normalizeRole(pendingStep?.role || waitingStep?.role || fallbackStep),
    approvals,
    approvedCount,
    totalSteps: approvals.length
  };
}

export function getStatusPresentation(status) {
  const normalized = String(status || '').toLowerCase();
  const map = {
    pending: { label: 'Pending', className: 'status-pending' },
    in_progress: { label: 'In Progress', className: 'status-in-progress' },
    approved: { label: 'Approved', className: 'status-approved' },
    rejected: { label: 'Rejected', className: 'status-rejected' }
  };
  return map[normalized] || map.pending;
}

export function getTimelineStepPresentation(stepStatus, isCurrentActiveStep) {
  const normalized = normalizeApprovalStatus(stepStatus);
  if (normalized === 'approved') {
    return {
      statusClass: 'completed',
      statusText: '✓ Approved',
      iconClass: 'completed',
      iconHtml: '✓'
    };
  }
  if (normalized === 'rejected') {
    return {
      statusClass: 'rejected',
      statusText: '✗ Rejected',
      iconClass: 'rejected',
      iconHtml: '✗'
    };
  }
  if (isCurrentActiveStep) {
    return {
      statusClass: 'current',
      statusText: '⏳ Pending (Your Action)',
      iconClass: 'current',
      iconHtml: '⏳'
    };
  }
  if (normalized === 'pending') {
    return {
      statusClass: 'pending',
      statusText: '⏳ Pending',
      iconClass: 'pending',
      iconHtml: '⏳'
    };
  }
  return {
    statusClass: 'pending',
    statusText: '⏰ Waiting',
    iconClass: 'pending',
    iconHtml: '⏰'
  };
}

export { normalizeRole, normalizeApprovalStatus };
