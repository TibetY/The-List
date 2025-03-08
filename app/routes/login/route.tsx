import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { useActionData, Form } from "@remix-run/react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "~/firebase"; // adjust the import path
import { getSession, commitSession } from "~/session.server";

type ActionData = {
  error?: string;
};

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get("Cookie"));
  const token = session.get("token");
  if (token) {
    return redirect("/dashboard");
  }
  return {};
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    console.log("Logged in user:", userCredential.user);
    // Get the Firebase ID token from the user
    const token = await userCredential.user.getIdToken();

    // Create or get a session and store the token
    const session = await getSession(request.headers.get("Cookie"));
    session.set("token", token);

    return redirect("/dashboard", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
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

export default function LoginPage() {
  const actionData = useActionData<ActionData>();
  return (
    <div className="flex items-center justify-center min-h-screen bg-dark text-primary">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold mb-6 text-center">Login</h2>
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
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
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
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="********"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded"
          >
            Login
          </button>
        </Form>
      </div>
    </div>
  );
}
