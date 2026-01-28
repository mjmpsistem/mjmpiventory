"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Warehouse, Lock, Eye, EyeOff, Mail } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [isEntering, setIsEntering] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const router = useRouter();

  /* FADE IN SAAT PAGE MASUK */
  useEffect(() => {
    const t = setTimeout(() => setIsEntering(false), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: identifier,
          password,
          rememberMe,
        }),
      });

      if (res.ok) {
        setIsExiting(true);
        setTimeout(() => router.push("/dashboard"), 700);
      } else {
        const data = await res.json();
        setError(data.error || "Login gagal");
      }
    } catch {
      setError("Terjadi kesalahan saat login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-100 overflow-hidden">
      {/* background blur */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-4">
        {/* CARD */}
        <div
          className={`
            relative w-full max-w-5xl h-[520px]
            bg-white/70 backdrop-blur-xl
            rounded-2xl shadow-xl
            transition-all duration-700 ease-in-out
            ${
              isExiting
                ? "opacity-0 scale-95 pointer-events-none"
                : isEntering
                  ? "opacity-0 scale-95"
                  : "opacity-100 scale-100 overflow-hidden"
            }
          `}
        >
          {/* LEFT PANEL */}
          <div
            className={`
    absolute inset-y-0 left-0 w-1/2
    bg-gradient-to-br from-blue-800 via-indigo-900 to-slate-900
    text-white px-14 flex flex-col justify-center
    transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
    ${
      isExiting || isEntering
        ? "-translate-x-[120vw] opacity-0"
        : "translate-x-0 opacity-100"
    }
  `}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-10">
              <Image
                src="/assets/logo.png"
                alt="Inventory System Logo"
                width={44}
                height={44}
                className="object-contain drop-shadow-md"
                priority
              />

              <span className="text-2xl font-semibold tracking-wide">
                Inventory <span className="text-blue-300">System</span>
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-[42px] font-bold leading-tight mb-6">
              Warehouse &
              <br />
              <span className="text-blue-300">Production Inventory</span>
              <br />
              Control
            </h1>

            {/* Accent line */}
            <div className="w-20 h-1 bg-blue-400 rounded-full mb-5" />

            {/* Description */}
            <p className="text-blue-100 text-sm leading-relaxed max-w-lg">
              Kelola stok bahan baku, barang jadi, dan pergerakan inventory
              produksi secara{" "}
              <span className="text-white font-medium">real-time</span>, aman,
              dan terintegrasi dalam satu sistem.
            </p>
          </div>

          {/* RIGHT PANEL */}
          <div
            className={`
              absolute inset-y-0 right-0 w-1/2
              flex items-center justify-center p-8 sm:p-12
              transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]
              ${
                isExiting
                  ? "translate-x-[120vw] opacity-0"
                  : isEntering
                    ? "translate-x-[120vw] opacity-0"
                    : "translate-x-0 opacity-100"
              }
            `}
          >
            <div className="w-full max-w-md">
              <h2 className="text-3xl font-bold text-gray-900 mb-1">
                Login Sistem
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Gunakan <span className="font-medium">username atau email</span>
              </p>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Username / Email
                  </label>
                  <div className="relative mt-1">
                    <Mail
                      className="absolute left-3 top-3 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Masukkan username atau email"
                      autoComplete="username"
                      className="w-full h-11 pl-10 pr-3 border rounded-lg text-sm 
                 placeholder-gray-400
                 focus:ring-2 focus:ring-blue-600 focus:border-blue-600
                 transition"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative mt-1">
                    <Lock
                      className="absolute left-3 top-3 text-gray-400"
                      size={18}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan password"
                      autoComplete="current-password"
                      className="w-full h-11 pl-10 pr-10 border rounded-lg text-sm
                 placeholder-gray-400
                 focus:ring-2 focus:ring-blue-600 focus:border-blue-600
                 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>

                <button
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold disabled:opacity-50"
                >
                  {loading ? "Memverifikasi..." : "Masuk ke Sistem"}
                </button>
              </form>

              <p className="mt-8 text-xs text-gray-400 text-center">
                © {new Date().getFullYear()} Warehouse Inventory System
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
