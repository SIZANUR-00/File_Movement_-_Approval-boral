import { supabase } from "./supabase.js";

// ইউজারের রোল সংরক্ষণের জন্য
let userRole = null;

export async function redirectByRole(targetRole = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "../index.html";
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    
    if (error || !profile) {
      console.error("Error fetching profile:", error);
      window.location.href = "../index.html";
      return;
    }

    // ইউজারের রোল সংরক্ষণ
    userRole = profile.role;
    sessionStorage.setItem("userRole", profile.role);
    
    // যদি targetRole দেওয়া থাকে এবং ইউজার অ্যাডমিন হয়, তাহলে সেখানে redirect করুন
    if (targetRole && profile.role === 'admin') {
      redirectToRole(targetRole);
      return;
    }

    // না হলে মূল রোল অনুযায়ী redirect
    redirectToRole(profile.role);

  } catch (error) {
    console.error("Redirect error:", error);
    window.location.href = "../index.html";
  }
}

// রোল অনুযায়ী redirect ফাংশন - পাথ ঠিক করা হয়েছে
function redirectToRole(role) {
  console.log(`Redirecting to ${role} dashboard`);
  
  // বর্তমান পাথ থেকে root বের করা
  const currentPath = window.location.pathname;
  let basePath = '.';
  
  if (currentPath.includes('/employee/')) {
    basePath = '..';
  } else if (currentPath.includes('/admin/')) {
    basePath = '..';
  } else if (currentPath.includes('/Officer/')) {
    basePath = '..';
  }
  
  switch(role) {
    case "supervisor":
      window.location.href = `${basePath}/employee/e_dashboard.html`;
      break;
    case "house_tutor":
      window.location.href = `${basePath}/Officer/house_tutor_dashboard.html`;
      break;
    case "assistant_provost":
      window.location.href = `${basePath}/Officer/assistant_provost_dashboard.html`;
      break;
    case "provost":
      window.location.href = `${basePath}/Officer/provost_dashboard.html`;
      break;
    case "treasurer":
      window.location.href = `${basePath}/Officer/treasurer_dashboard.html`;
      break;
    case "vc":
      window.location.href = `${basePath}/Officer/vc_dashboard.html`;
      break;
    case "admin":
      window.location.href = `${basePath}/admin/a_dashboard.html`;
      break;
    default:
      window.location.href = "../index.html";
  }
}

// বর্তমান রোল পাওয়ার ফাংশন
export function getCurrentRole() {
  return sessionStorage.getItem("userRole") || userRole;
}

// ইউজার অ্যাডমিন কিনা চেক করার ফাংশন
export async function isAdmin() {
  const role = getCurrentRole();
  if (role === 'admin') return true;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  
  return profile?.role === 'admin';
}