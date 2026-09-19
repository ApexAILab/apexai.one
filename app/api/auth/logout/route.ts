import { deleteCurrentSession } from "@/lib/auth";
import { assertSameOrigin, handleApiError, jsonOk } from "@/lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await deleteCurrentSession();
    return jsonOk({ loggedOut: true });
  } catch (error) {
    return handleApiError(error);
  }
}
