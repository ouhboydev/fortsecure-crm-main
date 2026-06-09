import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zsgeoieiadhocfhrptps.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzZ2VvaWVpYWRob2NmaHJwdHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNzEwNDEsImV4cCI6MjA5Mjk0NzA0MX0.S6RCiTNMcg2tH-hVV96-gCIg4Qd-fgCIQMrYXhXN8PY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const email = `test_${Math.random().toString(36).substring(7)}@example.com`;
  const password = 'TestPassword123!';

  console.log(`Signing up user ${email}...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    console.error("Sign up error:", signUpError.message);
    return;
  }

  const userId = signUpData.user?.id;
  console.log(`Signed up successfully. User ID: ${userId}`);

  // Need to insert user_role 'vendedor' so they can insert opportunities?
  // Let's check RLS on opportunities:
  // CREATE POLICY "opps_insert" ON public.opportunities FOR INSERT TO authenticated
  //   WITH CHECK (auth.uid() = owner_id OR public.is_manager_or_admin(auth.uid()));
  // So as long as owner_id = auth.uid(), we can insert without being manager/admin!
  
  console.log("Attempting to insert opportunity with stage: 'leads_exact'...");
  const { data: oppData, error: oppError } = await supabase
    .from("opportunities")
    .insert({
      owner_id: userId,
      client_name: "Test Client",
      title: "Test Title",
      value: 100,
      stage: "leads_exact",
      probability: 10
    })
    .select();

  if (oppError) {
    console.error("Opportunity insert error:", oppError);
  } else {
    console.log("Opportunity inserted successfully:", oppData);
    
    // Clean up by deleting the opportunity
    console.log("Deleting test opportunity...");
    await supabase.from("opportunities").delete().eq("id", oppData[0].id);
  }

  // Clean up user if possible (we can't delete auth users without admin key, but that's fine for testing)
}

main().catch(console.error);
