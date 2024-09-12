import ProviderWrapper from "@/app/ProviderWrapper";
import { Montserrat } from "next/font/google";
import type { Metadata } from "next";
import "./call.css";

const montserrat = Montserrat({ subsets: ["latin", "cyrillic", "vietnamese"] });

export const metadata: Metadata = {
  title: "Call | WiredTalk",
  description: "Chatting & Video Calling App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProviderWrapper>
      <main className={montserrat.className} suppressHydrationWarning>
        {children}
      </main>
    </ProviderWrapper>
  );
}
