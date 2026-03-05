import { supabase } from "./supabase.js";

// ব্যাক বাটন disable করার ফাংশন
export function disableBackButton() {
  history.pushState(null, null, location.href);
  
  window.addEventListener('popstate', function(event) {
    history.pushState(null, null, location.href);
  });
}

// অথেন্টিকেশন চেক করার ফাংশন
export async function requireAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    window.location.replace('../index.html');
    return false;
  }
  
  return true;
}

// রোল চেক করার ফাংশন
export async function requireRole(allowedRoles) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    window.location.replace('../index.html');
    return false;
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (!allowedRoles.includes(profile.role)) {
    alert('এই পেজে আপনার প্রবেশাধিকার নেই');
    window.location.replace('../index.html');
    return false;
  }
  
  return true;
}