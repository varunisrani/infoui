import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }), 
        { status: 401 }
      );
    }

    // For now, return a default subscription state
    // TODO: Implement actual subscription check from database
    return new Response(
      JSON.stringify({
        data: {
          isSubscribed: false,
          isCanceled: false,
          stripeCurrentPeriodEnd: null
        }
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      { status: 500 }
    );
  }
} 