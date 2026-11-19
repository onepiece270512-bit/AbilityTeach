"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/actions/auth";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="button button-primary" type="submit" disabled={pending}>{pending ? "Working…" : label}</button>;
}

export function ActionForm({ action, label, children, className = "" }: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return <form action={formAction} className={className}>
    {children}
    {state.error && <p role="alert" className="form-message error">{state.error}</p>}
    {state.success && <p role="status" className="form-message success">{state.success}</p>}
    <Submit label={label} />
  </form>;
}
