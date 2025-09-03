/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        vz: {
          bg: "var(--vz-bg)",
          text: "var(--vz-text)",
          muted: "var(--vz-muted)",
          primary: "var(--vz-primary)",
          primary600: "var(--vz-primary-600)",
          accent: "var(--vz-accent)",
          card: "var(--vz-card)",
          border: "var(--vz-border)"
        }
      },
      boxShadow: { soft: "0 10px 30px rgba(17,24,39,.08)" },
      borderRadius: { xl2: "1rem" }
    }
  },
  plugins: []
}
