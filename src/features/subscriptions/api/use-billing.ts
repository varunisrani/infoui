import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

interface BillingResponse {
  data: string;
}

export const useBilling = () => {
  const mutation = useMutation<
    BillingResponse,
    Error
  >({
    mutationFn: async () => {
      const response = await fetch("/api/subscriptions/billing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      return response.json();
    },
    onSuccess: ({ data }) => {
      window.location.href = data;
    },
    onError: () => {
      toast.error("Failed to create session");
    },
  });

  return mutation;
};
