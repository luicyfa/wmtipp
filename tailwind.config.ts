import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pitch: "#0f7a4f",
        ink: "#172033",
        sun: "#f6c453",
        coral: "#f9735b"
      },
      boxShadow: {
        card: "0 10px 35px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
