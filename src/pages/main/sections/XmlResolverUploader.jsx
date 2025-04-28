// src/components/XmlResolverUploader.jsx
import { useState, useRef, useEffect } from 'react'; // Added useEffect
import {
    FaFileUpload, FaInfoCircle, FaSpinner, FaCheckCircle, FaTimesCircle,
    FaCodeBranch, FaGitAlt, FaFolderOpen, FaDownload, FaEye, FaEyeSlash
} from 'react-icons/fa'; // Added FaEye/FaEyeSlash
import Api from "../../../backendApi/index.js"; // Ensure correct path
import axios from "axios";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// Using a light theme for the code to better match the overall theme
import { prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import backendApi from "../../../backendApi/index.js"; // Light theme example

// Helper function to sanitize filename
const sanitizeFilename = (name) => {
    if (!name || typeof name !== 'string') return 'download.xml';
    // Replace potentially problematic characters with underscores
    return name.replace(/[\s<>:"/\\|?*]+/g, '_').replace(/\.[^/.]+$/, ""); // Remove extension for base name
};

const XmlResolverUploader = () => {
    // Input states
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileName, setFileName] = useState('No XML file selected');
    const [branchName, setBranchName] = useState('');
    const [repositoryUrl, setRepositoryUrl] = useState('');
    const [relativeFilePath, setRelativeFilePath] = useState('');

    // UI/Process states
    const [isLoading, setIsLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ state: 'idle', message: '' }); // idle, loading, success, error
    const [previewData, setPreviewData] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    const fileInputRef = useRef(null);

    // Effect to clear status message after a delay
    useEffect(() => {
        let timeoutId;
        if (uploadStatus.state === 'success' || uploadStatus.state === 'error') {
            timeoutId = setTimeout(() => {
                setUploadStatus({ state: 'idle', message: '' });
            }, 5000); // Clear message after 5 seconds
        }
        // Cleanup function
        return () => clearTimeout(timeoutId);
    }, [uploadStatus.state]); // Re-run only when the status *state* changes

    // --- Handlers ---

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        // Reset everything related to previous results
        setPreviewData('');
        setShowPreview(false);
        setUploadStatus({ state: 'idle', message: '' });

        if (file) {
            if (file.type === 'text/xml' || file.name.toLowerCase().endsWith('.xml')) {
                setSelectedFile(file);
                setFileName(file.name);
                setRelativeFilePath(file.name); // Pre-fill relative path
            } else {
                // Invalid file type
                setSelectedFile(null);
                setFileName('Invalid file type (XML only)');
                setRelativeFilePath('');
                setUploadStatus({ state: 'error', message: 'Please select an XML file (.xml).' });
            }
        } else {
            // No file selected (e.g., user cancelled)
            setSelectedFile(null);
            setFileName('No XML file selected');
            setRelativeFilePath('');
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleShowPreview = () => {
        setShowPreview(prev => !prev); // Toggle previous state
    };

    const handleDownload = () => {
        if (!previewData) {
            console.error("No preview data available to download.");
            setUploadStatus({ state: 'error', message: 'No resolved data available to download.' });
            return;
        }
        const baseName = sanitizeFilename(fileName); // Sanitize and remove extension
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
            // Set a temporary download success message (optional)
            // setUploadStatus({ state: 'success', message: `Downloaded ${downloadFilename}` });
        } catch (error) {
            console.error("Error during download creation:", error);
            setUploadStatus({ state: 'error', message: 'Could not initiate download.' });
        }
    };

    const handleSubmit = async () => {
        // Clear previous results/status before submitting
        setShowPreview(false);
        setPreviewData('');
        setUploadStatus({ state: 'idle', message: '' }); // Clear previous status

        // Validation
        if (!selectedFile || !branchName || !repositoryUrl || !relativeFilePath) {
            let errorMsg = 'Please complete all fields.';
            if (!selectedFile) errorMsg = 'Please select an XML file.';
            else if (!repositoryUrl) errorMsg = 'Please enter a repository URL.';
            else if (!branchName) errorMsg = 'Please enter a branch name.';
            else if (!relativeFilePath) errorMsg = 'Please enter the relative file path.';
            setUploadStatus({ state: 'error', message: errorMsg });
            return;
        }
        if (isLoading) return; // Prevent double-submit

        setIsLoading(true);
        setUploadStatus({ state: 'loading', message: 'Resolving placeholders...' });

        const formData = new FormData();
        formData.append('xmlFile', selectedFile);
        formData.append('branch', branchName);
        formData.append('repository', repositoryUrl);
        formData.append('relativePath', relativeFilePath);

        console.log("--- Submitting FormData ---"); // Keep logs for debugging if needed
        // ... (optional logging of form data) ...
        console.log(`Target API: ${backendApi.lskResolver}`);
        console.log("--------------------------");

        try {
            const response = await axios.post(backendApi.lskResolver, formData);
            const result = response.data; // Expect { message?, data?, error? }

            if (response.status === 200 && result && result.data && typeof result.data === 'string') {
                setPreviewData(result.data);
                setUploadStatus({ state: 'success', message: result.message || `Successfully resolved ${fileName}` });
                console.log("--- API Success ---");
            } else {
                // Handle cases where status is 200 but data is missing/wrong format
                throw new Error(result?.message || result?.error || 'Received unexpected data structure from server.');
            }

            // Clear fields on success, except fileName (needed for download default)
            setSelectedFile(null);
            setBranchName('');
            setRepositoryUrl('');
            setRelativeFilePath('');
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset file input
            }

        } catch (error) {
            console.error("--- API Request Failed ---", error);
            let errorMessage = 'An unknown processing error occurred.';
            if (axios.isAxiosError(error)) { // Check if it's an Axios error
                if (error.response) {
                    // Request made, server responded with non-2xx status
                    console.error("Error Status:", error.response.status);
                    console.error("Error Data:", error.response.data);
                    // Try to extract error from backend's JSON response ({ error: '...' })
                    errorMessage = error.response.data?.error || `Server Error (${error.response.status})`;
                } else if (error.request) {
                    // Request made, but no response received (network issue, server down)
                    console.error("Error Request:", error.request);
                    errorMessage = 'No response from server. Check network or backend status.';
                } else {
                    // Error setting up the request
                    errorMessage = error.message;
                }
            } else if (error instanceof Error) {
                // Handle non-Axios errors (like the one thrown above for bad data structure)
                errorMessage = error.message;
            }
            setUploadStatus({ state: 'error', message: errorMessage });
            setPreviewData(''); // Clear preview data on error
        } finally {
            setIsLoading(false); // Ensure loading is always turned off
        }
    };

    // Determine if actions should be enabled
    const canSubmit = !!selectedFile && !!branchName && !!repositoryUrl && !!relativeFilePath && !isLoading;
    const canPreviewOrDownload = uploadStatus.state === 'success' && !!previewData && !isLoading;

    // --- Render ---
    return (
        <div className="space-y-6"> {/* Outer spacing container */}
            {/* Input Form Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5"> {/* Added more padding/spacing */}
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

                {/* Status Message Area */}
                <div className="min-h-[50px] flex items-center"> {/* Reserve space */}
                    {uploadStatus.state !== 'idle' && (
                        <div className={`flex items-center space-x-2 p-3 text-sm rounded-md border w-full ${
                            uploadStatus.state === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
                                uploadStatus.state === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                                    uploadStatus.state === 'loading' ? 'bg-blue-50 border-blue-200 text-blue-700' : // Distinct loading style
                                        'hidden'
                        }`}>
                            {uploadStatus.state === 'success' && <FaCheckCircle className="flex-shrink-0 h-5 w-5" />}
                            {uploadStatus.state === 'error' && <FaInfoCircle className="flex-shrink-0 h-5 w-5" />}
                            {uploadStatus.state === 'loading' && <FaSpinner className="flex-shrink-0 h-5 w-5 animate-spin" />}
                            <span className="flex-1 text-center">{uploadStatus.message}</span> {/* Center message */}
                        </div>
                    )}
                </div>


                {/* Action Buttons */}
                <div className="pt-3 flex flex-wrap gap-4 justify-end items-center border-t border-gray-200"> {/* Aligned to end */}
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

            {/* Preview Section - Only rendered when showPreview and previewData are true */}
            {showPreview && previewData && (
                <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-0 w-full mt-6 overflow-hidden"> {/* Use lighter bg for preview */}
                    {/* Preview Header */}
                    <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-100">
                        <h3 className="text-md font-semibold text-gray-700">
                            Resolved XML Preview
                        </h3>
                        <button type="button" onClick={handleShowPreview} title="Close Preview"
                                className="text-gray-400 hover:text-gray-600 focus:outline-none text-xl leading-none p-1 -mr-1" aria-label="Close Preview">
                            <FaTimesCircle/>
                        </button>
                    </div>
                    {/* Syntax Highlighter Area */}
                    {/* Added max-height and scrollbar */}
                    <div className="overflow-auto text-sm max-h-[60vh] bg-white">
                        <SyntaxHighlighter
                            language="xml"
                            style={prism} // Use the imported light theme
                            wrapLines={true}
                            showLineNumbers={true}
                            customStyle={{
                                margin: 0,
                                padding: '1rem',
                                // Removed background override to use 'prism' style's background
                                // backgroundColor: '#f9fafb',
                                fontSize: '0.875rem', // text-sm equivalent
                                borderRadius: '0 0 0.5rem 0.5rem', // Round bottom corners only
                                border: 'none',
                                boxShadow: 'none'
                            }}
                            lineNumberStyle={{ // Style line numbers if needed
                                color: '#9ca3af', // gray-400
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
            )}
        </div> // End outer spacing container
    );
};

export default XmlResolverUploader;