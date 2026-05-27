/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      colors: {
        indigo: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        violet: {
          500: "#8b5cf6",
          600: "#7c3aed",
        },
      },
      animation: {
        "spin-slow": "spin 8s linear infinite",
        "bounce-slow": "bounceSoft 4s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2.5s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        float: "float 6s ease-in-out infinite",
        "float-delay": "float 6s ease-in-out 2s infinite",
        "slide-up": "slideUp 0.6s ease forwards",
        "fade-in": "fadeIn 0.5s ease forwards",
        typewriter: "typewriter 2s steps(20) forwards",
        blink: "blink 1s step-end infinite",
        orbit: "orbit 6s linear infinite",
        "orbit-reverse": "orbit 9s linear infinite reverse",
      },
      keyframes: {
        bounceSoft: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(79,70,229,0.3)" },
          "50%": {
            boxShadow:
              "0 0 50px rgba(79,70,229,0.7), 0 0 80px rgba(124,58,237,0.4)",
          },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%": { transform: "translateY(-12px) rotate(1deg)" },
          "66%": { transform: "translateY(-6px) rotate(-1deg)" },
        },
        slideUp: {
          from: { opacity: 0, transform: "translateY(30px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        blink: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0 },
        },
        orbit: {
          from: { transform: "rotate(0deg) translateX(55px) rotate(0deg)" },
          to: {
            transform: "rotate(360deg) translateX(55px) rotate(-360deg)",
          },
        },
      },
    },
  },
  plugins: [],
};
