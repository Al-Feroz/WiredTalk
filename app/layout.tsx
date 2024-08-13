import ProviderWrapper from "./ProviderWrapper";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WiredTalk",
  description: "Chatting & Video Calling App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProviderWrapper>
      <html lang="en">
        <body className={inter.className} suppressHydrationWarning={true}>
          {children}
        </body>
      </html>
    </ProviderWrapper>
  );
}
