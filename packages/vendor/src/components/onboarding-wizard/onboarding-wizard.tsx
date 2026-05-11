import { useEffect } from "react";
import { AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";

import { useLogout, useSellers } from "@hooks/api";
import { isFetchError } from "@lib/is-fetch-error";
import { queryClient } from "@lib/query-client";
import { WizardSidebar } from "./wizard-sidebar";
import { WizardPreview } from "./wizard-preview";
import { WizardStep } from "./wizard-step";
import { useOnboarding } from "./hooks/use-onboarding";
import { StoreStep } from "./steps/store-step";
import { AddressStep } from "./steps/address-step";
import { CompanyStep } from "./steps/company-step";
import { PaymentStep } from "./steps/payment-step";

type OnboardingWizardProps = {
  memberEmail: string;
};

export const OnboardingWizard = ({ memberEmail }: OnboardingWizardProps) => {
  const navigate = useNavigate();
  const { mutateAsync: logoutMutation } = useLogout();
  const { seller_members, isError, error } = useSellers();
  const hasStores = (seller_members?.length ?? 0) > 0;

  useEffect(() => {
    if (isError && isFetchError(error) && error.status === 401) {
      queryClient.clear();
      navigate("/login?reason=Unauthorized", { replace: true });
    }
  }, [error, isError, navigate]);

  const {
    currentStep,
    sellerId,
    isPending,
    goBack,
    submitStoreStep,
    submitAddressStep,
    skipAddressStep,
    submitCompanyStep,
    skipCompanyStep,
    submitPaymentStep,
    skipPaymentStep,
  } = useOnboarding(memberEmail);

  const handleBack = async () => {
    if (currentStep === 0) {
      if (hasStores) {
        navigate("/store-select", { replace: true });
      } else {
        await logoutMutation(undefined, {
          onSuccess: () => queryClient.clear(),
          onSettled: () => navigate("/login"),
        });
      }
    } else {
      goBack();
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <WizardStep key="store">
            <StoreStep onSubmit={submitStoreStep} isPending={isPending} />
          </WizardStep>
        );
      case 1:
        return (
          <WizardStep key="address">
            <AddressStep
              onSubmit={submitAddressStep}
              onSkip={skipAddressStep}
              isPending={isPending}
            />
          </WizardStep>
        );
      case 2:
        return (
          <WizardStep key="company">
            <CompanyStep
              onSubmit={submitCompanyStep}
              onSkip={skipCompanyStep}
              isPending={isPending}
            />
          </WizardStep>
        );
      case 3:
        return (
          <WizardStep key="payment">
            <PaymentStep
              sellerId={sellerId!}
              onSubmit={submitPaymentStep}
              onSkip={skipPaymentStep}
              isPending={isPending}
            />
          </WizardStep>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-dvh w-dvw overflow-hidden">
      <WizardSidebar
        currentStep={currentStep}
        onBack={handleBack}
        showBack
      >
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
      </WizardSidebar>
      <WizardPreview currentStep={currentStep} />
    </div>
  );
};
