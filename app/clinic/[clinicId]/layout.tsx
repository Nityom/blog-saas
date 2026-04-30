"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { ReactNode } from "react";
import { LayoutDashboard, FileText, Key, BarChart3, Building2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function ClinicAdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const clinicId = params.clinicId as string;

  const clinic = useQuery(api.clinics.getById, { clinicId: clinicId as Id<"clinics"> });

  const navItems = [
    { name: "Overview", href: `/clinic/${clinicId}`, icon: LayoutDashboard },
    { name: "Posts", href: `/clinic/${clinicId}/posts`, icon: FileText },
    { name: "Keywords", href: `/clinic/${clinicId}/keywords`, icon: Key },
    { name: "Analytics", href: `/clinic/${clinicId}/analytics`, icon: BarChart3 },
  ];

  if (clinic === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-neutral-400">Loading portal...</div>;
  }

  if (clinic === null) {
    return <div className="min-h-screen flex items-center justify-center bg-neutral-50 text-neutral-400">Clinic not found</div>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-r border-neutral-200 flex-shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Building2 className="text-blue-600" />
            {clinic.name}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">Tenant Portal</p>
        </div>
        <nav className="px-4 pb-6 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <item.icon size={18} className={isActive ? "text-blue-600" : "text-neutral-400"} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
