import { supabase } from "./supabase.js";

export async function redirectByRole() {

  const { data: { user } } =
    await supabase.auth.getUser();

  // not logged in
  if (!user) {
    location = "../index.html";
    return;
  }

  // get role from database
  const { data, error } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .maybeSingle();
  if (!data) return;

  // redirect by role
  if (data.role === "employee")
    location = "./employee/e_dashboard.html";

  else if (data.role === "officer")
    location = "./officer/officer_dashboard.html";

  else if (data.role === "admin")
    location = "./admin/a_dashboard.html";
}