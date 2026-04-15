import { supabase } from "./supabase.js";
import { 
  newFileTemplate,
  approvedTemplate,
  rejectedTemplate,
  forwardedTemplate,
  completedTemplate 
} from './emailTemplates.js';  // এই লাইনটা ইম্পোর্ট করুন

// বাকি কোড একই থাকবে, শুধু emailTemplates এর জায়গায় নতুন template গুলো ব্যবহার করুন

// Email templates
const emailTemplates = {
  newFile: (data) => ({
    subject: `📁 New File Requires Your Approval - ${data.fileTitle}`,
    html: `
      <h2>New File for Approval</h2>
      <p>Dear ${data.officerName},</p>
      <p>A new file has been submitted by <strong>${data.supervisorName}</strong> that requires your approval.</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>File Title:</strong> ${data.fileTitle}</p>
        <p><strong>Description:</strong> ${data.fileDescription || 'No description'}</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <p>Please login to review and take action.</p>
      <a href="${window.location.origin}/File_Movement_-_Approval/index.html" 
         style="background: #3f8fd5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">
        Login to Dashboard
      </a>
    `
  }),

  fileApproved: (data) => ({
    subject: `✅ File Approved - ${data.fileTitle}`,
    html: `
      <h2>File Approved</h2>
      <p>Dear ${data.supervisorName},</p>
      <p>Your file <strong>"${data.fileTitle}"</strong> has been approved by <strong>${data.approverName}</strong>.</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Approved by:</strong> ${data.approverName} (${data.approverRole})</p>
        <p><strong>Comments:</strong> ${data.comments || 'No comments'}</p>
        <p><strong>Next Step:</strong> ${data.nextStep || 'Completed'}</p>
      </div>
      <p><a href="${window.location.origin}/File_Movement_-_Approval/index.html">View File Status</a></p>
    `
  }),

  fileRejected: (data) => ({
    subject: `❌ File Rejected - ${data.fileTitle}`,
    html: `
      <h2>File Rejected</h2>
      <p>Dear ${data.supervisorName},</p>
      <p>Your file <strong>"${data.fileTitle}"</strong> has been rejected by <strong>${data.rejecterName}</strong>.</p>
      <div style="background: #ffebee; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #e74c3c;">
        <p><strong>Rejected by:</strong> ${data.rejecterName} (${data.rejecterRole})</p>
        <p><strong>Reason:</strong> ${data.reason || 'No reason provided'}</p>
      </div>
      <p>Please login to view details and take necessary action.</p>
      <a href="${window.location.origin}/File_Movement_-_Approval/index.html" 
         style="background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">
        View File
      </a>
    `
  }),

  fileForwarded: (data) => ({
    subject: `⏩ File Forwarded to You - ${data.fileTitle}`,
    html: `
      <h2>File Forwarded for Your Approval</h2>
      <p>Dear ${data.officerName},</p>
      <p>A file has been forwarded to you by <strong>${data.forwarderName}</strong>.</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>File Title:</strong> ${data.fileTitle}</p>
        <p><strong>From:</strong> ${data.forwarderName} (${data.forwarderRole})</p>
        <p><strong>Comments:</strong> ${data.comments || 'No comments'}</p>
      </div>
      <p>Please review and take action.</p>
      <a href="${window.location.origin}/File_Movement_-_Approval/index.html" 
         style="background: #3f8fd5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">
        Review File
      </a>
    `
  }),

  fileCompleted: (data) => ({
    subject: `🎉 File Fully Approved - ${data.fileTitle}`,
    html: `
      <h2>Congratulations! File Fully Approved</h2>
      <p>Dear ${data.supervisorName},</p>
      <p>Your file <strong>"${data.fileTitle}"</strong> has been approved by all officers.</p>
      <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>File:</strong> ${data.fileTitle}</p>
        <p><strong>Completed on:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Approval Path:</strong></p>
        <ul>
          ${data.approvalPath.map(step => `<li>✅ ${step.role}: ${step.name}</li>`).join('')}
        </ul>
      </div>
      <p><a href="${window.location.origin}/File_Movement_-_Approval/index.html">View Final File</a></p>
    `
  })
};

// Send email function
export async function sendEmail(to, template, data) {
  try {
    console.log('=================================');
    console.log(`📧 Email to: ${to}`);
    console.log(`Subject: ${template.subject}`);
    console.log('Template data:', data);
    console.log('=================================');
    
    // TODO: Integrate with actual email service (SendGrid, Resend, etc.)
    // For development, just log
    
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

// Get user email by ID
async function getUserEmail(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('email, name, role')
    .eq('id', userId)
    .single();
  return data;
}

// Notification functions
export async function sendNewFileNotification(fileData, approverId) {
  const approver = await getUserEmail(approverId);
  const supervisor = await getUserEmail(fileData.supervisor_id);
  
  return sendEmail(
    approver.email,
    emailTemplates.newFile({
      officerName: approver.name,
      supervisorName: supervisor.name,
      fileTitle: fileData.title,
      fileDescription: fileData.description
    })
  );
}

export async function sendApprovalNotification(fileData, approverId, comments, nextStep, nextOfficerId = null) {
  const approver = await getUserEmail(approverId);
  const supervisor = await getUserEmail(fileData.supervisor_id);
  
  // Notify supervisor
  await sendEmail(
    supervisor.email,
    emailTemplates.fileApproved({
      supervisorName: supervisor.name,
      fileTitle: fileData.title,
      approverName: approver.name,
      approverRole: approver.role,
      comments: comments,
      nextStep: nextStep
    })
  );
  
  // Notify next officer if exists
  if (nextStep && nextOfficerId) {
    const nextOfficer = await getUserEmail(nextOfficerId);
    
    await sendEmail(
      nextOfficer.email,
      emailTemplates.fileForwarded({
        officerName: nextOfficer.name,
        fileTitle: fileData.title,
        forwarderName: approver.name,
        forwarderRole: approver.role,
        comments: comments
      })
    );
  }
}

export async function sendRejectionNotification(fileData, rejecterId, reason) {
  const rejecter = await getUserEmail(rejecterId);
  const supervisor = await getUserEmail(fileData.supervisor_id);
  
  return sendEmail(
    supervisor.email,
    emailTemplates.fileRejected({
      supervisorName: supervisor.name,
      fileTitle: fileData.title,
      rejecterName: rejecter.name,
      rejecterRole: rejecter.role,
      reason: reason
    })
  );
}

export async function sendCompletionNotification(fileData, approvalPath) {
  const supervisor = await getUserEmail(fileData.supervisor_id);
  
  return sendEmail(
    supervisor.email,
    emailTemplates.fileCompleted({
      supervisorName: supervisor.name,
      fileTitle: fileData.title,
      approvalPath: approvalPath
    })
  );
}