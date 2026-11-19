"use server";

import bcrypt from "bcryptjs";
import { hashToken, newSessionToken } from "@/lib/security";
import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser, logAudit, destinationFor } from "@/lib/auth";

export type ActionState = { error?: string; success?: string };

const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(128) });
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().max(254),
  password: z.string().min(10).max(128),
  role: z.enum(["STUDENT", "TEACHER"]),
  schoolName: z.string().trim().max(120).optional(),
  gradeLevel: z.string().trim().max(24).optional(),
  subject: z.string().trim().max(80).optional(),
  joinCode: z.string().trim().max(24).optional(),
});

export async function loginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and password." };
  const email = parsed.data.email.toLowerCase();
  const emailHash = hashToken(`login:${email}`);
  const rateLimit = await db.authRateLimit.findUnique({ where: { emailHash } });
  const windowActive = Boolean(rateLimit && Date.now() - rateLimit.windowStart.getTime() < 15 * 60 * 1000);
  if (windowActive && rateLimit!.attempts >= 5) return { error: "Too many sign-in attempts. Wait 15 minutes, then try again." };
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    if (!windowActive) await db.authRateLimit.upsert({ where: { emailHash }, update: { attempts: 1, windowStart: new Date() }, create: { emailHash, attempts: 1 } });
    else await db.authRateLimit.update({ where: { emailHash }, data: { attempts: { increment: 1 } } });
    return { error: "Those details don't match an account. Try again." };
  }
  await db.authRateLimit.deleteMany({ where: { emailHash } });
  await createSession(user.id);
  await logAudit(user.id, "LOGIN", "User", user.id);
  redirect(destinationFor({ ...user, schoolId: user.schoolId, gradeLevel: user.gradeLevel, subject: user.subject, learningMode: user.learningMode, fontSize: user.fontSize, guardianConsent: user.guardianConsent }));
}

export async function registerAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"), email: formData.get("email"), password: formData.get("password"), role: formData.get("role"),
    schoolName: formData.get("schoolName") || undefined, gradeLevel: formData.get("gradeLevel") || undefined,
    subject: formData.get("subject") || undefined, joinCode: formData.get("joinCode") || undefined,
  });
  if (!parsed.success) return { error: "Check your details. Passwords need at least 10 characters." };
  const email = parsed.data.email.toLowerCase();
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) return { error: "An account already uses that email." };
  const data = parsed.data;
  const gradeNumber = Number(data.gradeLevel?.match(/\d+/)?.[0] || 0);
  if (data.role === "STUDENT" && gradeNumber > 0 && gradeNumber < 9 && !data.joinCode && formData.get("guardianConsent") !== "on") {
    return { error: "For younger students, join with your school's class code or ask a parent or guardian to help set up your account." };
  }
  const schoolName = data.schoolName || "AbilityTeach Demo School";
  const school = await db.school.upsert({ where: { name: schoolName }, update: {}, create: { name: schoolName } });
  let classroom = null;
  if (data.role === "STUDENT" && data.joinCode) {
    classroom = await db.classroom.findUnique({ where: { joinCode: data.joinCode.toUpperCase() } });
    if (!classroom) return { error: "That class code wasn't found. Check it with your teacher." };
    if (classroom.schoolId && classroom.schoolId !== school.id) return { error: "That code belongs to a different school. Check the school name with your teacher." };
  }
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await db.user.create({
    data: {
      name: data.name, email, passwordHash, role: data.role,
      teacherApproved: false, schoolId: school.id, gradeLevel: data.gradeLevel || null, subject: data.subject || null,
      schoolManaged: Boolean(data.joinCode), guardianConsent: formData.get("guardianConsent") === "on",
      ...(classroom ? { enrollments: { create: { classroomId: classroom.id } } } : {}),
    },
  });
  await logAudit(user.id, "REGISTER", "User", user.id);
  await createSession(user.id);
  if (user.role === "TEACHER") redirect("/teacher/pending");
  redirect("/student/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await logAudit(user.id, "LOGOUT", "User", user.id);
  await destroySession();
  redirect("/");
}

export async function requestPasswordResetAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.email().safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const email = parsed.data.toLowerCase();
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    const token = newSessionToken();
    const tokenHash = hashToken(token);
    await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await db.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
    if (process.env.NODE_ENV !== "production") console.info(`[AbilityTeach local reset] ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`);
  }
  return { success: "If the account can reset its password here, you'll receive next steps. In local development, check the server console for the reset link. For school-managed accounts, ask your teacher." };
}

export async function completePasswordResetAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ token: z.string().min(30).max(100), password: z.string().min(10).max(128) }).safeParse({ token: formData.get("token"), password: formData.get("password") });
  if (!parsed.success) return { error: "Use a valid reset link and a password with at least 10 characters." };
  const reset = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(parsed.data.token) } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) return { error: "That reset link expired or was already used. Request a new one." };
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db.$transaction([
    db.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: reset.userId } }),
    db.auditLog.create({ data: { actorId: reset.userId, action: "PASSWORD_RESET", targetType: "User", targetId: reset.userId } }),
  ]);
  redirect("/login?password=updated");
}

export async function approveTeacherAction(formData: FormData) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "ADMIN") redirect("/login");
  const teacherId = String(formData.get("teacherId") || "");
  const target = await db.user.findFirst({ where: { id: teacherId, role: "TEACHER", ...(actor.schoolId ? { schoolId: actor.schoolId } : {}) }, select: { id: true } });
  if (!target) redirect("/admin/dashboard");
  await db.user.update({ where: { id: target.id }, data: { teacherApproved: true } });
  await logAudit(actor.id, "TEACHER_APPROVED", "User", teacherId);
  redirect("/admin/dashboard");
}

export async function updateLearningSettingsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const fontSize = z.enum(["small", "standard", "large", "largest"]).parse(formData.get("fontSize"));
  const learningMode = z.enum(["junior", "standard", "advanced"]).parse(formData.get("learningMode"));
  await db.user.update({ where: { id: user.id }, data: { learningMode, fontSize } });
  await logAudit(user.id, `SETTINGS_UPDATED:${fontSize}:${learningMode}`, "User", user.id);
  redirect(user.role === "TEACHER" ? "/teacher/dashboard" : user.role === "ADMIN" ? "/admin/dashboard" : "/student/dashboard");
}
