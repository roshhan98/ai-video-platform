import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserButton } from "@clerk/nextjs";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div style={{ textAlign: "center", marginTop: "20%" }}>
      {!userId ? (
        <>
          <h1>Welcome to AI Video Platform 🚀</h1>
          <SignInButton />
        </>
      ) : (
        <>
          <h1>You are logged in 🎉</h1>
          <UserButton />
        </>
      )}
    </div>
  );
}