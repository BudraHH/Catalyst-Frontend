import {Routes, Route, Navigate, useNavigate,} from 'react-router-dom';
import SignInPage from './pages/auth/SignIn.jsx';
import HomePage from "./pages/main/HomePage.jsx";
import XmlResolverUploader from "./pages/main/sections/XmlResolverUploader.jsx"; // Child page 1
import GitHubConnector from "./pages/main/sections/GitHubConnector.jsx";
import {useEffect} from "react";

function App() {
    const navigate = useNavigate();
    // const isUserLoggedIn = useSelector((state) => !!state.user.user);
    const isUserLoggedIn = !!localStorage.getItem("access_token");
    // const isUserLoggedIn = true;


    console.log("User Logged In Status:", isUserLoggedIn);
    return (

        <div className="min-h-screen bg-gray-100 text-gray-900">
            <Routes>
                {/* Public Route: Sign In */}
                <Route
                    path="/sign-in"
                    element={
                        isUserLoggedIn ? <Navigate to="/" replace /> : <SignInPage />
                        }
                />

                {/* Protected Routes: Main application layout */}
                <Route
                    path="/"
                    element={
                        isUserLoggedIn ? <HomePage /> : <Navigate to="/sign-in" replace />
                        }
                >

                    <Route
                        path="/lsk-resolve"
                        element={<XmlResolverUploader />}
                    />
                    <Route
                        path="github-connect"
                        element={<GitHubConnector />}
                    />

                </Route>
                <Route
                    path="*"
                    element={
                        isUserLoggedIn ? <Navigate to="/" replace /> : <Navigate to="/sign-in" replace />
                    }
                />
            </Routes>
        </div>
    );
}

export default App;