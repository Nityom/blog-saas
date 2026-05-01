import Link from "next/link";
import { ReactNode } from "react";
import { Activity, Building2, Home } from "lucide-react";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-r border-neutral-200 flex-shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Activity className="text-blue-600" />
            Dental SaaS
          </h1>
        </div>
        <nav className="px-4 pb-6 space-y-1">
          <Link href="/super-admin" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors">
            <Home size={18} className="text-neutral-400" />
            Dashboard
          </Link>
          <Link href="/super-admin/clinics/new" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors">
            <Building2 size={18} className="text-neutral-400" />
            New Clinic
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
