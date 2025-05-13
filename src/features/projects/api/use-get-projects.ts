import { useInfiniteQuery } from "@tanstack/react-query";

interface Project {
  id: string;
  name: string;
  json: string;
  width: number;
  height: number;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GetProjectsResponse {
  data: Project[];
  hasNextPage: boolean;
  nextCursor: string | null;
}

export const useGetProjects = () => {
  return useInfiniteQuery<GetProjectsResponse, Error, GetProjectsResponse, [string], string | null>({
    queryKey: ["projects"],
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const url = new URL("/api/projects", window.location.origin);
      if (pageParam !== null) {
        url.searchParams.append("cursor", pageParam);
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      return response.json();
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
};
