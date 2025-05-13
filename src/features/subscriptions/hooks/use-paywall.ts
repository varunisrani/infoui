import { useSubscriptionModal } from "@/features/subscriptions/store/use-subscription-modal";
import { useGetSubscription } from "@/features/subscriptions/api/use-get-subscription";

export const usePaywall = () => {
  const { 
    isLoading: isLoadingSubscription,
  } = useGetSubscription();

  const subscriptionModal = useSubscriptionModal();

  // Always return false for shouldBlock to bypass the paywall
  const shouldBlock = false;

  return {
    isLoading: false, // Also set isLoading to false to avoid any loading states
    shouldBlock,
    triggerPaywall: () => {
      subscriptionModal.onOpen();
    },
  };
};
