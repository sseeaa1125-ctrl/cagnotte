import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdminMe } from "@/lib/serverAdminAuth";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

interface LayoutAdmin {
  id: string;
  email: string;
  role: string;
  name: string;
}

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const admin = await requireAdminMe<LayoutAdmin>();

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminShell admin={admin}>
        <main className="container mx-auto px-4 sm:px-6 pt-6 pb-10">
          {children}
        </main>
      </AdminShell>
    </div>
  );
}
