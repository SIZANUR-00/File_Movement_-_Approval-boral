import { supabase } from "./supabase.js";
import { 
  sendApprovalNotification, 
  sendRejectionNotification, 
  sendCompletionNotification 
} from './emailService.js';

function normalizeRole(role = '') {
  return String(role).trim().toLowerCase().replace(/\s+/g, '_');
}

function actionSuccess(message) {
  return { success: true, message };
}

function actionFailure(message, error = null) {
  console.error('Action failed:', message, error);
  return { success: false, message, error };
}

function isActionableStatus(status) {
  return status === 'pending';
}

function isNextStepStatus(status) {
  return status === 'waiting' || status === 'pending';
}

const ORDERED_FLOW_ROLES = ['house_tutor', 'assistant_provost', 'provost', 'treasurer', 'vc'];

function getConfiguredFlowFromFile(file) {
  return ORDERED_FLOW_ROLES.filter((role) => file?.[`${role}_id`]);
}

async function ensureNextApprovalStep(file, currentApproval) {
  const flowRoles = getConfiguredFlowFromFile(file);
  const currentRole = normalizeRole(currentApproval?.role);
  const currentIndex = flowRoles.indexOf(currentRole);
  if (currentIndex < 0) return null;

  const nextRole = flowRoles[currentIndex + 1];
  if (!nextRole) return null;

  const nextOfficerId = file?.[`${nextRole}_id`];
  if (!nextOfficerId) return null;

  const { data: existingNext } = await supabase
    .from('application_approvals')
    .select('*')
    .eq('application_id', file.id)
    .eq('role', nextRole)
    .limit(1);

  if (existingNext && existingNext.length > 0) {
    const nextRow = existingNext[0];
    if (nextRow.status !== 'pending') {
      await supabase
        .from('application_approvals')
        .update({ status: 'pending' })
        .eq('id', nextRow.id);
      return { ...nextRow, status: 'pending' };
    }
    return nextRow;
  }

  const { data: insertedNext, error: insertError } = await supabase
    .from('application_approvals')
    .insert({
      application_id: file.id,
      role: nextRole,
      role_order: currentApproval.role_order + 1,
      approved_by: nextOfficerId,
      status: 'pending',
      created_at: new Date().toISOString()
    })
    .select('*')
    .single();

  if (insertError) {
    console.error('Failed to insert missing next approval:', insertError);
    return null;
  }

  return insertedNext;
}

/* =========================================================
   🆕 IMPROVED NOTIFICATION (Code-1 + Code-2 MERGED)
========================================================= */
async function createNotification(userId, message, fileId = null) {
  if (!userId) return;

  await supabase.from('notifications').insert({
    user_id: userId,
    message,
    file_id: fileId, // ✅ added from Code-1
    created_at: new Date()
  });
}

/* =========================================================
   OFFICER AUTH
========================================================= */
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

/* =========================================================
   FIND APPROVAL (Code-2 core - unchanged)
========================================================= */
async function findActionableApproval(fileId, profile, currentRole, fileCurrentStep = '') {
  const { data: strictRow } = await supabase
    .from('application_approvals')
    .select('*')
    .eq('application_id', fileId)
    .eq('approved_by', profile.id)
    .eq('status', 'pending')
    .limit(1);

  if (strictRow && strictRow.length > 0) {
    return strictRow[0];
  }

  const { data: rows } = await supabase
    .from('application_approvals')
    .select('*')
    .eq('application_id', fileId)
    .eq('status', 'pending')
    .order('role_order', { ascending: true });

  if (rows?.length) {
    const candidates = rows.filter(r => normalizeRole(r.role) === currentRole);
    if (candidates.length) return candidates[0];
  }

  return null;
}

/* =========================================================
   APPROVE FILE (Code-2 + Code-1 behavior merged)
========================================================= */
export async function approveFile(fileId, comments = '') {
  const officer = await getCurrentOfficer();
  if (!officer) return actionFailure('Authentication required');

  const { profile } = officer;
  const currentRole = profile.normalizedRole;

  try {
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fileError || !file) throw fileError;
    if (normalizeRole(file.current_step) !== currentRole) {
      return actionFailure('This file is not currently assigned to your role');
    }

    let currentApproval = await findActionableApproval(
      fileId,
      profile,
      currentRole,
      file.current_step
    );

    if (!currentApproval) {
      return actionFailure('No actionable step found');
    }

    await supabase
      .from('application_approvals')
      .update({
        status: 'approved',
        approved_at: new Date()
      })
      .eq('id', currentApproval.id);

    const { data: allApprovals } = await supabase
      .from('application_approvals')
      .select('*')
      .eq('application_id', fileId)
      .order('role_order');

    const nextApproval = allApprovals.find(a =>
      a.role_order > currentApproval.role_order &&
      isNextStepStatus(a.status)
    );

    const resolvedNextApproval = nextApproval || await ensureNextApprovalStep(file, currentApproval);

    if (resolvedNextApproval) {
      await supabase
        .from('application_approvals')
        .update({
          status: 'pending'
        })
        .eq('id', resolvedNextApproval.id);

      await supabase
        .from('files')
        .update({
          status: 'pending',
          current_step: resolvedNextApproval.role,
          updated_at: new Date()
        })
        .eq('id', fileId);

      // ✅ Code-1 style notification (with file_id)
      await createNotification(
        resolvedNextApproval.approved_by,
        `📄 "${file.title}" forwarded to you`,
        fileId
      );

      await createNotification(
        file.supervisor_id,
        `✅ "${file.title}" approved by ${profile.name}`,
        fileId
      );

      await sendApprovalNotification(
        file,
        profile.id,
        comments,
        resolvedNextApproval.role,
        resolvedNextApproval.approved_by
      );

      return actionSuccess(`Forwarded to ${resolvedNextApproval.role}`);
    }

    await supabase
      .from('files')
      .update({
        status: 'approved',
        current_step: 'completed',
        updated_at: new Date()
      })
      .eq('id', fileId);

    await createNotification(
      file.supervisor_id,
      `🎉 File "${file.title}" fully approved`,
      fileId
    );

    await sendCompletionNotification(file, []);

    return actionSuccess('Fully approved');

  } catch (error) {
    return actionFailure(error.message, error);
  }
}

/* =========================================================
   REJECT FILE (Code-2 + Code-1 notification style)
========================================================= */
export async function rejectFile(fileId, comments) {
  const officer = await getCurrentOfficer();
  if (!officer) return actionFailure('Authentication required');

  const { profile } = officer;
  const currentRole = profile.normalizedRole;

  if (!comments) return actionFailure('Comments required');

  try {
    const { data: file, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error || !file) throw error;
    if (normalizeRole(file.current_step) !== currentRole) {
      return actionFailure('This file is not currently assigned to your role');
    }

    const currentApproval = await findActionableApproval(
      fileId,
      profile,
      currentRole,
      file.current_step
    );

    if (!currentApproval) {
      return actionFailure('No actionable step found');
    }

    await supabase
      .from('files')
      .update({
        status: 'rejected',
        current_step: 'rejected',
        updated_at: new Date()
      })
      .eq('id', fileId);

    await supabase
      .from('application_approvals')
      .update({
        status: 'rejected',
        comments
      })
      .eq('id', currentApproval.id);

    // Code-1 style notification format
    await createNotification(
      file.supervisor_id,
      `❌ "${file.title}" rejected by ${profile.name}. Reason: ${comments}`,
      fileId
    );

    await sendRejectionNotification(file, profile.id, comments);

    return actionSuccess('Rejected');

  } catch (error) {
    return actionFailure(error.message, error);
  }
}

/* =========================================================
   FILE STATUS (unchanged core)
========================================================= */
export async function getFileStatus(fileId) {
  const { data, error } = await supabase
    .from('files')
    .select(`*, application_approvals(*)`)
    .eq('id', fileId)
    .single();

  if (error) return null;
  return data;
}

/* =========================================================
   LOAD FILES (Code-2 main + Code-1 fallback added)
========================================================= */
export async function loadPendingFiles() {
  const officer = await getCurrentOfficer();
  if (!officer) return [];

  const role = officer.profile.normalizedRole;

  const { data: files } = await supabase
    .from('files')
    .select('*')
    .eq('status', 'pending')
    .eq('current_step', role);

  return files || [];
}

/* =========================================================
   🆕 STATS (Code-1 version added as fallback option)
========================================================= */
export async function loadOfficerDecisionStats() {
  const officer = await getCurrentOfficer();
  if (!officer) return { pending: 0, approved: 0, rejected: 0 };

  const officerId = officer.profile.id;
  const { data: approvals } = await supabase
    .from('application_approvals')
    .select('status')
    .eq('approved_by', officerId);

  if (!approvals) return { pending: 0, approved: 0, rejected: 0 };

  return {
    pending: approvals.filter(a => a.status === 'pending').length,
    approved: approvals.filter(a => a.status === 'approved').length,
    rejected: approvals.filter(a => a.status === 'rejected').length
  };
}

/* =========================================================
   REVIEW FILES (kept Code-2 logic, no break)
========================================================= */
export async function loadOfficerReviewFiles() {
  const officer = await getCurrentOfficer();
  if (!officer) return [];

  const officerId = officer.profile.id;

  const { data } = await supabase
    .from('application_approvals')
    .select('application_id')
    .eq('approved_by', officerId);

  if (!data || data.length === 0) return [];

  const ids = [...new Set(data.map(d => d.application_id))];

  const { data: files } = await supabase
    .from('files')
    .select('*')
    .in('id', ids);

  return files || [];
}