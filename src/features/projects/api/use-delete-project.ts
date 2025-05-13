import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface DeleteProjectResponse {
  success: boolean;
}

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation<DeleteProjectResponse, Error, string>({
    mutationFn: async (id) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete project");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};
