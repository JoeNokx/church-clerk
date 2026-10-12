import React, { useState, useEffect } from "react";
import { getMyProfile } from "../../auth/services/auth.api.js";

function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await getMyProfile();
        setUser(
          res?.data?.data?.user?.user ||
            res?.data?.data?.user ||
            res?.data?.user ||
            null
        ); // match backend response
      } catch (error) {
        setError("Failed to load profile");
        setUser(null);
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  if (loading) return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow animate-pulse">
      <div className="h-8 w-36 rounded bg-gray-200 mb-4" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="mb-3 flex items-center gap-3">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-40 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
  if (error) return <p className="text-red-500">{error}</p>;
  if (!user) return <p>User not found.</p>;

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="font-bold mb-4 md:text-3xl lg:text-4xl text-xl md:text-2xl">My Profile</h2>

      <div className="mb-2">
        <span className="font-semibold">Full Name:</span> {user.fullName}
      </div>

      <div className="mb-2">
        <span className="font-semibold">Email:</span> {user.email}
      </div>

      <div className="mb-2">
        <span className="font-semibold">Phone Number:</span> {user.phoneNumber}
      </div>

      <div className="mb-2">
        <span className="font-semibold">Role:</span> {user.role}
      </div>

      <div className="mb-2">
        <span className="font-semibold">Church:</span>{" "}
        {user.church ? user.church.name : "No church assigned"}
      </div>
    </div>
  );
}

export default Profile;
