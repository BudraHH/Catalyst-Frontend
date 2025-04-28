import { useState } from "react";
import { FaLock, FaEnvelope, FaEye, FaEyeSlash } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUserDetails } from "../../store/userSlice.js";
import backendAPI from "../../backendApi/index.js";

const SignIn = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleSignIn = async (e) => {
        e.preventDefault();
        setErrorMessage("");
        setIsLoading(true);

        const signInData = { email, password };

        try {
            const response = await fetch(backendAPI.signIn.url, {
                method: backendAPI.signIn.method,
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify(signInData),
            });

            const responseData = await response.json();
            if (!response.ok) {
                setErrorMessage(responseData.message || `Sign-in failed (Status: ${response.status})`);
                return;
            }

            if (responseData.success) {
                const {email, accessToken} = responseData;
                console.log("Email:", email, "Token:", accessToken);

                localStorage.setItem("access_token", accessToken);

                dispatch(setUserDetails({email, accessToken}));
            }

        } catch (error) {
            console.error("Error during sign-in fetch or processing:", error);
            setErrorMessage("An error occurred connecting to the server. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="h-screen w-screen flex items-center justify-center bg-gray-100 p-6">
            {/* Changed background to light gray */}
            <div className="bg-white border border-gray-300 p-8 rounded-xl shadow-lg w-full max-w-md">
                {/* Changed container background to white, standard border */}
                <form onSubmit={handleSignIn} className="space-y-6"> {/* Increased spacing */}
                    <div className={`flex flex-col justify-center items-center`}>
                        <h2 className="text-3xl font-bold text-gray-800 text-center "> {/* Static text, adjusted styling */}
                           Sign in
                        </h2>
                        <pre className={`text-sm`}>To use Catalyst</pre>
                    </div>

                    {/* Removed motion.div wrappers */}
                    <div className="flex flex-col gap-5"> {/* Adjusted gap */}
                        {/* Email Field */}
                        <div className="relative">
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700 mb-1" // Standard text color
                            >
                                Email Address
                            </label>
                            <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg p-2.5 group-[]: focus-within:bg-white focus-within:ring-1 focus-within:ring-black">
                                {/* Light input background, standard border, standard focus ring */}
                                <FaEnvelope className="text-gray-400 mx-2 group-focus:" /> {/* Icon color */}
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="Enter your email"
                                    className="w-full bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none p-1" // Adjusted text color
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="relative">
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700 mb-1" // Standard text color
                            >
                                Password
                            </label>
                            <div className="flex items-center bg-gray-50 border border-gray-300 rounded-lg p-2.5 focus-within:bg-white focus-within:ring-1 focus-within:ring-black">
                                {/* Light input background, standard border, standard focus ring */}
                                <FaLock className="text-gray-400 mx-2" /> {/* Icon color */}
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="Enter your password"
                                    className="w-full bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none p-1" // Adjusted text color
                                />
                                <span
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="cursor-pointer text-gray-500 hover:text-gray-700 mx-2" // Adjusted icon/hover colors
                                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </span>
                            </div>
                        </div>

                        {/* Error Message */}
                        {errorMessage && (
                            // Standard Tailwind classes for an error alert appearance
                            <p className="text-sm text-red-600 bg-red-100 border border-red-300 rounded-md p-3 text-center">
                                {errorMessage}
                            </p>
                        )}

                        {/* Sign In Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`w-full py-3 rounded-lg font-semibold text-white ${
                                isLoading
                                    ? "bg-gray-400 cursor-not-allowed" // Disabled button style
                                    : "bg-gray-700 hover:bg-gray-600" // Button style and hover
                            } transition-colors duration-300 ease-in-out`}
                        >
                            {isLoading ? "Signing In..." : "Sign In"}
                        </button>

                        {/* Forgot Password */}
                        <div className="text-center"> {/* Added wrapper for centering */}
                            <button
                                type="button"
                                onClick={() => navigate("/forgot-password")}
                                className="text-sm text-gray-500 hover:text-gray-800 transition-colors duration-200" // Adjusted text/hover colors
                            >
                                Forgot Password?
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </section>
    );
};

export default SignIn;