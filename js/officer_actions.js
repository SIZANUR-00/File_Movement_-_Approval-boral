import { supabase } from "./supabase.js";
import { sendApprovalNotification, sendRejectionNotification, sendCompletionNotification } from './emailService.js';

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

  return { user, profile };
}

// Get next step in workflow (fixed order)
function getNextStep(currentRole) {
  const workflow = {
    'house_tutor': 'assistant_provost',
    'assistant_provost': 'provost',
    'provost': 'treasurer',
    'treasurer': 'vc',
    'vc': null
  };
  return workflow[currentRole];
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
  const roleField = `${profile.role}_id`;

  const { data: files, error } = await supabase
    .from('files')
    .select(`
      *,
      supervisor:profiles!files_supervisor_id_fkey (id, name, email),
      application_approvals(*)
    `)
    .eq(roleField, profile.id)
    .eq('current_step', profile.role)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading files:', error);
    return [];
  }

  return files;
}

// Approve file - updated with email notifications
export async function approveFile(fileId, comments = '') {
  const officer = await getCurrentOfficer();
  if (!officer) return false;

  const { profile } = officer;

  try {
    // Update current step approval
    await supabase
      .from('application_approvals')
      .update({
        status: 'approved',
        approved_at: new Date(),
        comments: comments
      })
      .eq('application_id', fileId)
      .eq('role', profile.role);

    // Get file details
    const { data: file } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    // Determine next step
    const nextStep = getNextStep(profile.role);
    
    if (nextStep) {
      // Forward to next officer
      await supabase
        .from('files')
        .update({
          current_step: nextStep,
          updated_at: new Date()
        })
        .eq('id', fileId);

      // Get next officer's name for notification
      const { data: nextOfficer } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', file[`${nextStep}_id`])
        .single();
      
      // Create notification for next officer
      await createNotification(file[`${nextStep}_id`], 
        `📨 File "${file.title}" has been approved by ${profile.name} and forwarded to you.`);

      // Send emails
      await sendApprovalNotification(file, profile.id, comments, nextStep);

    } else {
      // All approvals complete - final approval by VC
      await supabase
        .from('files')
        .update({
          status: 'approved',
          current_step: 'completed',
          updated_at: new Date()
        })
        .eq('id', fileId);

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

    return true;

  } catch (error) {
    console.error('Error approving file:', error);
    return false;
  }
}

// Reject file - updated with email notification
export async function rejectFile(fileId, comments) {
  const officer = await getCurrentOfficer();
  if (!officer) return false;

  const { profile } = officer;

  try {
    // Update file status to rejected
    await supabase
      .from('files')
      .update({
        status: 'rejected',
        current_step: 'rejected',
        updated_at: new Date()
      })
      .eq('id', fileId);

    // Update approval step
    await supabase
      .from('application_approvals')
      .update({
        status: 'rejected',
        approved_at: new Date(),
        comments: comments
      })
      .eq('application_id', fileId)
      .eq('role', profile.role);

    // Get file details
    const { data: file } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    // Notify supervisor
    await createNotification(file.supervisor_id,
      `❌ Your file "${file.title}" was rejected by ${profile.name}.\nReason: ${comments}`);

    // Send rejection email
    await sendRejectionNotification(file, profile.id, comments);

    return true;

  } catch (error) {
    console.error('Error rejecting file:', error);
    return false;
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