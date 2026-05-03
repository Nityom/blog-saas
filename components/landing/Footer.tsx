"use client";

import React from "react";
import Link from "next/link";

const footerLinks = {
  Product: ["Features", "How It Works", "Pricing", "Changelog"],
  Company: ["About", "Blog", "Careers", "Contact"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
};

export default function Footer() {
  return (
    <footer style={{ background: "#000", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {/* Brand col */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span
                className="inline-flex items-center justify-center rounded-lg"
                style={{ width: 32, height: 32, background: "rgba(39,243,169,0.12)", border: "1px solid #30463C" }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#27f3a9" strokeWidth="1.5" />
                  <path d="M5 8h6M8 5v6" stroke="#27f3a9" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
              <span className="font-semibold" style={{ color: "#fff", fontSize: 16 }}>BlogForge</span>
            </Link>
            <p className="text-sm leading-relaxed" style={{ color: "#555", maxWidth: 200 }}>
              AI-powered blog platform built for dental clinics. Content on autopilot.
            </p>
            <div className="flex gap-3 mt-5">
              {/* Social icons */}
              {["twitter", "linkedin", "github"].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="inline-flex items-center justify-center rounded-lg transition-all duration-200 hover:border-[rgba(39,243,169,0.3)]"
                  style={{ width: 34, height: 34, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="#555" strokeWidth="1.2" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link cols */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#444", letterSpacing: "0.1em" }}>
                {category}
              </h4>
              <ul className="flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm transition-colors duration-200 hover:text-white"
                      style={{ color: "#555", textDecoration: "none" }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-sm" style={{ color: "#444" }}>
            © {new Date().getFullYear()} BlogForge. All rights reserved.
          </p>
          <p className="text-sm" style={{ color: "#444" }}>
            Developed by{" "}
            <span style={{ color: "#27f3a9", fontWeight: 500 }}>Nityom Tikhe</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
