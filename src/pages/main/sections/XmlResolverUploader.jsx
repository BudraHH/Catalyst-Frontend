// src/components/XmlResolverUploader.jsx
import { useState, useRef, useEffect } from 'react';
import {
    FaFileUpload, FaInfoCircle, FaSpinner, FaCheckCircle, FaTimesCircle,
    FaCodeBranch, FaGitAlt, FaFolderOpen, FaDownload, FaEye, FaEyeSlash
} from 'react-icons/fa';
import backendApi from "../../../backendApi/index.js"; // Ensure correct path (using one import)
import axios from "axios";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Helper function to sanitize filename (no changes needed here)
const sanitizeFilename = (name) => {
    if (!name || typeof name !== 'string') return 'download.xml';
    return name.replace(/[\s<>:"/\\|?*]+/g, '_').replace(/\.[^/.]+$/, "");
};

// --- Define the delay constant ---
const STATUS_CLEAR_DELAY_SECONDS = 5;

const XmlResolverUploader = () => {
    // Input states (no changes)
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileName, setFileName] = useState('No XML file selected');
    const [branchName, setBranchName] = useState('');
    const [repositoryUrl, setRepositoryUrl] = useState('');
    const [relativeFilePath, setRelativeFilePath] = useState('');

    // UI/Process states
    const [isLoading, setIsLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ state: 'idle', message: '' });
    const [previewData, setPreviewData] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    // --- New state for the countdown timer ---
    const [countdownSeconds, setCountdownSeconds] = useState(0);

    const fileInputRef = useRef(null);
    const intervalRef = useRef(null); // Ref to store interval ID for cleanup

    // Effect to manage status message clearing and countdown
    useEffect(() => {
        // Clear any existing interval when effect runs or component unmounts
        const clearExistingInterval = () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };

        if (uploadStatus.state === 'success' || uploadStatus.state === 'error') {
            clearExistingInterval(); // Clear previous interval if any
            setCountdownSeconds(STATUS_CLEAR_DELAY_SECONDS); // Start countdown

            intervalRef.current = setInterval(() => {
                setCountdownSeconds(prevSeconds => {
                    const newSeconds = prevSeconds - 1;
                    if (newSeconds <= 0) {
                        // Countdown finished: clear interval, reset status and filename
                        clearExistingInterval();
                        setUploadStatus({ state: 'idle', message: '' });
                        // Reset filename only after message clears (optional, keep if desired)
                        // Consider if you *always* want to reset filename here
                        // If not, remove the next line.
                        setFileName('No XML file selected');
                        return 0; // Ensure countdown state is 0
                    }
                    return newSeconds; // Continue countdown
                });
            }, 1000); // Update every second

        } else if (uploadStatus.state === 'idle' || uploadStatus.state === 'loading') {
            // If status changes away from success/error (e.g., new loading), clear timer
            clearExistingInterval();
            setCountdownSeconds(0); // Ensure countdown is reset
        }

        // Cleanup function: essential to clear interval on unmount or before effect re-runs
        return () => {
            clearExistingInterval();
        };
    }, [uploadStatus.state]); // Re-run only when the status *state* changes

    // --- Handlers (no changes needed in these handlers themselves) ---

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setPreviewData('');
        setShowPreview(false);
        // Explicitly set status to idle to clear any existing message/timer immediately
        setUploadStatus({ state: 'idle', message: '' });

        if (file) {
            if (file.type === 'text/xml' || file.name.toLowerCase().endsWith('.xml')) {
                setSelectedFile(file);
                setFileName(file.name);
                setRelativeFilePath(file.name);
            } else {
                setSelectedFile(null);
                setFileName('Invalid file type (XML only)');
                setRelativeFilePath('');
                // Set error status (will trigger the useEffect for timer)
                setUploadStatus({ state: 'error', message: 'Please select an XML file (.xml).' });
            }
        } else {
            setSelectedFile(null);
            setFileName('No XML file selected');
            setRelativeFilePath('');
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleShowPreview = () => {
        setShowPreview(prev => !prev);
    };

    const handleDownload = () => {
        if (!previewData) {
            console.error("No preview data available to download.");
            // Set error status (will trigger the useEffect for timer)
            setUploadStatus({ state: 'error', message: 'No resolved data available to download.' });
            return;
        }
        const baseName = sanitizeFilename(fileName);
        const downloadFilename = `${baseName}_resolved.xml`;

        try {
            const blob = new Blob([previewData], { type: 'application/xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', downloadFilename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error during download creation:", error);
            // Set error status (will trigger the useEffect for timer)
            setUploadStatus({ state: 'error', message: 'Could not initiate download.' });
        }
    };

    const handleSubmit = async () => {
        setShowPreview(false);
        setPreviewData('');
        // Set loading status (will clear timer via useEffect)
        setUploadStatus({ state: 'loading', message: 'Resolving placeholders...' });
        setIsLoading(true); // Keep isLoading separate for disabling inputs

        if (!selectedFile || !branchName || !repositoryUrl || !relativeFilePath) {
            let errorMsg = 'Please complete all fields.';
            if (!selectedFile) errorMsg = 'Please select an XML file.';
            else if (!repositoryUrl) errorMsg = 'Please enter a repository URL.';
            else if (!branchName) errorMsg = 'Please enter a branch name.';
            else if (!relativeFilePath) errorMsg = 'Please enter the relative file path.';
            // Set error status (will trigger useEffect timer)
            setUploadStatus({ state: 'error', message: errorMsg });
            setIsLoading(false); // Stop loading on validation fail
            return;
        }
        // Note: isLoading check is implicitly handled by the `setUploadStatus` setting above

        const formData = new FormData();
        formData.append('xmlFile', selectedFile);
        formData.append('branch', branchName);
        formData.append('repository', repositoryUrl);
        formData.append('relativePath', relativeFilePath);

        console.log("--- Submitting FormData ---");
        console.log(`Target API: ${backendApi.lskResolver}`);
        console.log("--------------------------");

        const token = localStorage.getItem("access_token");
        try {
            const response = await axios({
                method: "post",
                url: backendApi.lskResolver,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                data : formData,

            });

            const result = response.data;

            if (response.status === 200 && result && result.data && typeof result.data === 'string') {
                setPreviewData(result.data);
                // Set success status (will trigger useEffect timer)
                setUploadStatus({ state: 'success', message: result.message || `Successfully resolved ${fileName}` });
                console.log("--- API Success ---");
            } else {
                throw new Error(result?.message || result?.error || 'Received unexpected data structure from server.');
            }

            // Clear input fields on success, but keep filename for potential download name
            setSelectedFile(null);
            setBranchName('');
            setRepositoryUrl('');
            setRelativeFilePath('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            // Don't reset fileName here, keep it for download default

        } catch (error) {
            console.error("--- API Request Failed ---", error);
            let errorMessage = 'An unknown processing error occurred.';
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    errorMessage = error.response.data?.error || `Server Error (${error.response.status})`;
                } else if (error.request) {
                    errorMessage = 'No response from server. Check network or backend status.';
                } else {
                    errorMessage = error.message;
                }
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
            // Set error status (will trigger useEffect timer)
            setUploadStatus({ state: 'error', message: errorMessage });
            setPreviewData('');
        } finally {
            setIsLoading(false); // Ensure loading is always turned off
        }
    };

    // Determine if actions should be enabled (no changes)
    const canSubmit = !!selectedFile && !!branchName && !!repositoryUrl && !!relativeFilePath && !isLoading;
    const canPreviewOrDownload = uploadStatus.state === 'success' && !!previewData && !isLoading;

    // --- Render ---
    return (
        <div className="space-y-6">
            {/* Input Form Section (Structure remains the same) */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5">
                {/* Header, Input Fields Group, File Input Section (no changes needed here) */}
                {/* Header */}
                <div className="pb-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-800">
                        XML Logical Seed Key Resolver
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Provide repository details, file path, and upload your XML file.
                    </p>
                </div>

                {/* Input Fields Group */}
                <div className="grid grid-cols-1 gap-y-5 gap-x-4 sm:grid-cols-2">
                    {/* Repository URL Input */}
                    <div className="sm:col-span-1 relative group">
                        <label htmlFor="repositoryUrl" className="block text-sm font-medium text-gray-700 mb-1">
                            Repository URL <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaGitAlt className="h-4 w-4" /></span>
                            <input type="url" id="repositoryUrl" value={repositoryUrl} onChange={(e) => setRepositoryUrl(e.target.value)}
                                   className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                                   required disabled={isLoading} placeholder="e.g., https://github.com/user/repo.git" aria-label="Repository URL" />
                        </div>
                    </div>

                    {/* Branch Name Input */}
                    <div className="sm:col-span-1 relative group">
                        <label htmlFor="branchName" className="block text-sm font-medium text-gray-700 mb-1">
                            Branch Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaCodeBranch className="h-4 w-4" /></span>
                            <input type="text" id="branchName" value={branchName} onChange={(e) => setBranchName(e.target.value)}
                                   className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                                   required disabled={isLoading} placeholder="e.g., main, develop" aria-label="Branch Name" />
                        </div>
                    </div>

                    {/* Relative File Path Input */}
                    <div className="sm:col-span-2 relative group"> {/* Spans full width */}
                        <label htmlFor="relativeFilePath" className="block text-sm font-medium text-gray-700 mb-1">
                            Relative File Path <span className="text-gray-400 text-xs">(in repository)</span> <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaFolderOpen className="h-4 w-4" /></span>
                            <input type="text" id="relativeFilePath" value={relativeFilePath} onChange={(e) => setRelativeFilePath(e.target.value)}
                                   className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500 text-sm disabled:bg-gray-50 disabled:cursor-not-allowed"
                                   required disabled={isLoading} placeholder="e.g., src/data/my-file.xml" aria-label="Relative File Path" />
                        </div>
                    </div>
                </div>

                {/* File Input Section */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                        XML File Selection <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <input type="file" id="xmlFile" accept=".xml,text/xml" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={isLoading}/>
                        <button type="button" onClick={handleUploadClick} disabled={isLoading}
                                className={`flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 rounded-md shadow-sm transition duration-150 whitespace-nowrap ${
                                    isLoading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-gray-500'
                                }`}
                        >
                            <FaFileUpload className={`mr-2 h-4 w-4 ${isLoading ? 'text-gray-400' : 'text-gray-500'}`} />
                            {selectedFile ? 'Change File' : 'Select XML File'}
                        </button>
                        <span className={`text-sm truncate flex-1 min-w-0 pt-1 sm:pt-0 ${selectedFile ? 'text-gray-700 font-medium' : 'text-gray-500 italic'}`} title={fileName}>
                            {fileName}
                        </span>
                    </div>
                </div>


                {/* Status Message Area - MODIFIED */}
                <div className="min-h-[50px] flex items-center">
                    {uploadStatus.state !== 'idle' && (
                        <div className={`flex items-center space-x-2 p-3 text-sm rounded-md border w-full ${
                            uploadStatus.state === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
                                uploadStatus.state === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                                    uploadStatus.state === 'loading' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                        'hidden' // Should not happen if state is not idle
                        }`}>
                            {/* Icon based on state */}
                            {uploadStatus.state === 'success' && <FaCheckCircle className="flex-shrink-0 h-5 w-5" />}
                            {uploadStatus.state === 'error' && <FaInfoCircle className="flex-shrink-0 h-5 w-5" />}
                            {uploadStatus.state === 'loading' && <FaSpinner className="flex-shrink-0 h-5 w-5 animate-spin" />}

                            {/* Message */}
                            <span className="flex-1">{uploadStatus.message}</span>

                            {/* --- Display Countdown Timer --- */}
                            {(uploadStatus.state === 'success' || uploadStatus.state === 'error') && countdownSeconds > 0 && (
                                <span className={`ml-2 font-medium text-sm  rounded  ${uploadStatus.state === 'success' ? 'text-green-700' : 'text-red-700'} `}>
                                    View will end in ({countdownSeconds}s)
                                </span>
                            )}
                            {/* --- End Countdown Timer Display --- */}

                        </div>
                    )}
                </div>


                {/* Action Buttons (Structure remains the same) */}
                <div className="pt-3 flex flex-wrap gap-4 justify-end items-center border-t border-gray-200">
                     {/* Preview/Download Buttons appear on success */}
                     {canPreviewOrDownload && (
                        <>
                            <button type="button" onClick={handleShowPreview}
                                    className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 rounded-md shadow-sm transition duration-150 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-gray-500 ${
                                        showPreview ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-white text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                {showPreview ? <FaEyeSlash className="mr-2 h-4 w-4" /> : <FaEye className="mr-2 h-4 w-4" />}
                                {showPreview ? 'Hide Preview' : 'Show Preview'}
                            </button>

                            <button type="button" onClick={handleDownload}
                                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-transparent rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                <FaDownload className="-ml-1 mr-2 h-4 w-4" />
                                Download XML
                                </button>
                                </>
                                )}

                            {/* Submit Button */}
                            <button type="button" onClick={handleSubmit} disabled={!canSubmit}
                                    className={`inline-flex items-center justify-center px-6 py-2 text-sm font-medium border border-transparent rounded-md shadow-sm text-white transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-800 ${
                                        canSubmit ? 'bg-gray-800 hover:bg-black' : 'bg-gray-300 cursor-not-allowed'
                                    }`}
                            >
                                {isLoading ? (
                                    <>
                                        <FaSpinner className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                        Processing...
                                    </>
                                ) : (
                                    'Resolve Placeholders'
                                )}
                            </button>
                        </div>
                        </div>

                    {/* Preview Section (Structure remains the same) */}
                    {showPreview && previewData && (
                        <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-0 w-full mt-6 overflow-hidden">
                            {/* Preview Header */}
                            <div className="px-4 py-3 border-b border-gray-200 ">
                                <div className="pb-4 border-b border-gray-200 flex flex-row justify-between w-full">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-800">
                                            Resolved XML file preview
                                        </h2>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Preview of the XML file after resolving placeholders.
                                        </p>
                                    </div>
                                    <div className={`flex flex-row gap-2 py-2`}>
                                        <button type="button" onClick={handleDownload}
                                                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-transparent rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 transition duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                        >
                                            <FaDownload className="-ml-1 mr-2 h-4 w-4" />
                                            Download XML
                                        </button>
                                        <button type="button" onClick={handleShowPreview}
                                                className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium border border-gray-300 rounded-md shadow-sm transition duration-150 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-gray-500 ${
                                                    showPreview ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-white text-gray-700 hover:bg-gray-50'
                                                }`}
                                        >
                                            Close preview
                                        </button>
                                    </div>

                                </div>
                                {/* Syntax Highlighter Area */}
                                <div className="overflow-auto text-sm max-h-[60vh] bg-white">
                                    <SyntaxHighlighter
                                        language="xml"
                                        style={prism}
                                        wrapLines={true}
                                        showLineNumbers={true}
                                        customStyle={{
                                            margin: 0,
                                            padding: '1rem',
                                            fontSize: '0.875rem',
                                            borderRadius: '0 0 0.5rem 0.5rem',
                                            border: 'none',
                                            boxShadow: 'none'
                                        }}
                                        lineNumberStyle={{
                                            color: '#9ca3af',
                                            minWidth: '2.5em',
                                            paddingRight: '1em',
                                            textAlign: 'right',
                                            userSelect: 'none',
                                        }}
                                    >
                                        {previewData}
                                    </SyntaxHighlighter>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                );
                };

                export default XmlResolverUploader;