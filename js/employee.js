import { supabase } from "../js/supabase.js"

const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  window.location.href = "../index.html";
}

window.applyFile = async function () {

  const title = title.value
  const file = fileInput.files[0]

  const user =
    (await supabase.auth.getUser()).data.user

  // upload file
  const { data: fileData } =
    await supabase.storage
      .from("files")
      .upload(
        `docs/${Date.now()}_${file.name}`,
        file
      )

  const fileUrl =
    supabase.storage
      .from("files")
      .getPublicUrl(fileData.path)
      .data.publicUrl

  await supabase.from("applications").insert({
    user_id: user.id,
    title,
    file_url: fileUrl
  })

  alert("Application Submitted ✅")
}