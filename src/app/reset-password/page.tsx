import Link from "next/link";
import { PasswordResetForm } from "@/components/password-reset-form";
import { hashToken } from "@/lib/security";
import { db } from "@/lib/db";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let usable = false;
  if (token && token.length < 100) {
    const reset = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    usable = Boolean(reset && !reset.usedAt && reset.expiresAt > new Date());
  }
  return <main className="auth-layout"><div className="auth-brand-panel"><Link className="brand brand-light" href="/"><span className="brand-icon">A</span><span>Ability<span>Teach</span></span></Link><div><span className="eyebrow light-eyebrow">ACCOUNT SUPPORT</span><h1>You're in control of your account.</h1><p>For school-managed accounts, your teacher or school administrator can help.</p></div><div className="brand-panel-footer">Keep your sign-in safe.</div></div><section className="auth-card"><div className="auth-heading"><span className="eyebrow">PASSWORD HELP</span><h2>{token ? usable ? "Choose a new password" : "That link needs refreshing" : "Reset your password"}</h2><p>{token ? usable ? "Choose a new password for your account." : "Request a new password reset link." : "We'll show next steps if this account can reset here."}</p></div>{token && !usable ? <Link className="button button-primary full" href="/reset-password">Request a new link</Link> : <PasswordResetForm token={token}/>}<p className="auth-switch"><Link href="/login">Back to sign in</Link></p></section></main>;
}
