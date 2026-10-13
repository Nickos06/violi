"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "@/app/actions/social";

/** Marks notifications as read shortly after the page is viewed. */
export function MarkRead({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!hasUnread) return;
    const id = setTimeout(() => markNotificationsRead().then(() => router.refresh()), 1500);
    return () => clearTimeout(id);
  }, [hasUnread, router]);
  return null;
}
