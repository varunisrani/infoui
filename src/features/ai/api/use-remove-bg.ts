import { useMutation } from "@tanstack/react-query";

interface RemoveBgRequest {
  imageUrl: string;
}

interface RemoveBgResponse {
  url: string;
}

export const useRemoveBg = () => {
  const mutation = useMutation<
    RemoveBgResponse,
    Error,
    RemoveBgRequest
  >({
    mutationFn: async ({ imageUrl }) => {
      const response = await fetch("/api/ai/remove-bg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove background");
      }

      return response.json();
    },
  });

  return mutation;
};
