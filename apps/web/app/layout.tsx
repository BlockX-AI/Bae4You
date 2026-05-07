import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";
import Navbar from "@/components/navbar";

export const metadata: Metadata = {
  title:       "Bae4U — Social Dating Universe",
  description: "Own pets, match with people, and build connections on-chain.",
  icons:       { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main style={{ paddingTop: "72px", paddingBottom: "72px", minHeight: "100vh" }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
