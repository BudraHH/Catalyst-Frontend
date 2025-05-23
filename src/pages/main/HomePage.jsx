import { Outlet } from 'react-router-dom';
import Sidebar from "./components/Sidebar.jsx";

const HomePage = () => {

    const user  = JSON.parse(localStorage.getItem("user"));
    const devEmail = user.email;
    return (
        <div className="flex h-screen bg-gray-100 w-screen">
            <Sidebar />

            <div className="flex flex-col p-4 gap-4 overflow-auto w-full">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-5 flex justify-end">
                    {devEmail}
                </div>
                <Outlet />
            </div>
        </div>
    );
};

export default HomePage;