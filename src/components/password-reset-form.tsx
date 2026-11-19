"use client";

import { useActionState } from "react";
import { completePasswordResetAction, requestPasswordResetAction } from "@/app/actions/auth";

export function PasswordResetForm({ token }: { token?: string }) {
  const [state, action, pending] = useActionState(token ? completePasswordResetAction : requestPasswordResetAction, {});
  return <form className="auth-form" action={action}>{token ? <><input type="hidden" name="token" value={token}/><label>New password<input type="password" name="password" required minLength={10} maxLength={128} autoComplete="new-password" placeholder="At least 10 characters"/></label></> : <label>Email<input type="email" name="email" required maxLength={254} autoComplete="email" placeholder="you@school.edu"/></label>}{state.error && <p role="alert" className="form-message error">{state.error}</p>}{state.success && <p role="status" className="form-message success">{state.success}</p>}<button className="button button-primary full" disabled={pending}>{pending ? "Working…" : token ? "Reset password" : "Send reset instructions"}</button></form>;
}
