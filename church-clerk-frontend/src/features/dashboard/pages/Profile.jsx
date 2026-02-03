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

  if (loading) return <p>Loading profile...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!user) return <p>User not found.</p>;

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">My Profile</h2>

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
