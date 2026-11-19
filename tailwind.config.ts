import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        forest: "#123D2B",
        cream: "#FAF7F0",
        sage: "#A8B99A",
        olive: "#657B4B",
        gold: "#D8A332",
        charcoal: "#26312B",
      },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
    },
  },
  plugins: [],
} satisfies Config;
