import { prisma } from "@/lib/db";
import { handleApiError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    await prisma.user.count();
    return jsonOk({
      status: "healthy",
      database: "ready",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
