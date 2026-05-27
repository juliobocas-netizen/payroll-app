"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign, ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";
import { loginAction } from "@/lib/server-actions";
import { useCustomer } from "@/components/Sidebar";
import { t } from "@/lib/translations";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSessionUser, sessionUser } = useCustomer();
  const locale = sessionUser?.languagePref || "es";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await loginAction(formData);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    if (result.user) {
      localStorage.setItem("gpm_session", JSON.stringify(result.user));
      setSessionUser(result.user);

      if (result.user.lastCustomerId) {
        localStorage.setItem("gpm_last_customer", result.user.lastCustomerId.toString());
      }

      router.push("/");
    }

    setIsLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 z-10">
        <div className="glass p-10 rounded-3xl shadow-2xl border border-border/50">

          <div className="flex flex-col items-center justify-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-premium flex items-center justify-center text-white shadow-lg shadow-primary/30 mb-4 hover:scale-105 transition-transform">
              <CircleDollarSign size={36} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t(locale, "login.title")}</h1>
            <p className="text-muted-foreground text-sm mt-2">{t(locale, "login.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center space-x-2">
                <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t(locale, "login.username")}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="text"
                  name="username"
                  defaultValue="admin"
                  placeholder={t(locale, "login.username")}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-foreground">{t(locale, "login.password")}</label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input
                  type="password"
                  name="password"
                  defaultValue="admin123"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background/50 border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/25 hover-lift mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
{isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>{t(locale, "login.signingIn")}</span>
                  </>
                ) : (
                  <>
                    <span>{t(locale, "login.signIn")}</span>
                    <ArrowRight size={18} />
                  </>
                )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              {t(locale, "login.defaultCredentials")} <span className="font-mono">admin / admin123</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
