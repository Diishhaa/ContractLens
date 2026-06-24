import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F9FAFB", // Light Gray
        foreground: "#111827", // Near black
        primary: {
          DEFAULT: "#2563EB", // Bright Blue
          hover: "#1D4ED8",
          light: "#EFF6FF",
        },
        accent: {
          DEFAULT: "#3B82F6", // Lighter Bright Blue
          warning: "#F59E0B", // Amber warning
          danger: "#EF4444",  // Red error/danger
        },
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(37, 99, 235, 0.05), 0 2px 10px -1px rgba(0, 0, 0, 0.03)',
        'premium-hover': '0 10px 30px -3px rgba(37, 99, 235, 0.1), 0 4px 15px -2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;
