import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Login" };

export default async function LoginPage() {
  if (await getUser()) redirect("/today");
  return <AuthForm mode="login" />;
}
