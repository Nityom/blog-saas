import Link from "next/link";
import { ReactNode } from "react";
import { Activity, Building2, Home } from "lucide-react";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-neutral-900 border-b md:border-r border-neutral-800 flex-shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="text-blue-500" />
            Dental SaaS
          </h1>
        </div>
        <nav className="px-4 pb-6 space-y-1">
          <Link href="/super-admin" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors">
            <Home size={18} />
            Dashboard
          </Link>
          <Link href="/super-admin/clinics/new" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors">
            <Building2 size={18} />
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
