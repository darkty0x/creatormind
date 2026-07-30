import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShowRunner · CreatorMind",
  description:
    "Creator ops Mind for Animoca — persistent memory across repurpose, growth, and moderation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Sora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/showrunner-mark.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
