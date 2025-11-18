"use client";

import { isLoggedIn } from "./useAuth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ProtectedProps = {
  children: React.ReactNode;
};

export default function Protected({ children }: ProtectedProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/auth/login");
    }
  }, [router]);

  if (!isLoggedIn()) {
    return null;
  }

  return <>{children}</>;
}

