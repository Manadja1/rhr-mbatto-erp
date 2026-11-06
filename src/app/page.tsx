"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRhrStore, getDefaultRouteForRole } from "@/store/useRhrStore";

export default function RootRedirectPage() {
  const router = useRouter();
  const currentUser = useRhrStore((s) => s.currentUser);

  useEffect(() => {
    if (!currentUser) {
      router.replace("/login");
    } else {
      router.replace(getDefaultRouteForRole(currentUser.role));
    }
  }, [currentUser, router]);

  return null;
}

