import { supabase } from "./supabase.js";

async function testConnection() {
  console.log("Testing Supabase connection...");
  
  const { data, error } = await supabase
    .from("profiles")
    .select("count", { count: "exact", head: true });

  if (error) {
    console.error("❌ Connection failed:", error.message);
  } else {
    console.log("✅ Connection successful!");
  }
}

testConnection();