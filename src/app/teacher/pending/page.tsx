import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";

export default async function PendingTeacherPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "TEACHER") redirect("/student/dashboard");
  if (user.teacherApproved) redirect("/teacher/dashboard");
  return <main className="pending-page"><Link className="brand" href="/"><span className="brand-icon">A</span><span>Ability<span>Teach</span></span></Link><section><span className="eyebrow">TEACHER ACCOUNT</span><h1>Your account is waiting for school approval.</h1><p>Student records stay private until an administrator verifies your teacher account. You can sign out and come back later.</p><form action={logoutAction}><button className="button button-primary">Sign out</button></form></section></main>;
}
