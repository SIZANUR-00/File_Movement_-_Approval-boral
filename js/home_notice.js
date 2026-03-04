import { supabase } from "./supabase.js"

async function loadNotices() {

  const { data, error } =
    await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false })

  console.log("Notices data:", data)
  console.log("Error:", error)

  if (error) {
    return
  }

  const container =
    document.getElementById("noticeList")

  if (!container) {
    console.log("noticeList div not found")
    return
  }

  container.innerHTML = ""

  if (!data || data.length === 0) {
    container.innerHTML = "<p>No notices found</p>"
    return
  }

  data.forEach(n => {
    container.innerHTML += `
      <div style="
        background:#fff;
        padding:15px;
        margin-bottom:15px;
        border-radius:10px;
        box-shadow:0 5px 15px rgba(0,0,0,0.05);
      ">
        <h3>${n.title}</h3>
        <p>${n.message}</p>
        <small>${new Date(n.created_at).toLocaleString()}</small>
      </div>
    `
  })
}

loadNotices()