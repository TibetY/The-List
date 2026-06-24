import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createSupabaseServerClient } from "~/supabase.server";

async function signOut(request: Request) {
  const { supabase, headers } = createSupabaseServerClient(request);
  await supabase.auth.signOut();
  return redirect("/", { headers });
}

export const action: ActionFunction = ({ request }) => signOut(request);
export const loader: LoaderFunction = ({ request }) => signOut(request);

export default function Logout() {
  return null;
}
