"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChartNoAxesColumn, ClipboardList, Compass, GraduationCap, Library, LogOut, Menu, MessageCircle, Settings, Users, X, WandSparkles } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { updateLearningSettingsAction } from "@/app/actions/auth";
import { deleteMyDataAction } from "@/app/actions/platform";
import type { SafeUser } from "@/lib/auth";

const teacherNav = [
  { href: "/teacher/dashboard", label: "Overview", icon: ChartNoAxesColumn },
  { href: "/teacher/classes", label: "My classes", icon: Users },
  { href: "/teacher/students", label: "Students", icon: GraduationCap },
  { href: "/teacher/planner", label: "AI co-planner", icon: WandSparkles },
  { href: "/teacher/library", label: "Curriculum library", icon: Library },
  { href: "/teacher/quizzes", label: "Practice quizzes", icon: ClipboardList },
];
const studentNav = [
  { href: "/student/dashboard", label: "My learning", icon: Compass },
  { href: "/student/survey", label: "Learning profile", icon: ClipboardList },
  { href: "/student/materials", label: "Study materials", icon: Library },
  { href: "/student/progress", label: "My progress", icon: ChartNoAxesColumn },
  { href: "/student/tutor", label: "Study tutor", icon: MessageCircle },
];

export function AppShell({ user, children }: { user: SafeUser; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const links = user.role === "ADMIN" ? [{ href: "/admin/dashboard", label: "Administration", icon: Settings }] : user.role === "TEACHER" ? teacherNav : studentNav;
  return <div className={`app-shell font-${user.fontSize}`}>
    <header className="app-topbar"><Link className="brand" href={user.role === "TEACHER" ? "/teacher/dashboard" : user.role === "ADMIN" ? "/admin/dashboard" : "/student/dashboard"}><span className="brand-icon"><img src="/abilityteach-logo.svg" alt="" /></span><span>Ability<span>Teach</span></span></Link><div className="topbar-right"><span className="role-badge">{user.role === "TEACHER" ? "TEACHER" : user.role === "ADMIN" ? "ADMIN" : user.gradeLevel || "STUDENT"}</span><span className="user-initial">{user.name.slice(0,1).toUpperCase()}</span><span className="top-user-name">{user.name}</span><form action={logoutAction}><button className="icon-button logout-button" aria-label="Sign out"><LogOut size={18}/></button></form><button className="icon-button mobile-menu-button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={20}/> : <Menu size={20}/>}</button></div></header>
    <div className="app-body"><aside className={open ? "sidebar open" : "sidebar"}><div className="sidebar-label">YOUR SPACE</div><nav aria-label="Dashboard navigation">{links.map(({href,label,icon:Icon}) => <Link key={href} className={pathname === href || pathname.startsWith(`${href}/`) ? "side-link active" : "side-link"} href={href} onClick={() => setOpen(false)}><Icon size={17}/><span>{label}</span></Link>)}</nav><div className="sidebar-bottom"><details className="settings-panel"><summary><Settings size={16}/> Accessibility &amp; settings</summary><form action={updateLearningSettingsAction} className="settings-form"><label>Text size<select name="fontSize" defaultValue={user.fontSize}><option value="small">Small</option><option value="standard">Standard</option><option value="large">Large</option><option value="largest">Largest</option></select></label><label>Learning mode<select name="learningMode" defaultValue={user.learningMode}><option value="junior">Junior</option><option value="standard">Standard</option><option value="advanced">Advanced</option></select></label><button className="button button-primary">Save settings</button></form><form action={deleteMyDataAction} className="delete-account-form" onSubmit={(event)=>{if(!window.confirm("Close this account and delete its account-linked data? This cannot be undone.")) event.preventDefault();}}><button type="submit">Delete my account data</button></form></details><div className="privacy-callout"><span className="privacy-icon">♡</span><b>Your data, with care</b><p>Only the right people can see your learning information.</p></div><span className="demo-chip">DEMO WORKSPACE</span></div></aside><main className="main-content">{children}</main></div>
  </div>;
}
