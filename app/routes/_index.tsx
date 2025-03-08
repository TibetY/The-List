import { LoaderFunction } from "@remix-run/node";
import { Link, redirect } from "@remix-run/react";
import { getSession } from "~/session.server";

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const token = session.get("token");
  if (token) {
    return redirect("/dashboard");
  }
  return {};
};

export default function Index() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-dark text-primary">
      <div className="text-center">
        <h1 className="text-6xl font-extrabold mb-4">The List</h1>
        <p className="text-xl font-light mb-8 animate-fadeIn">
          Discover. Taste. Remember.
        </p>
        <div className="flex items-center justify-center space-x-6">
          <Link
            to="/login"
            className="text-accent text-xl underline hover:text-accent-hover transition duration-200"
          >
            Login
          </Link>
          <span className="text-primary text-xl">|</span>
          <Link
            to="/signup"
            className="text-accent text-xl underline hover:text-accent-hover transition duration-200"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
