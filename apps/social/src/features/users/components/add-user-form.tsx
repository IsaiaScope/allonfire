"use client";

import { Button } from "@allonfire/ui/components/button";
import { Input } from "@allonfire/ui/components/input";
import { Label } from "@allonfire/ui/components/label";
import { Loader2, UserPlus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { createUserAction } from "../actions/users";

export function AddUserForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    const data = {
      name: (formData.get("name") as string) || "",
      email: (formData.get("email") as string) || "",
      password: (formData.get("password") as string) || "",
    };

    startTransition(async () => {
      try {
        await createUserAction(data);
        formRef.current?.reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create user");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4" ref={formRef}>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Jane Doe" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          placeholder="jane@example.com"
          required
          type="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          minLength={8}
          name="password"
          placeholder="Minimum 8 characters"
          required
          type="password"
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button disabled={pending} type="submit">
        {pending ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <UserPlus className="size-3.5" />
            Add User
          </>
        )}
      </Button>
    </form>
  );
}
