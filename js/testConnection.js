import { supabase } from "./supabase.js"

async function testDB() {

console.log("Testing Supabase connection...")

const { data, error } =
await supabase.from("profiles").select("*")

if (error) {
    console.error("❌ Database NOT connected")
    console.error(error.message)
} else {
    console.log("✅ Database Connected Successfully")
    console.log(data)
}

}

testDB()