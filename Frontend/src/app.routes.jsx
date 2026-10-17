import { createBrowserRouter } from "react-router";

import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import Protected from "./features/auth/components/Protected";

import Home from "./features/interview/pages/Home";
import Interview from "./features/interview/pages/Interview";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Resumes from "./pages/Resumes";
import ResumeEditor from "./pages/ResumeEditor";
import Profile from "./pages/Profile";
import ComingSoon from "./pages/ComingSoon";

import AuthenticatedLayout from "./features/layout/AuthenticatedLayout";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Landing />
    },

    {
        path: "/login",
        element: <Login />
    },

    {
        path: "/register",
        element: <Register />
    },

    {
        element: (
            <Protected>
                <AuthenticatedLayout />
            </Protected>
        ),

        children: [
            {
                path: "/dashboard",
                element: <Dashboard />
            },

            {
                path: "/interview/new",
                element: <Home />
            },

            {
                path: "/interview/:interviewId",
                element: <Interview />
            },

            {
                path: "/resumes",
                element: <Resumes />
            },

            {
                path: "/resumes/:resumeId",
                element: <ResumeEditor />
            },

            {
                path: "/profile",
                element: <Profile />
            }
        ]
    },

    {
        path: "*",
        element: <ComingSoon />
    }
]);