import React from 'react';
import { Link, useLocation } from 'react-router-dom';
// Import desired icons (ensure react-icons is installed)
import { FaSignOutAlt, FaGithub, FaCloudUploadAlt, FaCode } from 'react-icons/fa'; // Examples

// Define navigation items with icons
const navigationItems = [
    { label: 'LSK Resolver', path: '/lsk-resolve', icon: FaCloudUploadAlt },
    { label: 'GitHub Connect', path: '/github-connect', icon: FaGithub },
    // Add other primary navigation items here if needed
];

// Separate logout item
const logoutItem = { label: 'Logout', path: '/logout', icon: FaSignOutAlt };

// --- Sidebar Component ---
const Sidebar = () => {
    const location = useLocation(); // Hook to get current path

    return (

        <aside className="w-64 h-screen bg-white text-gray-800 flex flex-col  border-gray-300 shadow-sm">

            {/* Logo/Title Area */}
            <div className="flex items-center h-20 px-6 border-b border-gray-300">
                <code className="text-xl font-bold text-gray-700 tracking-tight">Catalyst</code> {/* Darker title text */}
            </div>

            {/* Navigation Area */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navigationItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.label}
                            to={item.path}
                            // Conditional styles using only grays:
                            // - Active: Slightly darker gray background (bg-gray-300), strong gray text (text-gray-900)
                            // - Inactive: Default text (gray-600), hover background (bg-gray-200)
                            className={`
                                flex items-center px-3 py-3 rounded-md text-sm font-medium
                                transition-colors duration-150 ease-in-out group mb-2
                                ${isActive
                                ? 'bg-gray-300 text-gray-900' // Active link styles using grays
                                : 'text-gray-600 bg-gray-100 hover:bg-gray-200 hover:text-gray-900' // Inactive & hover style using grays
                            }
                            `}
                        >
                            {/* Icon color changes with text color */}
                            {item.icon && <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-gray-700' : 'text-gray-400 group-hover:text-gray-500'}`} />}
                            {/* Label */}
                            <span className="flex-1">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Logout Area at the bottom */}
            <div className="pt-4 mt-auto p-4 border-t border-gray-300"> {/* Lighter border */}
                <Link
                    to={logoutItem.path}
                    // Styling similar to inactive nav links
                    className="flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium border border-red-500 group
                               text-gray-600 hover:bg-red-500 hover:text-white
                               transition-colors duration-150 ease-in-out group"
                >
                    {logoutItem.icon && <logoutItem.icon className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-white" />}
                    <span>{logoutItem.label}</span>
                </Link>
            </div>
        </aside>
    );
};

export default Sidebar;





//
// <p className="text-sm text-gray-500 mt-1">
//     Allow this application to push resolved XML files directly to your specified repository branch.
// </p>