"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction, registerAction } from "@/app/actions/auth";
import { BookOpen, GraduationCap, UserRound } from "lucide-react";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, {});
  return <form action={action} className="auth-form">
    <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254} placeholder="you@school.edu" /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={128} placeholder="Your password" /></label>
    {state.error && <p className="form-message error" role="alert">{state.error}</p>}
    <button className="button button-primary full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    <Link className="muted-link auth-small" href="/reset-password">Forgot your password?</Link>
    <div className="demo-logins"><b>Demo accounts</b><span>Teacher: teacher@abilityteach.demo</span><span>Student: priya@abilityteach.demo</span><span>Password for both: <code>LearnTogether2026!</code></span></div>
  </form>;
}

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, {});
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  return <form action={action} className="auth-form">
    <div className="role-pick" aria-label="Choose account type">
      <button type="button" className={role === "STUDENT" ? "role-choice selected" : "role-choice"} onClick={() => setRole("STUDENT")} aria-pressed={role === "STUDENT"}><UserRound size={18}/> I'm a student</button>
      <button type="button" className={role === "TEACHER" ? "role-choice selected" : "role-choice"} onClick={() => setRole("TEACHER")} aria-pressed={role === "TEACHER"}><GraduationCap size={18}/> I'm a teacher</button>
    </div>
    <input type="hidden" name="role" value={role}/>
    <label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={80} placeholder="First and last name"/></label>
    <label>Email or school account<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@school.edu"/></label>
    <label>Create a password<input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} placeholder="At least 10 characters"/></label>
    <label>School<input name="schoolName" maxLength={120} placeholder="School or institution"/></label>
    {role === "STUDENT" ? <>
      <div className="form-row"><label>Grade<select name="gradeLevel" defaultValue=""><option value="" disabled>Choose grade</option>{["Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12","College","University"].map((grade) => <option key={grade}>{grade}</option>)}</select></label><label>Class code <span className="optional">optional</span><input name="joinCode" autoCapitalize="characters" maxLength={24} placeholder="Ask your teacher"/></label></div>
      <label className="check-line"><input name="guardianConsent" type="checkbox"/> I have permission to use this school account.</label>
      <p className="form-hint">If your school gave you an account, join with your teacher's class code.</p>
    </> : <>
      <label>Teaching subject<input name="subject" maxLength={80} placeholder="e.g. Mathematics"/></label>
      <p className="form-hint">Teacher access to student records stays locked until an administrator approves your account.</p>
    </>}
    {state.error && <p className="form-message error" role="alert">{state.error}</p>}
    <button className="button button-primary full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
    <p className="form-hint">By creating an account, you agree to follow your school's account and privacy rules.</p>
  </form>;
}

export function AuthCard({ mode }: { mode: "login" | "register" }) {
  return <div className="auth-layout">
    <div className="auth-brand-panel"><Link className="brand brand-light" href="/"><span className="brand-icon"><BookOpen size={22}/></span><span>Ability<span>Teach</span></span></Link><div><span className="eyebrow light-eyebrow">EVERY STUDENT. A BETTER WAY TO LEARN.</span><h1>Learning that makes room for <em>everyone.</em></h1><p>Lessons, activities, and support for every curious mind.</p></div><div className="brand-panel-footer">A classroom can be many things.</div></div>
    <section className="auth-card"><div className="auth-heading"><span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "LET'S GET STARTED"}</span><h2>{mode === "login" ? "Sign in to AbilityTeach" : "Create your account"}</h2><p>{mode === "login" ? "Your classes and learning tools are waiting." : "Choose your role to set up the right experience."}</p></div>{mode === "login" ? <LoginForm/> : <RegisterForm/>}<p className="auth-switch">{mode === "login" ? "New to AbilityTeach?" : "Already have an account?"} <Link href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Create an account" : "Sign in"}</Link></p></section>
  </div>;
}
