import { useContext } from "react";
import AuthContext from "./Store/auth.store.jsx";

export function useAuth() {
  return useContext(AuthContext);
}
