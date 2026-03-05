import { supabase } from "./supabase.js";
import { redirectByRole } from "./roleRouter.js";

// ================= SIGNUP =================
window.signup = async function () {
  const firstName = document.getElementById("firstName").value;
  const lastName = document.getElementById("lastName").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("regPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const role = document.getElementById("userType").value;
  const floor = document.getElementById("floor")?.value || null;

  // Validation
  if (!firstName || !lastName || !email || !password || !role) {
    alert("সব ঘর পূরণ করুন");
    return;
  }

  if (password !== confirmPassword) {
    alert("পাসওয়ার্ড মিলছে না");
    return;
  }

  // House Tutor এর জন্য ফ্লোর চেক
  if (role === 'house_tutor' && !floor) {
    alert("হাউস টিউটরের জন্য ফ্লোর সিলেক্ট করুন");
    return;
  }

  const name = firstName + " " + lastName;

  // Check if floor is already taken (for house tutor)
  if (role === 'house_tutor') {
    const { data: existingTutor } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'house_tutor')
      .eq('floor', floor);

    if (existingTutor && existingTutor.length > 0) {
      alert(`Floor ${floor} already has a House Tutor. Please select another floor.`);
      return;
    }
  }

  try {
    // Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          role: role
        }
      }
    });

    if (error) {
      alert(error.message);
      return;
    }

    const user = data.user;

    if (!user) {
      alert("অ্যাকাউন্ট তৈরি হয়েছে। ইমেইল ভেরিফাই করুন।");
      return;
    }

    // Insert profile without department
    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      name: name,
      email: email,
      role: role,
      floor: floor, // শুধু house tutor এর জন্য, অন্যদের null
      approval_status: 'pending',
      created_at: new Date()
    });

    if (profileError) {
      // যদি profile insert এ error হয়, তাহলে auth user ডিলিট করুন
      await supabase.auth.admin.deleteUser(user.id);
      alert(profileError.message);
      return;
    }

    alert("✅ রেজিস্ট্রেশন সম্পন্ন! অ্যাডমিন অ্যাপ্রুভ করার পর আপনি লগইন করতে পারবেন।");
    
    // Clear form
    document.getElementById("firstName").value = "";
    document.getElementById("lastName").value = "";
    document.getElementById("email").value = "";
    document.getElementById("regPassword").value = "";
    document.getElementById("confirmPassword").value = "";
    document.getElementById("userType").value = "";
    document.getElementById("floor").value = "";
    
    // Close popup and show login
    closeAllPopups();
    
  } catch (error) {
    console.error('Signup error:', error);
    alert('রেজিস্ট্রেশন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
  }
};

// ================= LOGIN =================
window.login = async function () {
  const email = document.getElementById("login_email").value;
  const password = document.getElementById("login_password").value;

  if (!email || !password) {
    alert("ইমেইল ও পাসওয়ার্ড দিন");
    return;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      alert(error.message);
      return;
    }

    const user = data.user;

    // Check if user is approved
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("approval_status, role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      alert("প্রোফাইল তথ্য পাওয়া যায়নি");
      return;
    }

    // Admin সবসময় ঢুকতে পারবে
    if (profile.role === 'admin') {
      await redirectByRole();
      return;
    }

    // চেক করুন ইউজার অ্যাপ্রুভড কিনা
    if (profile.approval_status !== 'approved') {
      alert("⏳ আপনার অ্যাকাউন্ট এখনও অ্যাপ্রুভ হয়নি। অ্যাডমিন অ্যাপ্রুভ করার পর আবার চেষ্টা করুন।");
      await supabase.auth.signOut();
      return;
    }

    await redirectByRole();

  } catch (error) {
    console.error('Login error:', error);
    alert('লগইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
  }
};

// ================= LOGOUT =================
window.logout = async function () {
  await supabase.auth.signOut();
  sessionStorage.clear();
  window.location.href = "../index.html";
};