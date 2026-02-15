import { useContext } from "react";
import AuthContext from "./store/auth.store.jsx";

export function useAuth() {
  return useContext(AuthContext);
}
