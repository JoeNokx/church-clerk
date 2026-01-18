import {createBrowserRouter} from "react-router-dom";
import App from "./App.jsx";
import Members from "../pages/Members.jsx";


export const router = createBrowserRouter([
    {
        path: "/",
        element: <App />
    },

    {
        path: "/members",
        element: <Members />
    }
]);