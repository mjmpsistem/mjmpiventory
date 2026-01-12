"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Warehouse, User, Lock, Eye, EyeOff, Mail } from "lucide-react";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState(""); // username / email
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: identifier, // backend tetap
          password,
          rememberMe,
        }),
      });

      const data = await res.json();

      if (res.ok) router.push("/dashboard");
      else setError(data.error || "Login gagal");
    } catch {
      setError("Terjadi kesalahan saat login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-100 overflow-hidden">
      {/* Background blur */}
      <div className="absolute inset-0">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border overflow-hidden">
          {/* LEFT */}
          <div className="hidden lg:flex flex-col justify-center px-12 bg-gradient-to-br from-blue-700 to-indigo-900 text-white">
            <div className="flex items-center gap-3 mb-8">
              <Warehouse size={42} />
              <span className="text-2xl font-semibold tracking-wide">
                Inventory System
              </span>
            </div>

            <h1 className="text-4xl font-bold leading-tight mb-4">
              Warehouse & Production
              <br /> Inventory Control
            </h1>

            <p className="text-blue-100 text-sm leading-relaxed max-w-md">
              Kelola stok bahan baku, barang jadi, dan pergerakan inventory
              produksi secara real-time, aman, dan terintegrasi.
            </p>
          </div>

          {/* RIGHT */}
          <div className="flex items-center justify-center p-8 sm:p-12">
            <div className="w-full max-w-md">
              <h2 className="text-3xl font-bold text-gray-900 mb-1">
                Login Sistem
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Gunakan <span className="font-medium">username atau email</span>{" "}
                untuk masuk
              </p>

              {error && (
                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username / Email */}
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
                      placeholder="contoh: admin / admin@email.com"
                      className="w-full h-11 pl-10 pr-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
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
                      placeholder="••••••••"
                      className="w-full h-11 pl-10 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-gray-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                    />
                    Remember me
                  </label>
                </div>

                {/* Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md hover:shadow-lg hover:brightness-110 transition disabled:opacity-50"
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
