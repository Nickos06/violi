"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "./ui";

export function UserSearch({ initial, placeholder }: { initial: string; placeholder: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  useEffect(() => {
    if (q === initial) return;
    const id = setTimeout(() => router.replace(`/social?tab=people&q=${encodeURIComponent(q)}`), 300);
    return () => clearTimeout(id);
  }, [q, initial, router]);
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-faint" />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="h-12 pl-10" />
    </div>
  );
}
