import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");
  redirect("/login");
}
