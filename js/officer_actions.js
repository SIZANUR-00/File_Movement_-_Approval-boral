import { supabase } from "./supabase.js";
import { sendApprovalNotification, sendRejectionNotification, sendCompletionNotification } from './emailService.js';

function normalizeRole(role = '') {
  return String(role).trim().toLowerCase().replace(/\s+/g, '_');
}

function actionSuccess(message) {
  return { success: true, message };
}

function actionFailure(message, error = null) {
  return { success: false, message, error };
}

function isActionableStatus(status) {
  return status === 'pending' || status === 'waiting';
}

async function findActionableApproval(fileId, profile, currentRole, fileCurrentStep = '') {
  // 1) Strict: assigned officer + pending
  const { data: strictRow } = await supabase
    .from('application_approvals')
    .select('*')
    .eq('application_id', fileId)
    .eq('approved_by', profile.id)
    .eq('status', 'pending')
    .order('role_order', { ascending: true })
    .limit(1);

  if (strictRow && strictRow.length > 0) {
    return strictRow[0];
  }

  // 2) Fallback: read all actionable rows, then match by normalized role/current step
  const { data: rows, error } = await supabase
    .from('application_approvals')
    .select('*')
    .eq('application_id', fileId)
    .in('status', ['pending', 'waiting'])
    .order('role_order', { ascending: true });

  if (error || !rows || rows.length === 0) return null;

  const normalizedStep = normalizeRole(fileCurrentStep);
  const candidates = rows.filter(r => normalizeRole(r.role) === currentRole);
  if (candidates.length === 0) return null;

  // Prefer current file step role first
  const stepMatched = candidates.find(r => normalizeRole(r.role) === normalizedStep);
  if (stepMatched) return stepMatched;

  // Otherwise first actionable row for this officer role
  return candidates.find(r => isActionableStatus(r.status)) || null;
}

// Get current officer profile
async function getCurrentOfficer() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    window.location.href = "../index.html";
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const normalizedRole = normalizeRole(profile?.role);
  return { user, profile: { ...profile, normalizedRole } };
}

// Create notification
async function createNotification(userId, message) {
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      message: message,
      created_at: new Date()
    });
}

// Load pending files for current officer
export async function loadPendingFiles() {
  const officer = await getCurrentOfficer();
  if (!officer) return [];

  const { profile } = officer;
  const currentRole = profile.normalizedRole || normalizeRole(profile.role);
  // Most reliable source: file is pending + current step matches officer role.
  // RLS already ensures officers only see records they are permitted to access.
  const { data: stepFiles, error: stepError } = await supabase
    .from('files')
    .select(`
      *,
      supervisor:profiles!files_supervisor_id_fkey (id, name, email),
      application_approvals(
        id,
        role,
        role_order,
        approved_by,
        status
      )
    `)
    .eq('status', 'pending')
    .in('current_step', [currentRole, profile.role])
    .order('created_at', { ascending: false });

  if (stepError) {
    console.error('Error loading step-matched files:', stepError);
  }

  // Secondary fallback: approval queue table directly (for legacy inconsistent rows)
  let queuedFiles = [];
  const { data: pendingApprovals, error: approvalsError } = await supabase
    .from('application_approvals')
    .select('application_id')
    .eq('approved_by', profile.id)
    .eq('status', 'pending');

  if (approvalsError) {
    console.error('Error loading pending approvals:', approvalsError);
  } else {
    const appIds = [...new Set((pendingApprovals || []).map(a => a.application_id).filter(Boolean))];
    if (appIds.length > 0) {
      const { data: queueFileRows, error: queueFilesError } = await supabase
        .from('files')
        .select(`
          *,
          supervisor:profiles!files_supervisor_id_fkey (id, name, email)
        `)
        .in('id', appIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (queueFilesError) {
        console.error('Error loading queue fallback files:', queueFilesError);
      } else {
        queuedFiles = queueFileRows || [];
      }
    }
  }

  const mergedMap = new Map();
  (stepFiles || []).forEach(file => mergedMap.set(file.id, file));
  queuedFiles.forEach(file => {
    if (!mergedMap.has(file.id)) mergedMap.set(file.id, file);
  });

  return Array.from(mergedMap.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// Load decision counts for current officer dashboard cards
export async function loadOfficerDecisionStats() {
  const officer = await getCurrentOfficer();
  if (!officer) {
    return { pending: 0, approved: 0, rejected: 0 };
  }

  const { profile } = officer;
  const { data: rows, error } = await supabase
    .from('application_approvals')
    .select('status')
    .eq('approved_by', profile.id);

  if (error || !rows) {
    if (error) console.error('Error loading officer decision stats:', error);
    return { pending: 0, approved: 0, rejected: 0 };
  }

  return {
    pending: rows.filter(r => r.status === 'pending').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length
  };
}

// Load all files where current officer has a decision step (pending/approved/rejected)
export async function loadOfficerReviewFiles() {
  const officer = await getCurrentOfficer();
  if (!officer) return [];

  const { profile } = officer;
  const { data: approvals, error: approvalsError } = await supabase
    .from('application_approvals')
    .select('application_id, status, role, role_order, created_at')
    .eq('approved_by', profile.id)
    .order('role_order', { ascending: true });

  if (approvalsError || !approvals || approvals.length === 0) {
    if (approvalsError) console.error('Error loading officer approvals:', approvalsError);
    return [];
  }

  const appIds = [...new Set(approvals.map(a => a.application_id).filter(Boolean))];
  if (appIds.length === 0) return [];

  const { data: files, error: filesError } = await supabase
    .from('files')
    .select(`
      *,
      supervisor:profiles!files_supervisor_id_fkey (id, name, email)
    `)
    .in('id', appIds)
    .order('created_at', { ascending: false });

  if (filesError || !files) {
    if (filesError) console.error('Error loading officer review files:', filesError);
    return [];
  }

  const approvalsByApp = {};
  approvals.forEach((row) => {
    if (!approvalsByApp[row.application_id]) approvalsByApp[row.application_id] = [];
    approvalsByApp[row.application_id].push(row);
  });

  return files.map((file) => {
    const rows = approvalsByApp[file.id] || [];
    const activeRow =
      rows.find(r => r.status === 'pending' || r.status === 'waiting') ||
      rows.find(r => r.status === 'rejected') ||
      rows.find(r => r.status === 'approved') ||
      rows[0];
    const officerReviewStatus = activeRow?.status === 'waiting' ? 'pending' : (activeRow?.status || 'pending');

    return {
      ...file,
      officer_review_status: officerReviewStatus
    };
  });
}

// Approve file - updated with email notifications
export async function approveFile(fileId, comments = '') {
  const officer = await getCurrentOfficer();
  if (!officer) return actionFailure('Authentication required');

  const { profile } = officer;
  const currentRole = profile.normalizedRole || normalizeRole(profile.role);

  try {
    // Load file first (used for fallback authorization checks)
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();
    if (fileError || !file) throw fileError;

    let currentApproval = await findActionableApproval(fileId, profile, currentRole, file.current_step);

    if (!currentApproval) {
      console.error('No actionable pending step for current officer.');
      return actionFailure('No actionable pending step for current officer');
    }

    // If step was still waiting, activate it before decision.
    if (currentApproval.status === 'waiting') {
      const { error: activateError } = await supabase
        .from('application_approvals')
        .update({ status: 'pending' })
        .eq('id', currentApproval.id);
      if (activateError) {
        console.error('Failed to activate waiting step:', activateError);
      } else {
        currentApproval.status = 'pending';
      }
    }

    // Auto-claim unassigned row for future strict checks
    if (!currentApproval.approved_by) {
      const { error: claimError } = await supabase
        .from('application_approvals')
        .update({ approved_by: profile.id })
        .eq('id', currentApproval.id);
      if (claimError) {
        console.error('Failed to claim pending approval row:', claimError);
      } else {
        currentApproval.approved_by = profile.id;
      }
    }

    // Mark current approval as approved
    const { error: approveUpdateError } = await supabase
      .from('application_approvals')
      .update({
        status: 'approved',
        approved_at: new Date()
      })
      .eq('id', currentApproval.id);

    if (approveUpdateError) throw approveUpdateError;

    // Load all approvals in sequence to determine the next approver
    const { data: allApprovals, error: approvalsError } = await supabase
      .from('application_approvals')
      .select('*')
      .eq('application_id', fileId)
      .order('role_order', { ascending: true });

    if (approvalsError || !allApprovals) throw approvalsError;

    const nextApproval = allApprovals.find(approval =>
      approval.role_order > currentApproval.role_order &&
      (approval.status === 'waiting' || approval.status === 'pending')
    );

    if (nextApproval) {
      // Activate next approval step (best-effort; may be blocked by RLS for non-owner rows)
      const { error: nextApprovalError } = await supabase
        .from('application_approvals')
        .update({
          status: 'pending'
        })
        .eq('id', nextApproval.id);

      if (nextApprovalError) {
        console.warn('Could not activate next approval row due to permissions, continuing with file step update:', nextApprovalError);
      }

      // Update file progress
      const { error: fileUpdateError } = await supabase
        .from('files')
        .update({
          current_step: nextApproval.role,
          updated_at: new Date()
        })
        .eq('id', fileId);
      if (fileUpdateError) throw fileUpdateError;

      // Create notification for next officer
      await createNotification(nextApproval.approved_by,
        `📨 File "${file.title}" has been approved by ${profile.name} and forwarded to you.`);

      // Send emails
      await sendApprovalNotification(file, profile.id, comments, nextApproval.role, nextApproval.approved_by);

    } else {
      // All approval steps complete
      const { error: completeUpdateError } = await supabase
        .from('files')
        .update({
          status: 'approved',
          current_step: 'completed',
          updated_at: new Date()
        })
        .eq('id', fileId);
      if (completeUpdateError) throw completeUpdateError;

      // Get full approval path
      const { data: approvals } = await supabase
        .from('application_approvals')
        .select('*, profiles!approved_by (name, role)')
        .eq('application_id', fileId)
        .order('role_order');

      const approvalPath = approvals.map(a => ({
        role: a.role,
        name: a.profiles.name
      }));

      // Notify supervisor
      await createNotification(file.supervisor_id,
        `🎉 Congratulations! Your file "${file.title}" has been fully approved by all officers.`);

      // Send completion email
      await sendCompletionNotification(file, approvalPath);
    }

    return actionSuccess('Approved and moved to next stage');

  } catch (error) {
    console.error('Error approving file:', error);
    return actionFailure(error?.message || 'Approve failed', error);
  }
}

// Reject file - updated with email notification
export async function rejectFile(fileId, comments) {
  const officer = await getCurrentOfficer();
  if (!officer) return actionFailure('Authentication required');

  const { profile } = officer;
  const currentRole = profile.normalizedRole || normalizeRole(profile.role);

  try {
    // Load file first (used for fallback authorization checks)
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();
    if (fileError || !file) throw fileError;

    let currentApproval = await findActionableApproval(fileId, profile, currentRole, file.current_step);

    if (!currentApproval) {
      console.error('No actionable pending step for current officer.');
      return actionFailure('No actionable pending step for current officer');
    }

    if (currentApproval.status === 'waiting') {
      const { error: activateError } = await supabase
        .from('application_approvals')
        .update({ status: 'pending' })
        .eq('id', currentApproval.id);
      if (activateError) {
        console.error('Failed to activate waiting step:', activateError);
      } else {
        currentApproval.status = 'pending';
      }
    }

    if (!currentApproval.approved_by) {
      const { error: claimError } = await supabase
        .from('application_approvals')
        .update({ approved_by: profile.id })
        .eq('id', currentApproval.id);
      if (claimError) {
        console.error('Failed to claim pending approval row:', claimError);
      } else {
        currentApproval.approved_by = profile.id;
      }
    }

    // Update file status to rejected
    const { error: fileRejectError } = await supabase
      .from('files')
      .update({
        status: 'rejected',
        current_step: 'rejected',
        updated_at: new Date()
      })
      .eq('id', fileId);
    if (fileRejectError) throw fileRejectError;

    // Update approval step
    const { error: approvalRejectError } = await supabase
      .from('application_approvals')
      .update({
        status: 'rejected',
        approved_at: new Date()
      })
      .eq('id', currentApproval.id);
    if (approvalRejectError) throw approvalRejectError;

    // Close all remaining steps because workflow is terminated (best-effort)
    const { error: closeStepsError } = await supabase
      .from('application_approvals')
      .update({
        status: 'rejected'
      })
      .eq('application_id', fileId)
      .in('status', ['pending', 'waiting']);
    if (closeStepsError) {
      console.warn('Could not close remaining steps due to permissions:', closeStepsError);
    }

    // Notify supervisor
    await createNotification(file.supervisor_id,
      `❌ Your file "${file.title}" was rejected by ${profile.name}.\nReason: ${comments}`);

    // Send rejection email
    await sendRejectionNotification(file, profile.id, comments);

    return actionSuccess('Rejected and notified supervisor');

  } catch (error) {
    console.error('Error rejecting file:', error);
    return actionFailure(error?.message || 'Reject failed', error);
  }
}

// Get file status with complete history
export async function getFileStatus(fileId) {
  const { data: file, error } = await supabase
    .from('files')
    .select(`
      *,
      supervisor:profiles!files_supervisor_id_fkey (name, email),
      house_tutor:profiles!files_house_tutor_id_fkey (name),
      assistant_provost:profiles!files_assistant_provost_id_fkey (name),
      provost:profiles!files_provost_id_fkey (name),
      treasurer:profiles!files_treasurer_id_fkey (name),
      vc:profiles!files_vc_id_fkey (name),
      application_approvals(*, approver:profiles!approved_by (name, role))
    `)
    .eq('id', fileId)
    .single();

  if (error) {
    console.error('Error getting file status:', error);
    return null;
  }

  return file;
}