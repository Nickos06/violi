"use server";

import { revalidatePath } from "next/cache";
import { requireUserApi } from "@/lib/auth";
import { garminDisconnect } from "@/lib/integrations/garmin";
import { stravaDisconnect } from "@/lib/integrations/strava";

export async function disconnect(provider: "garmin" | "strava") {
  const user = await requireUserApi();
  if (provider === "garmin") await garminDisconnect(user.id);
  else await stravaDisconnect(user.id);
  revalidatePath("/settings");
}
