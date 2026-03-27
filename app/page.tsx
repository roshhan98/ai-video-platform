import { auth, currentUser } from "@clerk/nextjs/server";
import {
  SignInButton,
  SignOutButton,
  UserButton,
} from "@clerk/nextjs";
import { db } from "../db";
import { users } from "../db/schema";

export const runtime = "nodejs";

export default async function Home() {
  const { userId } = await auth();

  // Insert user if logged in
  if (userId) {
    const user = await currentUser();

    await db
      .insert(users)
      .values({
        id: userId,
        email: user?.emailAddresses?.[0]?.emailAddress ?? null,
      })
      .onConflictDoNothing();
  }

  return (
    <div style={{ textAlign: "center", marginTop: "20%" }}>
      
      {/* 🔹 NOT LOGGED IN */}
      {!userId ? (
        <>
          <h1>Please Login</h1>

          <SignInButton mode="modal" fallbackRedirectUrl="/">
            
          </SignInButton>
        </>
      ) : (
        /* 🔹 LOGGED IN */
        <>
          <h1>Welcome 🎉</h1>

          <UserButton />

          <br /><br />

          <a href="/dashboard">
            <button style={{ padding: "10px 20px", cursor: "pointer" }}>
              Go to Dashboard →
            </button>
          </a>

          <br /><br />

          <SignOutButton>
            
          </SignOutButton>
        </>
      )}
    </div>
  );
}