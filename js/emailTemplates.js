// ============================================
// BORAL HALL - EMAIL TEMPLATES
// Professional email designs for all notifications
// ============================================

// Base styles - common for all emails
const baseStyles = `
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    body {
      background-color: #f4f7fc;
      padding: 20px;
    }
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .email-header {
      background: linear-gradient(135deg, #1e3c72, #2a5298);
      color: white;
      padding: 30px 25px;
      text-align: center;
    }
    .email-header h1 {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .email-header p {
      font-size: 14px;
      opacity: 0.9;
    }
    .email-content {
      padding: 35px 30px;
    }
    .email-content h2 {
      color: #1e3c72;
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .email-content p {
      color: #4a5568;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .info-card {
      background: #f8fafd;
      border-left: 4px solid #2a5298;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .info-card p {
      margin-bottom: 10px;
    }
    .info-card strong {
      color: #1e3c72;
      min-width: 100px;
      display: inline-block;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 50px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 15px;
    }
    .badge-new {
      background: #e1f0fa;
      color: #1e3c72;
    }
    .badge-approved {
      background: #e3fcef;
      color: #0b5e42;
    }
    .badge-rejected {
      background: #fee2e2;
      color: #991b1b;
    }
    .badge-forwarded {
      background: #fff4e5;
      color: #b45b0b;
    }
    .button {
      display: inline-block;
      background: #2a5298;
      color: white;
      padding: 12px 32px;
      text-decoration: none;
      border-radius: 50px;
      font-weight: 600;
      font-size: 15px;
      margin: 15px 0;
      transition: all 0.3s ease;
      box-shadow: 0 4px 10px rgba(42,82,152,0.3);
    }
    .button:hover {
      background: #1e3c72;
      transform: translateY(-2px);
      box-shadow: 0 6px 15px rgba(42,82,152,0.4);
    }
    .button-reject {
      background: #dc2626;
    }
    .button-reject:hover {
      background: #b91c1c;
    }
    .button-success {
      background: #059669;
    }
    .button-success:hover {
      background: #047857;
    }
    .footer {
      background: #f8fafd;
      padding: 25px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      color: #718096;
      font-size: 13px;
      margin-bottom: 5px;
    }
    .approval-path {
      margin-top: 15px;
    }
    .path-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: #f0f9ff;
      border-radius: 6px;
      margin: 8px 0;
    }
    @media (max-width: 480px) {
      .email-content {
        padding: 25px 20px;
      }
      .info-card {
        padding: 15px;
      }
      .button {
        display: block;
        text-align: center;
      }
    }
  </style>
`;

// ============================================
// 1. NEW FILE SUBMITTED
// Sent to: First officer (House Tutor)
// ============================================
export const newFileTemplate = (data) => {
  const { officerName, supervisorName, fileTitle, fileDescription } = data;
  
  return {
    subject: `📁 New File: ${fileTitle} - Your Approval Required`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${baseStyles}
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-header">
            <h1>🏛️ BORAL HALL</h1>
            <p>File Movement & Approval System</p>
          </div>
          
          <div class="email-content">
            <span class="status-badge badge-new">📨 NEW FILE</span>
            <h2>New File Requires Your Approval</h2>
            
            <p>Dear <strong>${officerName}</strong>,</p>
            <p>A new file has been submitted by <strong>${supervisorName}</strong> that requires your approval.</p>
            
            <div class="info-card">
              <p><strong>File Title:</strong> ${fileTitle}</p>
              <p><strong>Submitted By:</strong> ${supervisorName}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              ${fileDescription ? `<p><strong>Description:</strong> ${fileDescription}</p>` : ''}
            </div>
            
            <div style="text-align: center;">
              <a href="${window.location.origin}/File_Movement_-_Approval/Officer/officer_dashboard.html" class="button">
                VIEW FILE
              </a>
            </div>
            
            <p style="margin-top: 20px; font-size: 13px; color: #718096;">
              This is an automated message. Please do not reply.
            </p>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 Boral Hall. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

// ============================================
// 2. FILE APPROVED
// Sent to: Supervisor
// ============================================
export const approvedTemplate = (data) => {
  const { supervisorName, approverName, approverRole, fileTitle, comments, nextStep } = data;
  
  return {
    subject: `✅ File Approved: ${fileTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${baseStyles}
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-header">
            <h1>🏛️ BORAL HALL</h1>
            <p>File Movement & Approval System</p>
          </div>
          
          <div class="email-content">
            <span class="status-badge badge-approved">✅ APPROVED</span>
            <h2>Your File Has Been Approved</h2>
            
            <p>Dear <strong>${supervisorName}</strong>,</p>
            <p>Your file has been approved and forwarded to the next officer.</p>
            
            <div class="info-card">
              <p><strong>File Title:</strong> ${fileTitle}</p>
              <p><strong>Approved By:</strong> ${approverName} (${approverRole})</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ''}
              <p><strong>Next Step:</strong> ${nextStep ? nextStep.replace('_', ' ').toUpperCase() : 'Completed'}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${window.location.origin}/File_Movement_-_Approval/employee/status.html" class="button">
                VIEW STATUS
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 Boral Hall. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

// ============================================
// 3. FILE REJECTED
// Sent to: Supervisor
// ============================================
export const rejectedTemplate = (data) => {
  const { supervisorName, rejecterName, rejecterRole, fileTitle, reason } = data;
  
  return {
    subject: `❌ File Rejected: ${fileTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${baseStyles}
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-header">
            <h1>🏛️ BORAL HALL</h1>
            <p>File Movement & Approval System</p>
          </div>
          
          <div class="email-content">
            <span class="status-badge badge-rejected">❌ REJECTED</span>
            <h2 style="color: #dc2626;">File Rejected</h2>
            
            <p>Dear <strong>${supervisorName}</strong>,</p>
            <p>Your file has been rejected.</p>
            
            <div class="info-card" style="border-left-color: #dc2626;">
              <p><strong>File Title:</strong> ${fileTitle}</p>
              <p><strong>Rejected By:</strong> ${rejecterName} (${rejecterRole})</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><strong>Reason:</strong> ${reason}</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${window.location.origin}/File_Movement_-_Approval/employee/apply.html" class="button button-reject">
                SUBMIT NEW FILE
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 Boral Hall. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

// ============================================
// 4. FILE FORWARDED
// Sent to: Next officer
// ============================================
export const forwardedTemplate = (data) => {
  const { officerName, forwarderName, forwarderRole, fileTitle, comments } = data;
  
  return {
    subject: `⏩ File Forwarded: ${fileTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${baseStyles}
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-header">
            <h1>🏛️ BORAL HALL</h1>
            <p>File Movement & Approval System</p>
          </div>
          
          <div class="email-content">
            <span class="status-badge badge-forwarded">⏩ FORWARDED</span>
            <h2>File Forwarded for Your Approval</h2>
            
            <p>Dear <strong>${officerName}</strong>,</p>
            <p>A file has been forwarded to you for approval.</p>
            
            <div class="info-card">
              <p><strong>File Title:</strong> ${fileTitle}</p>
              <p><strong>Forwarded By:</strong> ${forwarderName} (${forwarderRole})</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              ${comments ? `<p><strong>Comments:</strong> ${comments}</p>` : ''}
            </div>
            
            <div style="text-align: center;">
              <a href="${window.location.origin}/File_Movement_-_Approval/Officer/officer_dashboard.html" class="button">
                REVIEW NOW
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 Boral Hall. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};

// ============================================
// 5. FILE FULLY APPROVED
// Sent to: Supervisor
// ============================================
export const completedTemplate = (data) => {
  const { supervisorName, fileTitle, approvalPath } = data;
  
  return {
    subject: `🎉 File Fully Approved: ${fileTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${baseStyles}
      </head>
      <body>
        <div class="email-wrapper">
          <div class="email-header">
            <h1>🏛️ BORAL HALL</h1>
            <p>File Movement & Approval System</p>
          </div>
          
          <div class="email-content">
            <span class="status-badge badge-approved">🎉 COMPLETED</span>
            <h2 style="color: #059669;">Congratulations!</h2>
            
            <p>Dear <strong>${supervisorName}</strong>,</p>
            <p>Your file has been approved by all officers.</p>
            
            <div class="info-card" style="border-left-color: #059669;">
              <p><strong>File Title:</strong> ${fileTitle}</p>
              <p><strong>Completed on:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              
              ${approvalPath && approvalPath.length > 0 ? `
                <div class="approval-path">
                  <p><strong>Approval Path:</strong></p>
                  ${approvalPath.map(step => `
                    <div class="path-item">
                      <span style="color: #059669;">✅</span>
                      <span><strong>${step.role.replace('_', ' ').toUpperCase()}:</strong> ${step.name}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
            
            <div style="text-align: center;">
              <a href="${window.location.origin}/File_Movement_-_Approval/employee/my_applications.html" class="button button-success">
                VIEW FILE
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>&copy; 2025 Boral Hall. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
};