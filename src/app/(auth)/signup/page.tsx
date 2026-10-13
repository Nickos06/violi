import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign up" };

export default async function SignupPage() {
  if (await getUser()) redirect("/today");
  return <AuthForm mode="signup" />;
}
