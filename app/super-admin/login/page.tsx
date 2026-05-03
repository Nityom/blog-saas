"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Eye, EyeOff } from "lucide-react";

const ADMIN_EMAIL = "blog@admin.com";
const ADMIN_PASS = "Admin@123";
const SESSION_KEY = "blog_admin_authed";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulate a slight delay for UX
    await new Promise((r) => setTimeout(r, 500));

    if (email.trim() === ADMIN_EMAIL && password === ADMIN_PASS) {
      sessionStorage.setItem(SESSION_KEY, "true");
      router.replace("/super-admin");
    } else {
      setError("Invalid email or password.");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, #0a0a0a 0%, #111 100%)",
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(39,243,169,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <span
            className="inline-flex items-center justify-center rounded-xl mb-3"
            style={{
              width: 48,
              height: 48,
              background: "rgba(39,243,169,0.1)",
              border: "1px solid rgba(39,243,169,0.25)",
            }}
          >
            <Activity size={22} style={{ color: "#27f3a9" }} />
          </span>
          <h1 className="text-xl font-semibold" style={{ color: "#fff" }}>
            BlogForge Admin
          </h1>
          <p className="text-sm mt-1" style={{ color: "#555" }}>
            Sign in to your dashboard
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
          }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium"
                style={{ color: "#888" }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="blog@admin.com"
                required
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  caretColor: "#27f3a9",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.border = "1px solid rgba(39,243,169,0.4)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)")
                }
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium"
                style={{ color: "#888" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg px-4 py-2.5 pr-10 text-sm outline-none transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff",
                    caretColor: "#27f3a9",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.border = "1px solid rgba(39,243,169,0.4)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)")
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#555", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="rounded-lg px-4 py-2.5 text-sm"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_4px_24px_rgba(39,243,169,0.2)] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading ? "rgba(39,243,169,0.6)" : "#27f3a9",
                color: "#000",
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#333" }}>
          © {new Date().getFullYear()} BlogForge · Developed by Nityom Tikhe
        </p>
      </div>
    </div>
  );
}
