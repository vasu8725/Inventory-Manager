/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0B0F19",       // Deep dark space blue
        darkCard: "#111827",     // Cool grey dark
        glassBg: "rgba(17, 24, 39, 0.75)",
        neonIndigo: "#6366F1",   // Indigo
        neonCyan: "#06B6D4",     // Cyan
        neonGreen: "#10B981",    // Green for positive actions
        neonRed: "#EF4444",      // Red for delete/errors
        neonYellow: "#F59E0B",   // Warning low stock
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
