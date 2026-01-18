// import { useEffect, useState } from "react";
// import { getMembers } from "../api/members.api.js";

// export default function Members() {
//   const [members, setMembers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   // 🔴 Replace with REAL church ID (HQ or Branch)
//   const ACTIVE_CHURCH_ID = "PUT_CHURCH_ID_HERE";

//   useEffect(() => {
//     const fetchMembers = async () => {
//       try {
//         const res = await getMembers(ACTIVE_CHURCH_ID);
//         setMembers(res.data.members || []);
//       } catch (err) {
//         setError(
//           err.response?.data?.message || "Failed to load members"
//         );
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchMembers();
//   }, []);

//   if (loading) return <p className="p-6">Loading members...</p>;
//   if (error) return <p className="p-6 text-red-500">{error}</p>;

//   return (
//     <div className="p-6">
//       <h1 className="text-2xl font-bold mb-4">Members</h1>

//       {members.length === 0 ? (
//         <p>No members found.</p>
//       ) : (
//         <ul className="space-y-2">
//           {members.map((member) => (
//             <li
//               key={member._id}
//               className="border rounded p-3"
//             >
//               <p><strong>Name:</strong> {member.fullName}</p>
//               <p><strong>Phone:</strong> {member.phoneNumber}</p>
//               <p><strong>Email:</strong> {member.email}</p>
//               <p><strong>Gender:</strong> {member.gender}</p>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }
