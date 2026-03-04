import { supabase } from "./supabase.js";
import { redirectByRole } from "./roleRouter.js";


// ================= SIGNUP =================
window.signup = async function () {

  const email = document.getElementById("email").value;
  const password = document.getElementById("regPassword").value;
  const role = document.getElementById("userType").value;
  const department =
    document.getElementById("department")?.value || null;
  const floor =
    document.getElementById("floor")?.value || null;

  // 1️⃣ create auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  const user = data.user;

if (!user) {
  alert("Check your email to confirm account.");
  return;
}

  // 2️⃣ insert profile
  const { error: profileError } =
    await supabase.from("profiles").insert({
      id: user.id,
      role: role,
      department: department,
      floor: floor
    });

  if (profileError) {
    alert(profileError.message);
    return;
  }

  alert("Account created ✅ Now login");


// clear form (optional but good)
document.getElementById("email").value = "";
document.getElementById("regPassword").value = "";

// redirect to login page automatically
window.location.href = "index.html";
};

// LOGIN
window.login = async function () {

  // ✅ get inputs correctly
  const emailInput = document.getElementById("login_email");
  const passwordInput = document.getElementById("login_password");

  const email = emailInput.value;
  const password = passwordInput.value;

  // safety check
  if (!email || !password) {
    alert("Enter email & password");
    return;
    
  }

  // login request
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  // ✅ redirect by role
  await redirectByRole();
};

// LOGOUT
window.logout = async function () {
  await supabase.auth.signOut();

  // always go to login page
  window.location.href = "../index.html";
};
