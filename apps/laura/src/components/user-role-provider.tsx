"use client";

import type { Role } from "@allonfire/database";
import { createContext, useContext } from "react";

const UserRoleContext = createContext<Role>("USER");

export function UserRoleProvider({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  return (
    <UserRoleContext.Provider value={role}>{children}</UserRoleContext.Provider>
  );
}

export function useUserRole() {
  return useContext(UserRoleContext);
}

export function useIsViewer() {
  return useContext(UserRoleContext) === "VIEWER";
}

export function useIsAdmin() {
  return useContext(UserRoleContext) === "ADMIN";
}
