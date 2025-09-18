import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export async function requireAuth() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/");
  }
  
  return userId;
}

export async function getCurrentUser() {
  const { userId } = await auth();
  return userId;
}
