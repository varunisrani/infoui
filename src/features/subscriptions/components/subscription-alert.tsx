"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle } from "lucide-react";

import { useFailModal } from "@/features/subscriptions/store/use-fail-modal";
import { useSuccessModal } from "@/features/subscriptions/store/use-success-modal";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SubscriptionAlertContent = () => {
  const params = useSearchParams();
  const error = params?.get("error") ?? null;

  const { onOpen: onOpenFail } = useFailModal();
  const { onOpen: onOpenSuccess } = useSuccessModal();

  const canceled = params?.get("canceled") ?? null;
  const success = params?.get("success") ?? null;

  useEffect(() => {
    if (canceled) {
      onOpenFail();
    }

    if (success) {
      onOpenSuccess();
    }
  }, [canceled, onOpenFail, success, onOpenSuccess]);

  if (!error) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="size-4" />
      <AlertDescription>
        {error === "cancelled" && "Payment cancelled. Please try again."}
        {error === "failed" && "Payment failed. Please try again."}
      </AlertDescription>
    </Alert>
  );
};

export const SubscriptionAlert = () => {
  return (
    <Suspense>
      <SubscriptionAlertContent />
    </Suspense>
  );
};
