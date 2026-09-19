import { getCurrentUser } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    return jsonOk(await getCurrentUser());
  } catch (error) {
    return handleApiError(error);
  }
}
