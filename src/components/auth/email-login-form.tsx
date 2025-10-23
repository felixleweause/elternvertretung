"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type EmailLoginFormProps = {
  redirectTo?: string;
  nextPath?: string;
  className?: string;
};

type AuthMode = "magic" | "password";

export function EmailLoginForm({ redirectTo, nextPath = "/app", className }: EmailLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>("magic");
  const router = useRouter();

  const resetFeedback = () => {
    setStatus("idle");
    setMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setMessage("Bitte gib deine E-Mail-Adresse ein.");
      setStatus("error");
      return;
    }

    if (mode === "password" && !password) {
      setMessage("Bitte gib dein Passwort ein.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const supabase = getBrowserSupabaseClient();
      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmedEmail,
          options: redirectTo
            ? {
                emailRedirectTo: redirectTo,
              }
            : undefined,
        });

        if (error) {
          throw error;
        }

        setStatus("success");
        setMessage("Wir haben dir einen Login-Link gesendet. Bitte prüfe dein Postfach.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error || !data.session) {
          throw error ?? new Error("Anmeldung fehlgeschlagen.");
        }

        setStatus("success");
        setMessage("Anmeldung erfolgreich – du wirst weitergeleitet …");
        router.replace(nextPath);
        router.refresh();
      }
    } catch (error) {
      console.error("Supabase sign-in failed", error);
      setStatus("error");
      setMessage(
        mode === "magic"
          ? "Es gab ein Problem beim Versenden des Login-Links. Bitte versuche es später erneut."
          : "Die Kombination aus E-Mail-Adresse und Passwort wurde nicht erkannt."
      );
    }
  };

  return (
    <Card className={cn("max-w-md", className)}>
      <CardHeader>
        <CardTitle>Willkommen zurück</CardTitle>
        <CardDescription>
          Melde dich wahlweise per Magic Link oder mit deinem Passwort an.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-1 text-sm font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              resetFeedback();
            }}
            className={cn(
              "rounded-md px-3 py-2 transition-colors",
              mode === "magic"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "hover:text-zinc-900 hover:dark:text-zinc-200"
            )}
          >
            Magic Link
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("password");
              resetFeedback();
            }}
            className={cn(
              "rounded-md px-3 py-2 transition-colors",
              mode === "password"
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "hover:text-zinc-900 hover:dark:text-zinc-200"
            )}
          >
            Passwort
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail-Adresse</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="du@example.de"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          {mode === "password" ? (
            <div className="space-y-2">
              <Label htmlFor="password">Passwort</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required={mode === "password"}
              />
            </div>
          ) : null}
          <Button className="w-full" disabled={status === "loading"} type="submit">
            {status === "loading"
              ? mode === "magic"
                ? "Sende Link..."
                : "Melde an..."
              : mode === "magic"
                ? "Magic Link senden"
                : "Anmelden"}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        <p
          className={cn(
            "text-sm",
            status === "error" && "text-red-600 dark:text-red-400",
            status === "success" && "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {message}
        </p>
      </CardFooter>
    </Card>
  );
}
