import { ApexMindDashboard } from "@/components/apexmind/ApexMindDashboard";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ApexMindDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return <ApexMindDashboard />;
}

