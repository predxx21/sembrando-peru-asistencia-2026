import { supabase } from "@/lib/supabase/client";

export async function loginUser(email, password) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function loginWithGoogle() {
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}