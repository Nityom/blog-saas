"use client";

import React from "react";

const plans = [
  {
    name: "Starter",
    price: "₹4,999",
    period: "/mo",
    desc: "Perfect for a single clinic getting started with content marketing.",
    features: [
      "1 clinic",
      "8 AI posts per month",
      "1 social channel (FB or IG)",
      "Custom domain blog",
      "Basic SEO",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Growth",
    price: "₹9,999",
    period: "/mo",
    desc: "The most popular plan for scaling clinics that want maximum reach.",
    features: [
      "1 clinic",
      "20 AI posts per month",
      "Facebook + Instagram",
      "Custom domain blog",
      "Full SEO + Schema",
      "Post analytics dashboard",
      "Priority support",
    ],
    cta: "Start Growing",
    highlight: true,
  },
  {
    name: "Agency",
    price: "Custom",
    period: "",
    desc: "For agencies managing multiple dental clients under one roof.",
    features: [
      "Unlimited clinics",
      "Unlimited posts",
      "All social channels",
      "White-label dashboard",
      "Billing tracker per client",
      "Dedicated account manager",
    ],
    cta: "Contact Us",
    highlight: false,
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-28 relative overflow-hidden" style={{ background: "#030303" }}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(39,243,169,0.05) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <span
            className="inline-block text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1 rounded-full"
            style={{ color: "#27f3a9", background: "rgba(39,243,169,0.08)", border: "1px solid rgba(39,243,169,0.18)", letterSpacing: "0.14em" }}
          >
            Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-light tracking-tight" style={{ color: "#fff", lineHeight: 1.15 }}>
            Simple, transparent{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #666 0%, #d0d0d0 50%, #666 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              pricing
            </span>
          </h2>
          <p className="mt-4 text-base" style={{ color: "#666", maxWidth: 400, margin: "16px auto 0" }}>
            No hidden fees. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="relative rounded-2xl p-7 flex flex-col transition-all duration-300 hover:scale-[1.015]"
              style={{
                background: plan.highlight
                  ? "linear-gradient(145deg, rgba(39,243,169,0.07) 0%, rgba(0,0,0,0.5) 100%)"
                  : "rgba(255,255,255,0.025)",
                border: plan.highlight
                  ? "1px solid rgba(39,243,169,0.3)"
                  : "1px solid rgba(255,255,255,0.07)",
                boxShadow: plan.highlight ? "0 0 48px 0 rgba(39,243,169,0.06)" : "none",
              }}
            >
              {plan.highlight && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-4 py-1 rounded-full"
                  style={{ background: "#27f3a9", color: "#000" }}
                >
                  Most Popular
                </span>
              )}

              <div className="mb-5">
                <h3 className="text-base font-semibold mb-1" style={{ color: plan.highlight ? "#27f3a9" : "#fff" }}>
                  {plan.name}
                </h3>
                <p className="text-sm" style={{ color: "#666" }}>{plan.desc}</p>
              </div>

              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-light" style={{ color: "#fff" }}>{plan.price}</span>
                {plan.period && <span className="text-sm mb-1" style={{ color: "#555" }}>{plan.period}</span>}
              </div>

              <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: "#999" }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
                      <path d="M2 7l3 3 7-6" stroke="#27f3a9" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                className="w-full py-3 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: plan.highlight ? "#27f3a9" : "transparent",
                  color: plan.highlight ? "#000" : "#fff",
                  border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                }}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
