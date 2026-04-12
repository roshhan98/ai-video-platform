"use client";

import { SignInButton } from "@clerk/nextjs";

export default function LoginButton() {
  return (
    <SignInButton mode="modal">
      <button className="w-full bg-red-600 hover:bg-red-700 p-3 rounded text-white font-semibold">
        Login with Clerk
      </button>
    </SignInButton>
  );
}