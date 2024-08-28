import ProviderWrapper from "@/app/ProviderWrapper";
import { Montserrat } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const montserrat = Montserrat({ subsets: ["latin", "cyrillic", "vietnamese"] });

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
        <body className={montserrat.className} suppressHydrationWarning>
          {children}
        </body>
      </html>
    </ProviderWrapper>
  );
}
