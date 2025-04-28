import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc' // Correct import

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], // Make sure this line uses the 'react' variable
})