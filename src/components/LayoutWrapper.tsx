"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar, { CustomerProvider, useCustomer } from "@/components/Sidebar";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { sessionUser, isInitialized } = useCustomer();

  useEffect(() => {
    if (!isInitialized) return;

    const isLoginPage = pathname === "/login";
    
    if (!isLoginPage && !sessionUser) {
      router.replace("/login");
    }
    
    if (isLoginPage && sessionUser) {
      router.replace("/");
    }
  }, [sessionUser, pathname, router, isInitialized]);

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return (
      <CustomerProvider>
        <AuthGuard>{children}</AuthGuard>
      </CustomerProvider>
    );
  }

  return (
    <CustomerProvider>
      <AuthGuard>
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="absolute inset-0 bg-gradient-premium opacity-[0.03] pointer-events-none -z-10" />
          {children}
        </main>
      </AuthGuard>
    </CustomerProvider>
  );
}
