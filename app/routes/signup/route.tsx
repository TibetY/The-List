// app/routes/sign-up.tsx
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "~/firebase"; // adjust the path as needed
import { getSession, commitSession } from "~/session.server";

// Loader: if token exists, redirect to /dashboard
export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const token = session.get("token");
  if (token) {
    return redirect("/dashboard");
  }
  return {};
};

type ActionData = {
  error?: string;
};

// Action: handle sign-up form submission, create user, store token in cookie
export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" } as ActionData;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    // Get the Firebase ID token from the newly created user
    const token = await userCredential.user.getIdToken();

    // Create or retrieve the session and set the token
    const session = await getSession(request.headers.get("Cookie"));
    session.set("token", token);

    return redirect("/dashboard", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Login error:", err.message);
      return { error: err.message } as ActionData;
    } else {
      console.error("Login error:", err);
      return { error: "An unknown error occurred" } as ActionData;
    }
  }
};

export default function SignUpPage() {
  const actionData = useActionData<ActionData>();

  return (
    <div className="flex items-center justify-center min-h-screen bg-dark text-primary">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold mb-6 text-center">Sign Up</h2>
        {actionData?.error && (
          <p className="mb-4 text-red-500 text-center">{actionData.error}</p>
        )}
        <Form method="post" className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              placeholder="you@example.com"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              placeholder="********"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium mb-1"
            >
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              placeholder="********"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
          >
            Sign Up
          </button>
        </Form>
        <p className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <a href="/login" className="text-blue-400 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
