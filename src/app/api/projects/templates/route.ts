import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Static templates data
const templates = [
  {
    id: "1",
    name: "Basic Template",
    width: 1080,
    height: 1080,
    json: JSON.stringify({
      version: "5.3.0",
      objects: []
    }),
    isTemplate: true,
    isPro: false,
    thumbnailUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }), 
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Return static templates with pagination
    const paginatedTemplates = templates.slice(offset, offset + limit);

    return new Response(
      JSON.stringify({ data: paginatedTemplates }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching templates:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      { status: 500 }
    );
  }
} 