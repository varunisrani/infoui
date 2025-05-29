// Mock version of the paywall hook
// This is a temporary solution after removing subscription functionality

export const usePaywall = () => {
  return {
    shouldBlock: false,
    isLoading: false,
    triggerPaywall: () => {},
  };
}; 