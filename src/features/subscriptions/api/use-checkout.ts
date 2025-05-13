import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

interface CheckoutResponse {
  data: string;
}

export const useCheckout = () => {
  const mutation = useMutation<
    CheckoutResponse,
    Error
  >({
    mutationFn: async () => {
      const response = await fetch("/api/subscriptions/checkout", {
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
