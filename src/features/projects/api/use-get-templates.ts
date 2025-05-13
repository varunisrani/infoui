import { useQuery } from "@tanstack/react-query";

interface Template {
  id: string;
  name: string;
  json: string;
  width: number;
  height: number;
  thumbnailUrl: string | null;
  isPro: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GetTemplatesResponse {
  data: Template[];
}

interface GetTemplatesQuery {
  page?: string;
  limit?: string;
}

export const useGetTemplates = (query: GetTemplatesQuery) => {
  return useQuery<GetTemplatesResponse>({
    queryKey: ["templates", query],
    queryFn: async () => {
      const url = new URL("/api/projects/templates", window.location.origin);
      if (query.page) {
        url.searchParams.append("page", query.page);
      }
      if (query.limit) {
        url.searchParams.append("limit", query.limit);
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      return response.json();
    },
  });
};
