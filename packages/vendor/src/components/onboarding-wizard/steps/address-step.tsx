import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Heading, Input } from "@medusajs/ui";
import i18n from "i18next";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";

import { Form } from "@components/common/form";
const AddressStepSchema = z.object({
  name: z.string().min(1, i18n.t("onboarding.wizard.validation.nameRequired")),
  address_1: z.string().optional(),
  address_2: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  country_code: z.string().min(1),
  province: z.string().optional(),
});

type AddressStepValues = z.infer<typeof AddressStepSchema>;

type AddressStepProps = {
  onSubmit: (data: AddressStepValues) => Promise<void>;
  onSkip: () => void;
  isPending?: boolean;
};

export const AddressStep = ({ onSubmit, onSkip, isPending }: AddressStepProps) => {
  const { t } = useTranslation();

  const form = useForm<AddressStepValues>({
    resolver: zodResolver(AddressStepSchema),
    defaultValues: {
      name: "",
      address_1: "",
      address_2: "",
      postal_code: "",
      city: "",
      country_code: "il",
      province: "",
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
  });

  return (
    <div className="flex flex-col gap-y-8">
      <Heading level="h2" className="text-ui-fg-base text-lg">
        {t("onboarding.wizard.address.title")}
      </Heading>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-y-6">
          <div className="flex flex-col gap-y-4">
            <Form.Field
              control={form.control}
              name="name"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>
                    {t("onboarding.wizard.address.name")}
                  </Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="address_1"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label optional>{t("onboarding.wizard.address.address")}</Form.Label>
                  <Form.Control>
                    <Input autoComplete="address-line1" {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="address_2"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label optional>
                    {t("onboarding.wizard.address.address2")}
                  </Form.Label>
                  <Form.Control>
                    <Input autoComplete="address-line2" {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="postal_code"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label optional>{t("onboarding.wizard.address.postalCode")}</Form.Label>
                  <Form.Control>
                    <Input autoComplete="postal-code" {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Field
              control={form.control}
              name="city"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label optional>{t("onboarding.wizard.address.city")}</Form.Label>
                  <Form.Control>
                    <Input autoComplete="address-level2" {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
            <Form.Item>
              <Form.Label>{t("onboarding.wizard.address.country")}</Form.Label>
              <div className="bg-ui-bg-field border-ui-border-base flex h-8 items-center rounded-md border px-3 text-sm text-ui-fg-base">
                ישראל 🇮🇱
              </div>
              <input type="hidden" {...form.register("country_code")} />
            </Form.Item>
            <Form.Field
              control={form.control}
              name="province"
              render={({ field }) => (
                <Form.Item>
                  <Form.Label optional>{t("onboarding.wizard.address.state")}</Form.Label>
                  <Form.Control>
                    <Input autoComplete="address-level1" {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Button type="submit" className="w-full" isLoading={isPending}>
              {t("actions.continue")}
            </Button>
            <Button
              type="button"
              variant="transparent"
              className="w-full"
              onClick={onSkip}
            >
              {t("onboarding.wizard.skip")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
