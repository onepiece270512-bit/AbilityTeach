import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AbilityTeach — Every Student. A Better Way to Learn.",
  description: "A connected curriculum platform for teachers and students: plan lessons, explore different ways to learn, and follow real progress.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
