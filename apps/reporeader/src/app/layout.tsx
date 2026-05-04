import StandardLayout from "@launchthatapp/ui/layout/StandardLayout";

import "./styles.css";

import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Geist } from "next/font/google";
import { headers } from "next/headers";

import { ThemeProvider } from "@launchthatapp/ui";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "RepoReader",
  description:
    "Transform repository changes into structured lesson drafts for technical education.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout(props: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
}) {
  const headerList = await headers();
  const pathnameHeader = headerList.get("x-pathname");
  const pathname =
    typeof pathnameHeader === "string" && pathnameHeader.length > 0
      ? pathnameHeader
      : "/";

  const segments = pathname
    .replace(/^\/+/, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const firstSegment = segments[0] ?? "";

  const showHeader = firstSegment !== "sign-in" && firstSegment !== "sign-up";
  const showSidebar = firstSegment === "admin" || firstSegment === "platform";

  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        {await ConvexAuthNextjsServerProvider({
          children: (
            <Providers>
              <ThemeProvider>
                <StandardLayout
                  appName="RepoReader"
                  sidebar={showSidebar ? props.sidebar : undefined}
                  header={showHeader ? props.header : null}
                  footer={props.footer}
                  showSidebar={showSidebar}
                  className="rounded-3xl! shadow-[-12px_0_10px_-3px_rgba(0,0,0,0.3)] dark:shadow-[0_4px_6px_-1px_rgba(255,255,255,0.15),0_2px_4px_-2px_rgba(255,255,255,0.1)] ml-0!"
                  sidebarOpenOnHover={true}
                  // Admin and platform routes should start collapsed on initial load.
                  sidebarDefaultOpen={false}
                >
                  <div className="flex min-w-0 flex-1">{props.children}</div>
                </StandardLayout>
              </ThemeProvider>
            </Providers>
          ),
        })}
      </body>
    </html>
  );
}
