"use client";

import React from "react";

const features = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="2" width="18" height="18" rx="4" stroke="#27f3a9" strokeWidth="1.5" />
        <path d="M7 11l3 3 5-5" stroke="#27f3a9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "AI-Generated Blog Posts",
    desc: "Instantly publish high-quality, SEO-optimised blog content tailored to each clinic's specialty and target audience — fully automated.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="9" stroke="#27f3a9" strokeWidth="1.5" />
        <path d="M11 7v4l3 2" stroke="#27f3a9" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Auto Social Sharing",
    desc: "Each post is automatically shared to Instagram, Facebook, and more — keeping your clinic's social presence alive without lifting a finger.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M4 17L9 12L13 16L18 5" stroke="#27f3a9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: "Multi-Tenant Dashboard",
    desc: "Manage every clinic from a single command centre. Monitor billing, post performance, token health, and social reach — all in one place.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="8" cy="8" r="5" stroke="#27f3a9" strokeWidth="1.5" />
        <path d="M14 14l4 4" stroke="#27f3a9" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Custom Domain & Branding",
    desc: "Each clinic gets their own branded blog under a custom domain. Seamlessly embed content into existing websites or run standalone.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2L13.5 8H20L14.5 12L16.5 18L11 14.5L5.5 18L7.5 12L2 8H8.5L11 2Z" stroke="#27f3a9" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    title: "SEO-First Architecture",
    desc: "Every post includes structured data, meta tags, image alt text, and internal linking — built to rank from day one.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="5" width="16" height="12" rx="2" stroke="#27f3a9" strokeWidth="1.5" />
        <path d="M3 9h16" stroke="#27f3a9" strokeWidth="1.5" />
        <circle cx="7" cy="14" r="1" fill="#27f3a9" />
      </svg>
    ),
    title: "Subscription Billing Tracker",
    desc: "Keep on top of every client's payment cycle. Mark invoices paid, track overdue accounts, and get at-a-glance billing insights.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="product" className="py-28 relative" style={{ background: "#000" }}>
      {/* Subtle green grid glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(39,243,169,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span
            className="inline-block text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{
              color: "#27f3a9",
              background: "rgba(39,243,169,0.08)",
              border: "1px solid rgba(39,243,169,0.18)",
              letterSpacing: "0.14em",
            }}
          >
            Platform Features
          </span>
          <h2
            className="text-4xl md:text-5xl font-light tracking-tight"
            style={{ color: "#fff", lineHeight: 1.15 }}
          >
            Everything a clinic needs
            <br />
            <span
              style={{
                background: "linear-gradient(90deg, #666 0%, #d0d0d0 50%, #666 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              to grow online
            </span>
          </h2>
          <p className="mt-4 text-base" style={{ color: "#666", maxWidth: 480, margin: "16px auto 0" }}>
            From AI content to social posting and billing — BlogForge is the only tool your dental clients will ever need.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                backdropFilter: "blur(8px)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(39,243,169,0.2)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 32px 0 rgba(39,243,169,0.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <div
                className="inline-flex items-center justify-center rounded-lg mb-4"
                style={{ width: 44, height: 44, background: "rgba(39,243,169,0.08)", border: "1px solid rgba(39,243,169,0.15)" }}
              >
                {f.icon}
              </div>
              <h3 className="text-base font-semibold mb-2" style={{ color: "#fff" }}>
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#777" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
