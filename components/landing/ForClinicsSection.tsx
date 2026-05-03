"use client";

import React from "react";

const stats = [
  { value: "10×", label: "More content published", sub: "vs. manual blogging" },
  { value: "~0", label: "Hours of manual work", sub: "per clinic per month" },
  { value: "3+", label: "Social platforms", sub: "auto-posted simultaneously" },
  { value: "∞", label: "Scale potential", sub: "one dashboard, any clinic count" },
];

const clinicBenefits = [
  "Branded blog with custom domain & logo",
  "3–5 AI posts published per week",
  "Auto-shared to Facebook & Instagram",
  "Full SEO: schema, meta, sitemap",
  "View analytics and post tracking",
  "Easy appointment booking integration",
];

export default function ForClinicsSection() {
  return (
    <section id="for-clinics" className="py-28 relative overflow-hidden" style={{ background: "#000" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 60% at 80% 50%, rgba(39,243,169,0.04) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-24">
          {stats.map((s) => (
            <div
              key={s.value}
              className="text-center rounded-2xl p-6"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div
                className="text-5xl font-light mb-1"
                style={{
                  background: "linear-gradient(135deg, #27f3a9 0%, #6ee7c0 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {s.value}
              </div>
              <div className="text-sm font-medium mb-0.5" style={{ color: "#fff" }}>{s.label}</div>
              <div className="text-xs" style={{ color: "#555" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Split content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
              style={{ color: "#27f3a9", background: "rgba(39,243,169,0.08)", border: "1px solid rgba(39,243,169,0.18)", letterSpacing: "0.14em" }}
            >
              For Clinics
            </span>
            <h2
              className="text-4xl md:text-5xl font-light tracking-tight mb-6"
              style={{ color: "#fff", lineHeight: 1.15 }}
            >
              Your clinic blog,{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #666 0%, #d0d0d0 50%, #666 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                on autopilot
              </span>
            </h2>
            <p className="text-base leading-relaxed mb-8" style={{ color: "#777" }}>
              Your dental clients focus on patients. BlogForge handles their entire online presence — from writing and publishing to SEO and social. Every week, fresh content goes live without anyone lifting a finger.
            </p>
            <ul className="flex flex-col gap-3">
              {clinicBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm" style={{ color: "#aaa" }}>
                  <span
                    className="flex-shrink-0 mt-0.5 inline-flex items-center justify-center rounded-full"
                    style={{ width: 18, height: 18, background: "rgba(39,243,169,0.12)", border: "1px solid rgba(39,243,169,0.25)" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="#27f3a9" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          {/* Mock blog card preview */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            {/* Browser chrome */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.04)" }}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ffbd2e" }} />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
              <div
                className="ml-3 flex-1 rounded text-xs px-3 py-1"
                style={{ background: "rgba(255,255,255,0.05)", color: "#555", fontFamily: "monospace" }}
              >
                yourdental.com/blog
              </div>
            </div>
            {/* Content preview */}
            <div className="p-6 flex flex-col gap-4">
              <div className="rounded-xl w-full h-32" style={{ background: "rgba(39,243,169,0.05)", border: "1px solid rgba(39,243,169,0.08)" }}>
                <div className="flex items-center justify-center h-full">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" opacity="0.3">
                    <rect x="4" y="4" width="24" height="24" rx="6" stroke="#27f3a9" strokeWidth="1.5" />
                    <circle cx="12" cy="13" r="3" stroke="#27f3a9" strokeWidth="1.5" />
                    <path d="M4 24l6-5 4 4 5-6 9 7" stroke="#27f3a9" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className="h-3 rounded" style={{ background: "rgba(255,255,255,0.07)", width: "75%" }} />
              <div className="h-3 rounded" style={{ background: "rgba(255,255,255,0.05)", width: "55%" }} />
              <div className="flex gap-2 mt-1">
                <div className="h-2.5 rounded" style={{ background: "rgba(255,255,255,0.04)", width: "30%" }} />
                <div className="h-2.5 rounded" style={{ background: "rgba(255,255,255,0.04)", width: "20%" }} />
              </div>
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="h-2 rounded" style={{ background: "rgba(255,255,255,0.04)", width: "100%" }} />
                <div className="h-2 rounded" style={{ background: "rgba(255,255,255,0.04)", width: "88%" }} />
                <div className="h-2 rounded" style={{ background: "rgba(255,255,255,0.04)", width: "72%" }} />
              </div>
              <div
                className="inline-flex items-center gap-2 text-xs rounded-md px-3 py-1.5 self-start mt-2"
                style={{ background: "rgba(39,243,169,0.08)", border: "1px solid rgba(39,243,169,0.18)", color: "#27f3a9" }}
              >
                Read Article →
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
