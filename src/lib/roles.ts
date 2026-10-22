import type { Role, Screen, User } from "../types";

export const ROLE_LABEL: Record<Role, string> = { admin: "Dueño", cajero: "Cajero" };

// El cajero solo ve lo que necesita para atender el mostrador; el resto es del dueño.
const CAJERO_SCREENS: Screen[] = ["pos", "cash", "customers", "inventory"];

export const canSee = (role: Role, screen: Screen) => role === "admin" || CAJERO_SCREENS.includes(screen);

export const HOME: Record<Role, Screen> = { admin: "dashboard", cajero: "pos" };

export const userName = (users: User[], id?: string) => users.find((u) => u.id === id)?.name ?? "—";

export const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
