import { supabase } from './supabase.js';
import { sendNewFileNotification } from './emailService.js';

// ==================== GLOBAL STATE ====================
let officersByRole = {
  house_tutor: [],
  assistant_provost: [],
  provost: [],
  treasurer: [],
  vc: []
};

let selectedOfficers = {}; // Track selected officer IDs per step { stepNumber: officerId }
let selectedRoles = {}; // Track selected roles per step { stepNumber: role }
let stepCounter = 1;
let currentUser = null;

// ==================== HELPER FUNCTIONS ====================
function getRoleName(role) {
  const names = {
    house_tutor: 'House Tutor',
    assistant_provost: 'Assistant Provost',
    provost: 'Provost',
    treasurer: 'Treasurer',
    vc: 'Vice Chancellor'
  };
  return names[role] || role;
}

// Get all currently selected officer IDs (to prevent duplicate person)
function getSelectedOfficerIds() {
  const selectedIds = [];
  for (const [step, officerId] of Object.entries(selectedOfficers)) {
    if (officerId) {
      selectedIds.push(officerId);
    }
  }
  return selectedIds;
}

// Check if a specific officer is already selected in any step
function isOfficerAlreadySelected(officerId, currentStep) {
  for (const [step, selectedId] of Object.entries(selectedOfficers)) {
    if (parseInt(step) !== currentStep && selectedId === officerId) {
      return true;
    }
  }
  return false;
}

// Enable/disable submit button
function validateSubmitButton() {
  const steps = document.querySelectorAll('.step-card');
  let allValid = steps.length > 0;
  
  for (let i = 0; i < steps.length; i++) {
    const stepNum = i + 1;
    const roleSelect = document.querySelector(`.role-select[data-step="${stepNum}"]`);
    const officerSelect = document.querySelector(`.officer-select[data-step="${stepNum}"]`);
    
    if (!roleSelect?.value || !officerSelect?.value) {
      allValid = false;
      break;
    }
  }
  
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.disabled = !allValid;
}

// Update path summary
function updatePathSummary() {
  const steps = document.querySelectorAll('.step-card');
  const summaryDiv = document.getElementById('pathSummary');
  
  if (steps.length === 0) {
    summaryDiv.innerHTML = '<span style="color: #a0aec0;">No approvers selected yet</span>';
    return;
  }
  
  let html = '<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">';
  
  steps.forEach((step, index) => {
    const stepNum = index + 1;
    const roleSelect = step.querySelector('.role-select');
    const officerSelect = step.querySelector('.officer-select');
    const role = roleSelect?.value;
    const officerName = officerSelect?.selectedOptions[0]?.text || 'Not selected';
    
    if (role && officerSelect?.value) {
      html += `<span style="background: #2b8c5e; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
        ${getRoleName(role)}<br><small>${officerName.substring(0, 20)}</small>
      </span>`;
    } else if (role) {
      html += `<span style="background: #ed8936; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
        ${getRoleName(role)} (⚠️ incomplete)
      </span>`;
    } else {
      html += `<span style="background: #cbd5e0; color: #4a5568; padding: 5px 12px; border-radius: 20px; font-size: 12px;">
        Step ${stepNum} (pending)
      </span>
      `;
    }
    
    if (index < steps.length - 1) {
      html += `<span style="font-size: 18px; color: #2b8c5e;">→</span>`;
    }
  });
  
  html += '</div>';
  summaryDiv.innerHTML = html;
}

// Populate officers dropdown (excluding already selected officers)
async function populateOfficers(stepNumber, selectedRole) {
  const officerSelect = document.querySelector(`.officer-select[data-step="${stepNumber}"]`);
  if (!officerSelect) return;
  
  officerSelect.innerHTML = '<option value="">Loading officers...</option>';
  officerSelect.disabled = true;
  
  if (!selectedRole) {
    officerSelect.innerHTML = '<option value="">-- First Select Role --</option>';
    validateSubmitButton();
    return;
  }
  
  const allOfficers = officersByRole[selectedRole] || [];
  const selectedOfficerIds = getSelectedOfficerIds();
  
  // Filter out already selected officers (except current step's selection)
  const currentSelection = selectedOfficers[stepNumber];
  const availableOfficers = allOfficers.filter(officer => 
    !selectedOfficerIds.includes(officer.id) || officer.id === currentSelection
  );
  
  if (availableOfficers.length === 0) {
    officerSelect.innerHTML = '<option value="">-- No available officers --</option>';
  } else {
    officerSelect.innerHTML = '<option value="">-- Select Officer --</option>';
    availableOfficers.forEach(officer => {
      const option = document.createElement('option');
      option.value = officer.id;
      if (selectedRole === 'house_tutor') {
        option.textContent = `${officer.name} (Floor: ${officer.floor || 'Ground'})`;
      } else {
        option.textContent = officer.name;
      }
      officerSelect.appendChild(option);
    });
    officerSelect.disabled = false;
  }
  
  validateSubmitButton();
}

// Handle officer selection change
function handleOfficerChange(stepNumber) {
  const officerSelect = document.querySelector(`.officer-select[data-step="${stepNumber}"]`);
  if (!officerSelect) return;
  
  const selectedOfficerId = officerSelect.value;
  
  // Check if this officer is already selected in another step
  if (selectedOfficerId && isOfficerAlreadySelected(selectedOfficerId, stepNumber)) {
    alert(`⚠️ This officer is already selected in another step! Each officer can only approve once.`);
    officerSelect.value = '';
    delete selectedOfficers[stepNumber];
  } else if (selectedOfficerId) {
    selectedOfficers[stepNumber] = selectedOfficerId;
  } else {
    delete selectedOfficers[stepNumber];
  }
  
  updatePathSummary();
  validateSubmitButton();
}

// Handle role selection change
function handleRoleChange(stepNumber) {
  console.log(`Role changed for step ${stepNumber}`);
  
  const roleSelect = document.querySelector(`.role-select[data-step="${stepNumber}"]`);
  if (!roleSelect) return;
  
  const selectedRole = roleSelect.value;
  console.log(`Selected role: ${selectedRole}`);
  
  // Reset officer select
  const officerSelect = document.querySelector(`.officer-select[data-step="${stepNumber}"]`);
  if (officerSelect) {
    officerSelect.value = '';
    officerSelect.disabled = true;
  }
  
  // Remove from selectedOfficers
  delete selectedOfficers[stepNumber];
  
  if (!selectedRole) {
    delete selectedRoles[stepNumber];
    populateOfficers(stepNumber, null);
    updatePathSummary();
    return;
  }
  
  // Store selected role
  selectedRoles[stepNumber] = selectedRole;
  
  // Populate officers
  populateOfficers(stepNumber, selectedRole);
  updatePathSummary();
}

// Add new approval step
function addApprovalStep() {
  const currentSteps = document.querySelectorAll('.step-card');
  const newStepNumber = currentSteps.length + 1;
  
  const container = document.getElementById('stepsContainer');
  
  const stepDiv = document.createElement('div');
  stepDiv.className = 'step-card';
  stepDiv.setAttribute('data-step', newStepNumber);
  
  stepDiv.innerHTML = `
    <div class="step-header">
      <span class="step-number">${newStepNumber}</span>
      <strong>Approver #${newStepNumber}</strong>
    </div>
    <div class="step-controls">
      <select class="role-select" data-step="${newStepNumber}" style="flex: 2;">
        <option value="">-- Select Role --</option>
        <option value="house_tutor">🏠 House Tutor</option>
        <option value="assistant_provost">📘 Assistant Provost</option>
        <option value="provost">🏛️ Provost</option>
        <option value="treasurer">💰 Treasurer</option>
        <option value="vc">🎓 Vice Chancellor</option>
      </select>
      <select class="officer-select" data-step="${newStepNumber}" style="flex: 3;" disabled>
        <option value="">-- First Select Role --</option>
      </select>
      <button type="button" class="remove-step" data-step="${newStepNumber}">
        <i class="fas fa-trash"></i> Remove
      </button>
    </div>
  `;
  
  container.appendChild(stepDiv);
  
  // Add event listeners
  const roleSelect = stepDiv.querySelector('.role-select');
  const officerSelect = stepDiv.querySelector('.officer-select');
  const removeBtn = stepDiv.querySelector('.remove-step');
  
  roleSelect.addEventListener('change', () => handleRoleChange(newStepNumber));
  officerSelect.addEventListener('change', () => handleOfficerChange(newStepNumber));
  removeBtn.addEventListener('click', () => removeStep(newStepNumber));
  
  updatePathSummary();
  updateRemoveButtonsVisibility();
  validateSubmitButton();
}

// ==================== SIMPLIFIED REMOVE STEP - ALWAYS WORKS ====================
function removeStep(stepNumber) {
  console.log(`=== REMOVING STEP ${stepNumber} ===`);
  
  const stepElement = document.querySelector(`.step-card[data-step="${stepNumber}"]`);
  if (!stepElement) {
    console.log('Step element not found!');
    return;
  }
  
  // Get all steps
  const allSteps = document.querySelectorAll('.step-card');
  console.log('Total steps before removal:', allSteps.length);
  
  // Create an array to store all step data in order
  const stepsData = [];
  
  // Collect data from all steps in their current order
  allSteps.forEach(step => {
    const currentStepNum = parseInt(step.getAttribute('data-step'));
    const roleSelect = step.querySelector('.role-select');
    const officerSelect = step.querySelector('.officer-select');
    
    stepsData.push({
      oldStepNum: currentStepNum,
      role: roleSelect?.value || '',
      officerId: officerSelect?.value || '',
      officerText: officerSelect?.selectedOptions[0]?.text || '',
      roleSelect: roleSelect,
      officerSelect: officerSelect,
      stepElement: step
    });
  });
  
  console.log('Steps data collected:', stepsData.map(d => ({ oldStep: d.oldStepNum, role: d.role, officer: d.officerId })));
  
  // Remove the selected step from the array
  const filteredStepsData = stepsData.filter(data => data.oldStepNum !== stepNumber);
  console.log('After filter, steps left:', filteredStepsData.length);
  
  // Remove the step element from DOM
  stepElement.remove();
  
  // Clear global tracking objects
  Object.keys(selectedRoles).forEach(key => delete selectedRoles[key]);
  Object.keys(selectedOfficers).forEach(key => delete selectedOfficers[key]);
  
  // Now renumber and restore each remaining step
  filteredStepsData.forEach((data, newIndex) => {
    const newStepNum = newIndex + 1;
    const step = data.stepElement;
    
    console.log(`Renumbering step: old=${data.oldStepNum} -> new=${newStepNum}, role=${data.role}, officer=${data.officerId}`);
    
    // Update data-step attribute
    step.setAttribute('data-step', newStepNum);
    
    // Update step number display
    const stepNumberSpan = step.querySelector('.step-number');
    if (stepNumberSpan) {
      stepNumberSpan.textContent = newStepNum;
    }
    
    // Update Approver text
    const strongTag = step.querySelector('strong');
    if (strongTag) {
      strongTag.textContent = `Approver #${newStepNum}`;
    }
    
    // Update role select
    const roleSelect = step.querySelector('.role-select');
    if (roleSelect) {
      roleSelect.setAttribute('data-step', newStepNum);
      
      // Restore role value
      if (data.role) {
        roleSelect.value = data.role;
        selectedRoles[newStepNum] = data.role;
        console.log(`  Restored role: ${data.role}`);
      }
      
      // Reattach event listener (remove old, add new)
      const newRoleSelect = roleSelect.cloneNode(true);
      roleSelect.parentNode.replaceChild(newRoleSelect, roleSelect);
      newRoleSelect.addEventListener('change', () => handleRoleChange(newStepNum));
    }
    
    // Update officer select
    const officerSelect = step.querySelector('.officer-select');
    if (officerSelect) {
      officerSelect.setAttribute('data-step', newStepNum);
      
      // Restore officer value
      if (data.officerId) {
        officerSelect.value = data.officerId;
        selectedOfficers[newStepNum] = data.officerId;
        officerSelect.disabled = false;
        console.log(`  Restored officer: ${data.officerId}`);
      } else {
        officerSelect.disabled = true;
      }
      
      // Reattach event listener
      const newOfficerSelect = officerSelect.cloneNode(true);
      officerSelect.parentNode.replaceChild(newOfficerSelect, officerSelect);
      newOfficerSelect.addEventListener('change', () => handleOfficerChange(newStepNum));
    }
    
    // Update remove button
    const removeBtn = step.querySelector('.remove-step');
    if (removeBtn) {
      removeBtn.setAttribute('data-step', newStepNum);
      
      const newRemoveBtn = removeBtn.cloneNode(true);
      removeBtn.parentNode.replaceChild(newRemoveBtn, removeBtn);
      newRemoveBtn.addEventListener('click', () => removeStep(newStepNum));
    }
  });
  
  // Update step counter
  stepCounter = filteredStepsData.length;
  
  console.log('Final selectedRoles:', JSON.stringify(selectedRoles));
  console.log('Final selectedOfficers:', JSON.stringify(selectedOfficers));
  console.log(`=== REMOVE COMPLETE ===`);
  
  updatePathSummary();
  updateRemoveButtonsVisibility();
  validateSubmitButton();
}

// Update remove button visibility (hide if only one step)
function updateRemoveButtonsVisibility() {
  const steps = document.querySelectorAll('.step-card');
  const removeBtns = document.querySelectorAll('.remove-step');
  
  removeBtns.forEach(btn => {
    btn.style.display = steps.length === 1 ? 'none' : 'inline-flex';
  });
}

// ==================== LOAD OFFICERS FROM DATABASE ====================
async function loadOfficers() {
  console.log('Loading officers from database...');
  
  try {
    // Load House Tutors
    const { data: houseTutors, error: htError } = await supabase
      .from('profiles')
      .select('id, name, floor')
      .eq('role', 'house_tutor')
      .eq('approval_status', 'approved')
      .order('floor');
    
    if (htError) console.error('House tutor error:', htError);
    officersByRole.house_tutor = houseTutors || [];
    console.log(`Loaded ${officersByRole.house_tutor.length} house tutors`);
    
    // Load Assistant Provosts
    const { data: asstProvosts, error: apError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'assistant_provost')
      .eq('approval_status', 'approved');
    
    if (apError) console.error('Assistant provost error:', apError);
    officersByRole.assistant_provost = asstProvosts || [];
    console.log(`Loaded ${officersByRole.assistant_provost.length} assistant provosts`);
    
    // Load Provosts
    const { data: provosts, error: pError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'provost')
      .eq('approval_status', 'approved');
    
    if (pError) console.error('Provost error:', pError);
    officersByRole.provost = provosts || [];
    console.log(`Loaded ${officersByRole.provost.length} provosts`);
    
    // Load Treasurers
    const { data: treasurers, error: tError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'treasurer')
      .eq('approval_status', 'approved');
    
    if (tError) console.error('Treasurer error:', tError);
    officersByRole.treasurer = treasurers || [];
    console.log(`Loaded ${officersByRole.treasurer.length} treasurers`);
    
    // Load VCs
    const { data: vcs, error: vcError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('role', 'vc')
      .eq('approval_status', 'approved');
    
    if (vcError) console.error('VC error:', vcError);
    officersByRole.vc = vcs || [];
    console.log(`Loaded ${officersByRole.vc.length} VCs`);
    
    console.log('All officers loaded successfully');
    
  } catch (error) {
    console.error('Error loading officers:', error);
  }
}

// ==================== AUTH & USER CHECK ====================
async function checkUserAndLoad() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      window.location.href = '../index.html';
      return null;
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profile?.name) {
      document.getElementById('userName').textContent = profile.name;
    }
    
    currentUser = { user, profile };
    return currentUser;
    
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

// ==================== CREATE NOTIFICATION ====================
async function createNotification(userId, message, fileId = null) {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      message: message,
      file_id: fileId,
      created_at: new Date().toISOString(),
      is_read: false
    });
  } catch (error) {
    console.error('Notification error:', error);
  }
}

// ==================== FORM SUBMISSION ====================
async function submitApplication(e) {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submitBtn');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';
  submitBtn.disabled = true;
  
  const userData = await checkUserAndLoad();
  if (!userData) {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    return;
  }
  
  const { user, profile } = userData;
  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const file = document.getElementById('fileInput').files[0];
  
  if (!title || !description || !file) {
    alert('Please fill all fields and upload a file');
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    return;
  }
  
  // Collect approval steps (in order)
  const steps = document.querySelectorAll('.step-card');
  const approvals = [];
  
  for (let i = 0; i < steps.length; i++) {
    const stepNum = i + 1;
    const roleSelect = document.querySelector(`.role-select[data-step="${stepNum}"]`);
    const officerSelect = document.querySelector(`.officer-select[data-step="${stepNum}"]`);
    
    if (!roleSelect?.value) {
      alert(`Please select a role for Step ${stepNum}`);
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      return;
    }
    
    if (!officerSelect?.value) {
      alert(`Please select an officer for Step ${stepNum}`);
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      return;
    }
    
    approvals.push({
      role: roleSelect.value,
      officer_id: officerSelect.value,
      step_order: stepNum
    });
  }
  
  if (approvals.length === 0) {
    alert('Please add at least one approver');
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    return;
  }
  
  try {
    // Prepare role-wise officer assignments for files table columns
    const roleAssignments = {
      house_tutor_id: null,
      assistant_provost_id: null,
      provost_id: null,
      treasurer_id: null,
      vc_id: null
    };

    approvals.forEach((approval) => {
      const columnName = `${approval.role}_id`;
      if (Object.prototype.hasOwnProperty.call(roleAssignments, columnName) && !roleAssignments[columnName]) {
        roleAssignments[columnName] = approval.officer_id;
      }
    });

    // Upload file
    const fileExt = file.name.split('.').pop();
    const fileName = `files/${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('applications')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabase.storage
      .from('applications')
      .getPublicUrl(fileName);
    
    // Insert into files table
    const { data: fileData, error: fileError } = await supabase
      .from('files')
      .insert({
        title,
        description,
        file_url: urlData.publicUrl,
        current_step: approvals[0]?.role || 'pending',
        status: 'pending',
        supervisor_id: user.id,
        ...roleAssignments,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (fileError) throw fileError;
    
    // Insert approval steps: only first approver is active initially
    for (const approval of approvals) {
      const { error: approvalError } = await supabase
        .from('application_approvals')
        .insert({
          application_id: fileData.id,
          role: approval.role,
          role_order: approval.step_order,
          approved_by: approval.officer_id,
          status: approval.step_order === 1 ? 'pending' : 'waiting',
          created_at: new Date().toISOString()
        });
      
      if (approvalError) throw approvalError;
    }
    
    // Notify first approver
    await createNotification(
      approvals[0].officer_id,
      `📄 New file "${title}" requires your approval. Submitted by ${profile.name}`,
      fileData.id
    );
    
    // Send email
    try {
      await sendNewFileNotification(fileData, approvals[0].officer_id);
    } catch (emailError) {
      console.error('Email error:', emailError);
    }
    
    alert('✅ Application submitted successfully!');
    window.location.href = 'my_applications.html';
    
  } catch (error) {
    console.error('Submission error:', error);
    alert(
      `Failed to submit: ${error.message || 'Unknown error'}\n` +
      `Code: ${error.code || 'N/A'}\n` +
      `Details: ${error.details || 'N/A'}\n` +
      `Hint: ${error.hint || 'N/A'}`
    );
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
}

// ==================== LOGOUT ====================
window.handleLogout = async function() {
  await supabase.auth.signOut();
  window.location.href = '../index.html';
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Page loaded, initializing...');
  
  await checkUserAndLoad();
  await loadOfficers();
  
  // Initialize first step
  const firstRoleSelect = document.querySelector('.role-select[data-step="1"]');
  const firstOfficerSelect = document.querySelector('.officer-select[data-step="1"]');
  
  if (firstRoleSelect) {
    firstRoleSelect.addEventListener('change', () => handleRoleChange(1));
  }
  
  if (firstOfficerSelect) {
    firstOfficerSelect.addEventListener('change', () => handleOfficerChange(1));
  }
  
  // Add step button
  const addBtn = document.getElementById('addStepBtn');
  if (addBtn) {
    addBtn.addEventListener('click', addApprovalStep);
  }
  
  // Form submission
  const form = document.getElementById('applicationForm');
  if (form) {
    form.addEventListener('submit', submitApplication);
  }
  
  updateRemoveButtonsVisibility();
  validateSubmitButton();
  
  console.log('Initialization complete');
});