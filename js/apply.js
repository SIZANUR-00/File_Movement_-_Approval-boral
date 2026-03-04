import { supabase } from "./supabase.js";

const form = document.getElementById("applicationForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // =============================
  // 1️⃣ Get logged user
  // =============================
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Login required");
    return;
  }

  // =============================
  // 2️⃣ Get form values
  // =============================
  const title =
    document.getElementById("applicationTitle").value;

  const description =
    document.getElementById("applicationDescription").value;

  const file =
    document.getElementById("fileUpload").files[0];

  if (!file) {
    alert("Upload PDF");
    return;
  }

  // =============================
  // 3️⃣ Upload PDF to Storage
  // =============================
  const fileName =
    `${user.id}_${Date.now()}_${file.name}`;

  const { error: uploadError } =
    await supabase.storage
      .from("applications")
      .upload(fileName, file);

  if (uploadError) {
    alert(uploadError.message);
    return;
  }

  // get public URL
  const { data } = supabase
    .storage
    .from("applications")
    .getPublicUrl(fileName);

  const file_url = data.publicUrl;

  // =============================
  // 4️⃣ Save application
  // =============================
  const { data: appData, error } =
    await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        title,
        description,
        file_url,
      })
      .select()
      .single();

  if (error) {
    alert(error.message);
    return;
  }

  const applicationId = appData.id;

  // =============================
  // 5️⃣ Save approval roles
  // =============================
  const roles =
    document.querySelectorAll(".role-select");

  let approvals = [];

  roles.forEach((role, index) => {
    approvals.push({
      application_id: applicationId,
      role: role.value,
      role_order: index + 1,
    });
  });

  const { error: approvalError } =
    await supabase
      .from("application_approvals")
      .insert(approvals);

  if (approvalError) {
    alert(approvalError.message);
    return;
  }

  alert("✅ Application Submitted Successfully");

  window.location.href = "e_dashboard.html";
});