import { useQuery } from "@tanstack/react-query";

interface GetProjectResponse {
  id: string;
  name: string;
  json: string;
  width: number;
  height: number;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export const useGetProject = (id: string) => {
  return useQuery<GetProjectResponse>({
    queryKey: ["project", id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`);

      if (!response.ok) {
        throw new Error("Failed to fetch project");
      }

      return response.json();
    },
  });
};
