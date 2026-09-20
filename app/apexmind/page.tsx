import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApexMindApp } from "@/components/apexmind/ApexMindApp";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toChinaDayKey, todayInChina } from "@/lib/time";

export const metadata: Metadata = { title: "ApexMind" };

export default async function ApexMindPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const latestThought = await prisma.thought.findFirst({
    where: { userId: user.id },
    orderBy: { occurredAt: "desc" },
    select: { occurredAt: true },
  });
  const hasThoughtToday = latestThought
    ? toChinaDayKey(latestThought.occurredAt) === todayInChina()
    : false;
  return <ApexMindApp initialHasThoughtToday={hasThoughtToday} />;
}
