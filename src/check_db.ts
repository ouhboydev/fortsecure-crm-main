import { supabase } from "./integrations/supabase/client";

async function check() {
  const { count: opps } = await supabase.from("opportunities").select("*", { count: 'exact', head: true });
  const { count: profs } = await supabase.from("profiles").select("*", { count: 'exact', head: true });
  const { count: goals } = await supabase.from("goals").select("*", { count: 'exact', head: true });
  
  console.log({ opps, profs, goals });
}

check();
