import { supabase } from "./supabase.js"

async function loadNotifications() {

 const { data: { user } } =
  await supabase.auth.getUser()

if (!user) {
  console.log("No logged in user")
  return
}
  const { data } =
    await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

  console.log("Notifications:", data)
}

loadNotifications()