import { supabase } from "../js/supabase.js"
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  window.location.href = "../index.html";
}

async function loadPending() {

  const { data } =
    await supabase
      .from("applications")
      .select("*")
      .eq("status", "pending")

  console.log(data)
}

window.approve = async function (id) {

  // get application
  const { data: application } =
    await supabase
      .from("applications")
      .select("*")
      .eq("id", id)
      .single()

  // update status
  await supabase
    .from("applications")
    .update({ status: "approved" })
    .eq("id", id)

  // notification
  await supabase
    .from("notifications")
    .insert({
      user_id: application.user_id,
      message: "Your file approved ✅"
    })

  alert("Approved & Notified 🚀")
}

loadPending()