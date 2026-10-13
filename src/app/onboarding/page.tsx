import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Onboarding } from "./onboarding";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const user = await requireUser({ allowUnonboarded: true });
  if (user.onboarded) redirect("/today");
  return <Onboarding name={user.name.split(" ")[0]} profile={{ sex: user.sex, birthYear: user.birthYear, heightCm: user.heightCm }} />;
}
