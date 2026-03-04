import { supabase } from "./supabase.js"

// ---------- CHECK LOGIN ----------
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  window.location.href = "../index.html";
}

// ---------- LOAD USERS ----------
async function loadUsers() {

  const { data, error } =
    await supabase
      .from("profiles")
      .select("*")

  console.log("Users:", data)
  
}

loadUsers()
