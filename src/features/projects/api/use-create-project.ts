import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface CreateProjectRequest {
  name: string;
  json: string;
  width: number;
  height: number;
  thumbnailUrl?: string | null;
}

interface CreateProjectResponse {
  id: string;
  name: string;
  json: string;
  width: number;
  height: number;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation<CreateProjectResponse, Error, CreateProjectRequest>({
    mutationFn: async (data) => {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};
