import ProviderWrapper from "@/app/ProviderWrapper";
import { Montserrat } from "next/font/google";
import type { Metadata } from "next";
import "./register.css";

const montserrat = Montserrat({ subsets: ["latin", "cyrillic", "vietnamese"] });

export const metadata: Metadata = {
  title: "Register | WiredTalk",
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
