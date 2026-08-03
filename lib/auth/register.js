import { supabase } from "@/lib/supabase/client";

export async function registerUser({
  nombre,
  apellido,
  email,
  password,
}) {
  console.log('🔵 Intentando registrar:', { nombre, apellido, email });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre,
        apellido,
      },
    },
  });

  console.log('🟢 Respuesta de Supabase:', { data, error });
  return { data, error };
}