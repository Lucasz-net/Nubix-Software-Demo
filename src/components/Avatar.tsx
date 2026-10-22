import { initials } from "../lib/roles";
import type { User } from "../types";

export default function Avatar({ user, size = "h-16 w-16 text-xl" }: { user: User; size?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-lg ${size} ${
        user.role === "admin" ? "bg-gradient-to-br from-blue-600 to-indigo-500" : "bg-gradient-to-br from-teal-400 to-sky-500"
      }`}
    >
      {initials(user.name)}
    </span>
  );
}
