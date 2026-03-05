import { isAdmin, redirectByRole } from '../roleRouter.js';

// Role Switcher HTML জেনারেট করার ফাংশন
export async function renderRoleSwitcher() {
  const admin = await isAdmin();
  
  if (!admin) {
    return '<div style="display: none;"></div>';
  }
  
  return `
    <div class="role-switcher">
      <select id="roleSwitcher" onchange="window.handleRoleSwitch(this.value)" class="role-select">
        <option value="">🔀 Switch Role (Admin)</option>
        <option value="supervisor">👤 Supervisor</option>
        <option value="house_tutor">🏠 House Tutor</option>
        <option value="assistant_provost">👔 Assistant Provost</option>
        <option value="provost">👑 Provost</option>
        <option value="treasurer">💰 Treasurer</option>
        <option value="vc">🎓 Vice Chancellor</option>
        <option value="admin">⚙️ Admin</option>
      </select>
    </div>
  `;
}

// Role Switch হ্যান্ডলার
export async function handleRoleSwitch(role) {
  if (!role) return;
  
  const admin = await isAdmin();
  if (!admin) {
    alert('Only admin can switch roles!');
    return;
  }
  
  const roleNames = {
    'supervisor': 'Supervisor',
    'house_tutor': 'House Tutor',
    'assistant_provost': 'Assistant Provost',
    'provost': 'Provost',
    'treasurer': 'Treasurer',
    'vc': 'Vice Chancellor',
    'admin': 'Admin'
  };
  
  const confirmSwitch = confirm(`Switch to ${roleNames[role]} dashboard?`);
  if (confirmSwitch) {
    await redirectByRole(role);
  }
}

// Role Switcher initialize করার ফাংশন
export async function initRoleSwitcher() {
  try {
    const admin = await isAdmin();
    
    const container = document.getElementById('roleSwitcherContainer');
    if (!container) {
      return;
    }
    
    if (admin) {
      const switcherHtml = await renderRoleSwitcher();
      container.innerHTML = switcherHtml;
      window.handleRoleSwitch = handleRoleSwitch;
    } else {
      container.innerHTML = '';
    }
  } catch (error) {
    console.error('Error initializing role switcher:', error);
  }
}