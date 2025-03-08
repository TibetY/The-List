import { LoaderFunction, redirect } from "@remix-run/node";
import { getSession } from "~/session.server";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const token = session.get("token");
  // If there's no token, redirect to login.
  if (!token) {
    return redirect("/login");
  }
  // If token exists, allow access to dashboard.
  return {};
};

export default function Dashboard() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-dark text-primary">
      <h1 className="text-4xl font-bold">Dashboard coming soon</h1>
    </div>
  );
}
