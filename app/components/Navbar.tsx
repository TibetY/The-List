import { Link, useLoaderData } from "@remix-run/react";

interface LoaderData {
  token: string | null;
}

export default function Navbar() {
  const { token } = useLoaderData<LoaderData>();

  if (!token) return null;

  return (
    <nav className="bg-gray-900 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/dashboard" className="text-xl font-bold">
          The List
        </Link>
        <div className="space-x-4">
          <Link
            to="/dashboard"
            className="inline-block px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
          >
            Add Spot
          </Link>
          <Link to="/profile" className="hover:underline">
            Profile
          </Link>
          <Link to="/logout" className="hover:underline">
            Logout
          </Link>
        </div>
      </div>
    </nav>
  );
}
