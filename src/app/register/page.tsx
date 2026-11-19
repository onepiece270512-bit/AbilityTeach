import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-form";
import { getCurrentUser, destinationFor } from "@/lib/auth";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(destinationFor(user));
  return <AuthCard mode="register"/>;
}
