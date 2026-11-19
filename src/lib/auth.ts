import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashToken, newSessionToken } from "@/lib/security";

const COOKIE_NAME = "abilityteach_session";
const SESSION_DAYS = 7;

export type SafeUser = {
  id: string;
  schoolId: string | null;
  name: string;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  teacherApproved: boolean;
  guardianConsent: boolean;
  gradeLevel: string | null;
  subject: string | null;
  learningMode: string;
  fontSize: string;
};

export async function createSession(userId: string) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } });
    return null;
  }
  const { user } = session;
  return {
    id: user.id,
    schoolId: user.schoolId,
    name: user.name,
    email: user.email,
    role: user.role,
    teacherApproved: user.teacherApproved,
    guardianConsent: user.guardianConsent,
    gradeLevel: user.gradeLevel,
    subject: user.subject,
    learningMode: user.learningMode,
    fontSize: user.fontSize,
  };
}

export async function requireUser(role?: SafeUser["role"]) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (role && user.role !== role) redirect(destinationFor(user));
  if (user.role === "TEACHER" && !user.teacherApproved) redirect("/teacher/pending");
  return user;
}

export function destinationFor(user: SafeUser) {
  if (user.role === "ADMIN") return "/admin/dashboard";
  if (user.role === "TEACHER") return user.teacherApproved ? "/teacher/dashboard" : "/teacher/pending";
  return "/student/dashboard";
}

export async function logAudit(actorId: string, action: string, targetType: string, targetId?: string) {
  await db.auditLog.create({ data: { actorId, action, targetType, targetId } });
}
