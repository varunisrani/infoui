import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface UpdateProjectRequest {
  name?: string;
  json?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string | null;
}

interface UpdateProjectResponse {
  id: string;
  name: string;
  json: string;
  width: number;
  height: number;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export const useUpdateProject = (id: string) => {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    UpdateProjectResponse,
    Error,
    UpdateProjectRequest
  >({
    mutationKey: ["project", { id }],
    mutationFn: async (data) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update project");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", { id }] });
    },
    onError: () => {
      toast.error("Failed to update project");
    }
  });

  return mutation;
};
