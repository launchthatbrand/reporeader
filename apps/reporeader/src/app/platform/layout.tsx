import { redirect } from "next/navigation";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";

export default async function PlatformLayout(props: {
  children: React.ReactNode;
}) {
  const token = await convexAuthNextjsToken();
  if (!token) {
    redirect("/sign-in?return_to=/platform");
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {props.children}
    </main>
  );
}
