import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "../db";
import { users } from "../db/schema";
import { redirect } from "next/navigation";
import LoginButton from "../components/LoginButton";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    const user = await currentUser();

    await db
      .insert(users)
      .values({
        id: userId,
        email: user?.emailAddresses?.[0]?.emailAddress ?? null,
      })
      .onConflictDoNothing();

    redirect("/dashboard");
  }

  return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="bg-black/70 p-8 rounded-xl w-[350px] text-center">
        <h1 className="text-white text-3xl font-bold mb-6">
          Sign In
        </h1>

        <LoginButton />
      </div>
    </div>
  );
}