import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/hono";

export const useGetImages = () => {
  return useQuery({
    queryKey: ["images"],
    queryFn: async () => {
      const response = await fetch("/api/images");

      if (!response.ok) {
        throw new Error("Failed to fetch images");
      }

      return response.json();
    },
  });
};
