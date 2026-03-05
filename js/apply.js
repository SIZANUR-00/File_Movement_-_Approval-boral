import { supabase } from "./supabase.js";

// Check if user is supervisor
async function checkSupervisor() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    alert("Please login first");
    window.location.href = "../index.html";
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile.role !== "supervisor") {
    alert("Only supervisors can submit files");
    window.location.href = "e_dashboard.html";
    return null;
  }

  return { user, profile };
}

// Load all officers for selection
async function loadOfficers() {
  // Load House Tutors
  const { data: houseTutors } = await supabase
    .from("profiles")
    .select("id, name, floor")
    .eq("role", "house_tutor");

  const houseTutorSelect = document.getElementById("house_tutor_id");
  if (houseTutorSelect && houseTutors) {
    houseTutors.forEach(tutor => {
      const option = document.createElement("option");
      option.value = tutor.id;
      option.textContent = `${tutor.name} (Floor: ${tutor.floor || 'N/A'})`;
      houseTutorSelect.appendChild(option);
    });
  }

  // Load Assistant Provosts
  const { data: asstProvosts } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "assistant_provost");

  const asstProvostSelect = document.getElementById("assistant_provost_id");
  if (asstProvostSelect && asstProvosts) {
    asstProvosts.forEach(ap => {
      const option = document.createElement("option");
      option.value = ap.id;
      option.textContent = ap.name;
      asstProvostSelect.appendChild(option);
    });
  }

  // Load Provosts
  const { data: provosts } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "provost");

  const provostSelect = document.getElementById("provost_id");
  if (provostSelect && provosts) {
    provosts.forEach(p => {
      const option = document.createElement("option");
      option.value = p.id;
      option.textContent = p.name;
      provostSelect.appendChild(option);
    });
  }

  // Load Treasurers
  const { data: treasurers } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "treasurer");

  const treasurerSelect = document.getElementById("treasurer_id");
  if (treasurerSelect && treasurers) {
    treasurers.forEach(t => {
      const option = document.createElement("option");
      option.value = t.id;
      option.textContent = t.name;
      treasurerSelect.appendChild(option);
    });
  }

  // Load VCs
  const { data: vcs } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "vc");

  const vcSelect = document.getElementById("vc_id");
  if (vcSelect && vcs) {
    vcs.forEach(vc => {
      const option = document.createElement("option");
      option.value = vc.id;
      option.textContent = vc.name;
      vcSelect.appendChild(option);
    });
  }
}

// Create notification
async function createNotification(userId, message) {
  await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      message: message,
      created_at: new Date()
    });
}

// Main form submission
document.getElementById("applicationForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userData = await checkSupervisor();
  if (!userData) return;
  const { user, profile } = userData;

  // Get form values
  const title = document.getElementById("applicationTitle").value;
  const description = document.getElementById("applicationDescription").value;
  const houseTutorId = document.getElementById("house_tutor_id").value;
  const asstProvostId = document.getElementById("assistant_provost_id").value;
  const provostId = document.getElementById("provost_id").value;
  const treasurerId = document.getElementById("treasurer_id").value;
  const vcId = document.getElementById("vc_id").value;
  const file = document.getElementById("fileUpload").files[0];

  if (!title || !description || !houseTutorId || !asstProvostId || !provostId || !treasurerId || !vcId || !file) {
    alert("Please fill all fields");
    return;
  }

  try {
    // Upload file to storage
    const fileName = `files/${user.id}_${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("applications")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("applications")
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    // Insert into files table
    const { data: fileData, error: fileError } = await supabase
      .from("files")
      .insert({
        title,
        description,
        file_url: fileUrl,
        current_step: "house_tutor",
        status: "pending",
        supervisor_id: user.id,
        house_tutor_id: houseTutorId,
        assistant_provost_id: asstProvostId,
        provost_id: provostId,
        treasurer_id: treasurerId,
        vc_id: vcId,
        created_at: new Date()
      })
      .select()
      .single();

    if (fileError) throw fileError;

    // Insert into applications table
    await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        title,
        description,
        file_url: fileUrl,
        status: "pending",
        created_at: new Date()
      });

    // Create approval steps
    const approvals = [
      { role: "house_tutor", role_order: 1, approved_by: houseTutorId, status: "pending" },
      { role: "assistant_provost", role_order: 2, approved_by: asstProvostId, status: "pending" },
      { role: "provost", role_order: 3, approved_by: provostId, status: "pending" },
      { role: "treasurer", role_order: 4, approved_by: treasurerId, status: "pending" },
      { role: "vc", role_order: 5, approved_by: vcId, status: "pending" }
    ];

    for (const approval of approvals) {
      await supabase
        .from("application_approvals")
        .insert({
          application_id: fileData.id,
          ...approval
        });
    }

    // Notify house tutor
    await createNotification(houseTutorId, 
      `New file "${title}" requires your approval from ${profile.name}`);

    alert("File submitted successfully!");
    window.location.href = "my_applications.html";

  } catch (error) {
    console.error("Error:", error);
    alert("Failed to submit file: " + error.message);
  }
});

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
  await checkSupervisor();
  await loadOfficers();
});