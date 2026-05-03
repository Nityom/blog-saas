"use client";

import React from "react";

export default function CTASection() {
  return (
    <section id="contact" className="py-28 relative overflow-hidden" style={{ background: "#000" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(39,243,169,0.06) 0%, transparent 65%)",
        }}
      />

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <span
          className="inline-block text-xs font-semibold uppercase tracking-widest mb-6 px-3 py-1 rounded-full"
          style={{ color: "#27f3a9", background: "rgba(39,243,169,0.08)", border: "1px solid rgba(39,243,169,0.18)", letterSpacing: "0.14em" }}
        >
          Join The Movement
        </span>

        <h2
          className="text-4xl md:text-6xl font-light tracking-tight mb-6"
          style={{ color: "#fff", lineHeight: 1.1 }}
        >
          Ready to put your
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #666 0%, #d0d0d0 50%, #666 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            clinics on autopilot?
          </span>
        </h2>

        <p className="text-base mb-10" style={{ color: "#666", maxWidth: 440, margin: "0 auto 40px" }}>
          Get in touch and we&apos;ll set up your first clinic blog in under 24 hours — no technical knowledge required.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            className="transition-all duration-300 hover:scale-[1.04] hover:shadow-[0px_6px_40px_8px_rgba(39,243,169,0.25)] active:scale-[0.98]"
            style={{
              padding: "14px 36px",
              background: "#27f3a9",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              fontSize: 15,
              fontWeight: 600,
              color: "#000",
            }}
          >
            Start Free Trial
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7h10M8 4l4 3-4 3" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            className="transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              padding: "14px 36px",
              background: "transparent",
              boxShadow: "0px 4px 18px 4px rgba(39, 243, 169, 0.08)",
              borderRadius: 8,
              outline: "1px solid rgba(255,255,255,0.12)",
              outlineOffset: -1,
              border: "none",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 400,
              color: "#ccc",
            }}
          >
            Book a Demo
          </button>
        </div>

        {/* Trust nudge */}
        <div className="mt-10 flex items-center justify-center gap-6 flex-wrap">
          {["No credit card required", "Setup in 24 hours", "Cancel anytime"].map((t) => (
            <span key={t} className="flex items-center gap-2 text-xs" style={{ color: "#555" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l2.5 2.5L10 3" stroke="#27f3a9" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
