import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="w-full max-w-md">
        <p className="text-8xl font-extrabold text-blue-700">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-gray-900">
          Page not found
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/dashboard"
            className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Go to Dashboard
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
