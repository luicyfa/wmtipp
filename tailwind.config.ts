import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#0B5D3B",
        grass: "#0F7A4F",
        leaf: "#1FA463",
        ink: "#10231A",
        sun: "#F6C453",
        coral: "#D62828"
      },
      boxShadow: {
        card: "0 10px 35px rgba(11, 93, 59, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
