import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const { userId } = await auth();

  // 🔒 Protect route
  if (!userId) {
    redirect("/");
  }

  // ✅ Render client UI
  return <DashboardClient />;
}