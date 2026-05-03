"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "For Clinics", href: "#for-clinics" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled
          ? "rgba(0, 0, 0, 0.72)"
          : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span
            className="inline-flex items-center justify-center rounded-lg"
            style={{
              width: 32,
              height: 32,
              background: "rgba(39,243,169,0.12)",
              border: "1px solid #30463C",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="#27f3a9" strokeWidth="1.5" />
              <path d="M5 8h6M8 5v6" stroke="#27f3a9" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <span
            className="font-semibold tracking-tight"
            style={{ color: "#fff", fontSize: 16 }}
          >
            BlogForge
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="text-sm transition-colors duration-200"
                style={{ color: "#999", fontWeight: 400 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#999")}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/super-admin/login"
            className="text-sm transition-colors duration-200"
            style={{ color: "#999", fontWeight: 400 }}
          >
            Sign In
          </Link>
          <a
            href="#contact"
            className="text-sm font-medium transition-all duration-300 hover:scale-[1.04]"
            style={{
              padding: "8px 20px",
              background: "#000",
              boxShadow: "0px 4px 18px 4px rgba(39, 243, 169, 0.13)",
              borderRadius: 8,
              outline: "1px solid #30463C",
              outlineOffset: -1,
              color: "#fff",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Get Started
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M7 3l3 3-3 3" stroke="#27f3a9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        {/* Hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span
            className="block w-5 h-0.5 transition-all duration-300"
            style={{
              background: "#fff",
              transform: menuOpen ? "rotate(45deg) translateY(8px)" : "none",
            }}
          />
          <span
            className="block w-5 h-0.5 transition-all duration-300"
            style={{
              background: "#fff",
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            className="block w-5 h-0.5 transition-all duration-300"
            style={{
              background: "#fff",
              transform: menuOpen ? "rotate(-45deg) translateY(-8px)" : "none",
            }}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className="md:hidden overflow-hidden transition-all duration-300"
        style={{
          maxHeight: menuOpen ? 400 : 0,
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(16px)",
        }}
      >
        <ul className="flex flex-col px-6 pb-6 pt-2 gap-4">
          {navLinks.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="text-sm"
                style={{ color: "#ccc" }}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            </li>
          ))}
          <li>
            <Link href="/super-admin" className="text-sm" style={{ color: "#ccc" }}>
              Sign In
            </Link>
          </li>
          <li>
            <a
              href="#contact"
              className="text-sm inline-flex items-center gap-2"
              style={{ color: "#27f3a9", fontWeight: 500 }}
              onClick={() => setMenuOpen(false)}
            >
              Get Started →
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
