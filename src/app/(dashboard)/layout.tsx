export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="px-2 pt-14 pb-4 md:px-4 md:pt-6 md:pb-6">{children}</div>
      </main>
    </div>
  );
}
