import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ApexMindApp } from "@/components/apexmind/ApexMindApp";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "ApexMind" };

export default async function ApexMindPage() {
  if (!(await getCurrentUser())) redirect("/login");
  return <ApexMindApp />;
}
