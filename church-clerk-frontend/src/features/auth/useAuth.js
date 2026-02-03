import { useContext } from "react";
import AuthContext  from "./auth.store.jsx";

export function useAuth() {
    return useContext(AuthContext);
}
