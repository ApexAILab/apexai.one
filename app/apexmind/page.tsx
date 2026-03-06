import { ApexMindPage } from "@/components/apexmind/ApexMindPage";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * ApexMind 主页面路由
 * 仅登录用户可访问，未登录则跳转到登录页
 */
export default async function ApexMindRoutePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return <ApexMindPage />;
}

