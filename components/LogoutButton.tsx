"use client";

import { SignOutButton } from "@clerk/nextjs";

export default function LogoutButton() {
  return (
    <SignOutButton>
      <button className="bg-red-600 px-3 py-1.5 rounded text-xs hover:bg-red-700">
        Sign Out
      </button>
    </SignOutButton>
  );
}