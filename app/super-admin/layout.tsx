"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Activity, Building2, Home, LogOut } from "lucide-react";

const SESSION_KEY = "blog_admin_authed";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  const isLoginPage = pathname === "/super-admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setChecked(true);
      return;
    }
    const authed = sessionStorage.getItem(SESSION_KEY);
    if (!authed) {
      router.replace("/super-admin/login");
    } else {
      setChecked(true);
    }
  }, [isLoginPage, router]);

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY);
    router.replace("/super-admin/login");
  };

  // Show nothing while checking auth to avoid flash
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "rgba(39,243,169,0.4)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  // Login page renders without sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-r border-neutral-200 flex-shrink-0 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
            <Activity className="text-blue-600" />
            Dental SaaS
          </h1>
        </div>
        <nav className="px-4 pb-6 space-y-1 flex-1">
          <Link
            href="/super-admin"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <Home size={18} className="text-neutral-400" />
            Dashboard
          </Link>
          <Link
            href="/super-admin/clinics/new"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <Building2 size={18} className="text-neutral-400" />
            New Clinic
          </Link>
        </nav>

        {/* Logout */}
        <div className="px-4 pb-6">
          <div className="border-t border-neutral-100 pt-4">
            <div className="flex items-center gap-3 px-3 py-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-blue-600">A</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-neutral-800 truncate">blog@admin.com</p>
                <p className="text-[10px] text-neutral-400">Super Admin</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50 text-neutral-500 hover:text-red-600 transition-colors text-sm"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
