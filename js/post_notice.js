import { supabase } from "../js/supabase.js"

window.postNotice = async function () {

  const title = document.getElementById("title").value
  const message = document.getElementById("message").value

  if (!title || !message) {
    alert("Fill all fields")
    return
  }

  const { data: { user } } =
    await supabase.auth.getUser()

  if (!user) {
    alert("User not logged in")
    return
  }

  console.log("Posting as:", user.id)

  const { data, error } =
    await supabase
      .from("notices")
      .insert([
        {
          title: title,
          message: message,
          created_by: user.id
        }
      ])

  if (error) {
    console.log("Insert error:", error)
    alert(error.message)
    return
  }

  console.log("Inserted:", data)

  alert("Notice posted successfully ✅")
}