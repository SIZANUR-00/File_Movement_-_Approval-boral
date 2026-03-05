import { supabase } from "./supabase.js";

// Get current officer profile
async function getCurrentOfficer() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    window.location.href = "../index.html";
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
}

// Load pending files for current officer
export async function loadPendingFiles() {
  const officer = await getCurrentOfficer();
  if (!officer) return [];

  const { profile } = officer;
  const roleField = `${profile.role}_id`;

  const { data: files, error } = await supabase
    .from("files")
    .select(`
      *,
      supervisor:profiles!files_supervisor_id_fkey (name, email),
      application_approvals(*)
    `)
    .eq(roleField, profile.id)
    .eq("current_step", profile.role)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading files:", error);
    return [];
  }

  return files;
}

// Get next step in workflow
function getNextStep(currentRole) {
  const workflow = {
    "house_tutor": "assistant_provost",
    "assistant_provost": "provost",
    "provost": "treasurer",
    "treasurer": "vc",
    "vc": null
  };
  return workflow[currentRole];
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

// Approve file
export async function approveFile(fileId, comments = "") {
  const officer = await getCurrentOfficer();
  if (!officer) return false;

  const { profile } = officer;

  try {
    // Update approval step
    await supabase
      .from("application_approvals")
      .update({
        status: "approved",
        approved_at: new Date()
      })
      .eq("application_id", fileId)
      .eq("role", profile.role);

    // Get file details
    const { data: file } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single();

    const nextStep = getNextStep(profile.role);

    if (nextStep) {
      // Forward to next officer
      await supabase
        .from("files")
        .update({
          current_step: nextStep,
          updated_at: new Date()
        })
        .eq("id", fileId);

      // Get next officer ID
      const nextOfficerId = file[`${nextStep}_id`];
      
      // Notify next officer
      await createNotification(nextOfficerId, 
        `File "${file.title}" approved by ${profile.name} and forwarded to you`);

    } else {
      // All approvals complete
      await supabase
        .from("files")
        .update({
          status: "approved",
          current_step: "completed",
          updated_at: new Date()
        })
        .eq("id", fileId);

      // Notify supervisor
      await createNotification(file.supervisor_id,
        `Your file "${file.title}" has been fully approved by all officers`);
    }

    return true;

  } catch (error) {
    console.error("Error approving file:", error);
    return false;
  }
}

// Reject file
export async function rejectFile(fileId, comments) {
  const officer = await getCurrentOfficer();
  if (!officer) return false;

  const { profile } = officer;

  try {
    // Update file status
    await supabase
      .from("files")
      .update({
        status: "rejected",
        current_step: "rejected",
        updated_at: new Date()
      })
      .eq("id", fileId);

    // Update approval step
    await supabase
      .from("application_approvals")
      .update({
        status: "rejected",
        approved_at: new Date()
      })
      .eq("application_id", fileId)
      .eq("role", profile.role);

    // Get file details
    const { data: file } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single();

    // Notify supervisor
    await createNotification(file.supervisor_id,
      `Your file "${file.title}" was rejected by ${profile.name}. Reason: ${comments}`);

    return true;

  } catch (error) {
    console.error("Error rejecting file:", error);
    return false;
  }
}