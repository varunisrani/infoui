import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

interface RemoveBgInput {
  imageUrl: string;
}

export const useRemoveBg = () => {
  return useMutation({
    mutationFn: async ({ imageUrl }: RemoveBgInput) => {
      try {
        // Call your background removal API here
        const response = await fetch("/api/remove-background", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageUrl }),
        });

        if (!response.ok) {
          throw new Error("Failed to remove background");
        }

        const data = await response.json();
        return data.url; // Return the URL of the processed image
      } catch (error) {
        toast.error("Failed to remove background");
        throw error;
      }
    },
  });
}; 