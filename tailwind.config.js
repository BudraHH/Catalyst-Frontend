/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}", // Include all your component files
    ],
    theme: {
        extend: {
            fontFamily: {
              sans: ['Inter', 'sans-serif'], // Example custom font
            },
        },
    },
    plugins: [

    ],
}