import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";

export default async function Dashboard() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Dashboard 🚀</h1>
      <p>You are logged in</p>
      <br />
      <SignOutButton redirectUrl="/">
      
      </SignOutButton>
    </div>
  );
}