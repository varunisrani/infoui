import { useQuery } from "@tanstack/react-query";

interface SubscriptionResponse {
  data: {
    isSubscribed: boolean;
    isCanceled: boolean;
    stripeCurrentPeriodEnd: string | null;
  };
}

export const useGetSubscription = () => {
  const query = useQuery<SubscriptionResponse["data"]>({
    queryKey: ["subscription"],
    queryFn: async () => {
      const response = await fetch("/api/subscriptions/current");

      if (!response.ok) {
        throw new Error("Something went wrong");
      }

      const { data } = await response.json();
      return data;
    },
  });

  return query;
};
