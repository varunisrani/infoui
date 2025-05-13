import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface DuplicateProjectResponse {
  id: string;
  name: string;
  json: string;
  width: number;
  height: number;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export const useDuplicateProject = () => {
  const queryClient = useQueryClient();

  return useMutation<DuplicateProjectResponse, Error, string>({
    mutationFn: async (id) => {
      const response = await fetch(`/api/projects/${id}/duplicate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to duplicate project");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => {
      toast.error("Failed to duplicate project");
    }
  });
};
