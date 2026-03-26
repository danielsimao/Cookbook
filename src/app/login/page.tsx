"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // L1: Redirect if already authenticated
  useEffect(() => {
    fetch("/api/auth/login", { method: "HEAD" })
      .then((res) => {
        if (res.ok) {
          router.push("/");
        }
      })
      .catch((err) => console.error("Auth check failed:", err));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Wrong password");
      }
    } catch (err) {
      // L4: Descriptive network error
      const message =
        err instanceof TypeError && err.message.includes("fetch")
          ? "Unable to connect to the server. Check your internet connection."
          : "Login failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-primary mb-2">Cookbook</h1>
          <p className="font-hand text-lg text-muted-foreground">Enter password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="paper-card p-6 space-y-4">
          <div className="relative">
            <Lock className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="input-cookbook pl-8"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full btn-cookbook disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
