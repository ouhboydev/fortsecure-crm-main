
import { supabase } from "./src/integrations/supabase/client";

async function check() {
  const { data, error } = await supabase.from("activities").select("*").limit(1);
  if (error) console.error("Error:", error);
  else console.log("Keys:", Object.keys(data[0] || {}));
}

check();
