"use client";

import React from "react";

const steps = [
  {
    number: "01",
    title: "Onboard your clinic",
    desc: "Add the clinic's details, connect their Facebook/Instagram token, set their blog domain and subscription start date — takes under 5 minutes.",
  },
  {
    number: "02",
    title: "AI writes & publishes posts",
    desc: "Our engine generates SEO-optimised posts on a schedule. Each post is reviewed, rendered on their branded blog, and auto-shared to social channels.",
  },
  {
    number: "03",
    title: "Track, bill & grow",
    desc: "Watch post views, social engagement, and billing cycles from your master dashboard. Scale across dozens of clinics without extra overhead.",
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-28 relative overflow-hidden" style={{ background: "#030303" }}>
      {/* Decorative line */}
      <div
        className="absolute left-1/2 top-0 bottom-0 w-px pointer-events-none hidden lg:block"
        style={{ background: "linear-gradient(to bottom, transparent, rgba(39,243,169,0.08) 30%, rgba(39,243,169,0.08) 70%, transparent)", transform: "translateX(-50%)" }}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-20">
          <span
            className="inline-block text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{ color: "#27f3a9", background: "rgba(39,243,169,0.08)", border: "1px solid rgba(39,243,169,0.18)", letterSpacing: "0.14em" }}
          >
            How It Works
          </span>
          <h2
            className="text-4xl md:text-5xl font-light tracking-tight"
            style={{ color: "#fff", lineHeight: 1.15 }}
          >
            Simple setup.{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #666 0%, #d0d0d0 50%, #666 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Powerful results.
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="relative flex flex-col">
              {/* Connector line for desktop */}
              {i < steps.length - 1 && (
                <div
                  className="absolute top-8 left-full w-8 h-px hidden lg:block"
                  style={{ background: "rgba(39,243,169,0.15)" }}
                />
              )}
              <div
                className="rounded-2xl p-8 flex flex-col gap-4 h-full"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span
                  className="font-mono text-5xl font-light"
                  style={{
                    background: "linear-gradient(135deg, rgba(39,243,169,0.5) 0%, rgba(39,243,169,0.1) 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    lineHeight: 1,
                  }}
                >
                  {step.number}
                </span>
                <h3 className="text-lg font-semibold" style={{ color: "#fff" }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#777" }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
