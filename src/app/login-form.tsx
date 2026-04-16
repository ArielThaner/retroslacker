"use client";

import { useState, useTransition } from "react";
import { loginAction } from "./auth-actions";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-muted mb-1.5">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoFocus
          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-foreground placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all"
          placeholder="username"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-muted mb-1.5">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-foreground placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all"
          placeholder="password"
        />
      </div>
      {error && (
        <p className="text-danger text-sm animate-fade-in">{error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm hover:shadow-md"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
