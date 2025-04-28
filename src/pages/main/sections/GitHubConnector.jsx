// src/components/GithubConnector.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { FaGithub, FaSpinner, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'; // Added status icons
import backendApi from "../../../backendApi/index.js"; // Ensure correct import path

const GithubConnector = () => {
    // State for the connection process step
    const [connectionStatus, setConnectionStatus] = useState('idle'); // 'idle', 'connecting', 'success', 'error'
    // State for holding any error messages
    const [statusMessage, setStatusMessage] = useState('');

    // Memoized callback function to handle messages from the popup
    const handlePopupMessage = useCallback((event) => {
        // Security Check: Validate the origin (Important for production)
        // const expectedOrigin = window.location.origin;
        // if (event.origin !== expectedOrigin && !expectedOrigin.startsWith('http://localhost')) {
        //     console.warn("Received message from untrusted origin:", event.origin);
        //     return;
        // }

        if (event.data?.type === 'github_auth_result') {
            console.log("Message received from GitHub auth popup:", event.data);

            if (event.data.status === 'success') {
                setConnectionStatus('success');
                setStatusMessage(event.data.message || "Successfully connected to GitHub!");
            } else {
                setConnectionStatus('error');
                setStatusMessage(event.data.message || 'GitHub connection failed: Unknown error');
            }
            // Clean up listener once the message is processed
            window.removeEventListener('message', handlePopupMessage);
        }
    }, []); // Empty dependency array: function identity is stable

    // Function to initiate the popup flow
    const handleConnectClick = () => {
        const connectUrl = backendApi.GITHUB_AUTH_START_URL; // Use the imported variable
        if (!connectUrl) {
            console.error("GitHub connect URL (backendApi.GITHUB_AUTH_START_URL) is not configured.");
            setConnectionStatus('error');
            setStatusMessage("Configuration error: Cannot initiate GitHub connection.");
            return;
        }

        setConnectionStatus('connecting'); // Set status to connecting
        setStatusMessage('Redirecting to GitHub for authorization...'); // Initial message
        console.log("Opening GitHub auth popup window to backend URL:", connectUrl);

        const popupWidth = 600;
        const popupHeight = 700;
        const left = window.screenX + (window.outerWidth - popupWidth) / 2;
        const top = window.screenY + (window.outerHeight - popupHeight) / 2;
        const windowFeatures = `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes`;

        const popup = window.open(connectUrl, 'githubAuthPopup', windowFeatures);

        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            setStatusMessage('Popup blocked! Please allow popups for this site.');
            setConnectionStatus('error');
            return;
        }

        console.log("Adding message event listener for popup communication.");
        window.addEventListener('message', handlePopupMessage, false);

        if (popup) popup.focus();

        // Check if popup is closed manually
        const checkPopupClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkPopupClosed);
                // If still 'connecting', means no message was received -> user closed manually
                if (connectionStatus === 'connecting') {
                    console.log("Popup closed manually before completion.");
                    setConnectionStatus('idle'); // Reset to idle or show a specific message
                    setStatusMessage('Connection process cancelled.');
                    window.removeEventListener('message', handlePopupMessage);
                }
            }
            // Also clear interval if status changes away from connecting
            if(connectionStatus !== 'connecting') {
                clearInterval(checkPopupClosed);
            }
        }, 1000);
    };

    // Cleanup effect for the event listener
    useEffect(() => {
        return () => {
            window.removeEventListener('message', handlePopupMessage);
        };
    }, [handlePopupMessage]);

    // Helper to determine button text and icon
    const getButtonContent = () => {
        if (connectionStatus === 'connecting') {
            return (
                <>
                    <FaSpinner className="animate-spin -ml-1 mr-3 h-5 w-5" aria-hidden="true" />
                    Connecting...
                </>
            );
        }
        // Could potentially show a 'Connected' state on the button too
        // if (connectionStatus === 'success') { ... }
        return (
            <>
                <FaGithub className="-ml-1 mr-3 h-5 w-5" aria-hidden="true" />
                Connect with GitHub
            </>
        );
    };

    return (
        <div className="bg-white w-full rounded-lg shadow-md border border-gray-200 p-4 sm:p-6  mx-auto"> {/* Constrained width */}
            {/* Header */}
            <div className="text-center pb-4 mb-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800"> {/* Slightly larger title */}
                    Connect GitHub Account
                </h2>
                <p className="text-sm text-gray-500 mt-2"> {/* Adjusted margin */}
                    Authorize this application to push resolved files to your repositories.
                </p>
            </div>

            {/* Main Action Area */}
            <div className="py-4 space-y-4"> {/* Added vertical space */}
                {/* Connection Button */}
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={handleConnectClick}
                        // Disable button during connection or after success (optional)
                        disabled={connectionStatus === 'connecting' /* || connectionStatus === 'success' */}
                        className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-700 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-150 ease-in-out ${
                            (connectionStatus === 'connecting' /* || connectionStatus === 'success' */)
                                ? 'opacity-60 cursor-wait' // Adjusted disabled style
                                : ''
                        }`}
                    >
                        {getButtonContent()} {/* Dynamic button content */}
                    </button>
                </div>

                {/* Status Message Area - Only shown when not 'idle' */}
                {connectionStatus !== 'idle' && (
                    <div className={`mt-4 p-3 rounded-md border text-sm min-h-[50px] flex items-center justify-center text-center ${ // Added min-height, center alignment
                        connectionStatus === 'connecting' ? 'bg-gray-50 border-gray-200 text-gray-600' :
                            connectionStatus === 'success' ? 'bg-green-50 border-green-200 text-green-700' : // Using subtle green for success feedback
                                connectionStatus === 'error' ? 'bg-red-50 border-red-200 text-red-700' : // Using subtle red for error feedback
                                    ''
                    }`}>
                        {connectionStatus === 'connecting' && <FaSpinner className="animate-spin mr-2 flex-shrink-0" aria-hidden="true" />}
                        {connectionStatus === 'success' && <FaCheckCircle className="mr-2 flex-shrink-0" aria-hidden="true" />}
                        {connectionStatus === 'error' && <FaExclamationCircle className="mr-2 flex-shrink-0" aria-hidden="true" />}
                        <span>{statusMessage}</span>
                    </div>
                )}
            </div>

            {/* Footer Text */}
            <p className="text-xs text-gray-400 text-center mt-4 border-t border-gray-100 pt-4"> {/* Added subtle separator */}
                A popup window will open. Please ensure popups are enabled for this site.
            </p>
        </div>
    );
}

export default GithubConnector;