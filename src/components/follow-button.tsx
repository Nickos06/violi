"use client";

import { useState, useTransition } from "react";
import { toggleFollow } from "@/app/actions/social";
import { useT } from "./i18n-provider";
import { Button } from "./ui";

export function FollowButton({ userId, following, size = "sm" }: { userId: string; following: boolean; size?: "sm" | "md" }) {
  const { t } = useT();
  const [state, setState] = useState(following);
  const [pending, start] = useTransition();
  return (
    <Button
      size={size}
      variant={state ? "secondary" : "primary"}
      disabled={pending}
      onClick={() => start(async () => { setState(!state); const r = await toggleFollow(userId); if (typeof r === "boolean") setState(r); })}
    >
      {state ? t.social.following : t.social.follow}
    </Button>
  );
}
