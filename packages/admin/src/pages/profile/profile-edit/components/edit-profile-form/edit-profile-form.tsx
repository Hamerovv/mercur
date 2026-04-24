import { zodResolver } from "@hookform/resolvers/zod"
import { Button, Input, toast } from "@medusajs/ui"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import * as zod from "zod"

import { HttpTypes } from "@medusajs/types"
import { Form } from "../../../../../components/common/form"
import { RouteDrawer, useRouteModal } from "../../../../../components/modals"
import { KeyboundForm } from "../../../../../components/utilities/keybound-form"
import { useUpdateUser } from "../../../../../hooks/api/users"

type EditProfileProps = {
  user: HttpTypes.AdminUser
  // usageInsights: boolean
}

const EditProfileSchema = zod.object({
  first_name: zod.string().optional(),
  last_name: zod.string().optional(),
  language: zod.string(),
  // usage_insights: zod.boolean(),
})

export const EditProfileForm = ({ user }: EditProfileProps) => {
  const { t } = useTranslation()
  const { handleSuccess } = useRouteModal()
  const form = useForm<zod.infer<typeof EditProfileSchema>>({
    defaultValues: {
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      language: "he",
    },
    resolver: zodResolver(EditProfileSchema),
  })

  const { mutateAsync, isPending } = useUpdateUser(user.id!)

  const handleSubmit = form.handleSubmit(async (values) => {
    await mutateAsync(
      {
        first_name: values.first_name,
        last_name: values.last_name,
      },
      {
        onError: (error) => {
          toast.error(error.message)
          return
        },
      }
    )

    toast.success(t("profile.toast.edit"))
    handleSuccess()
  })

  return (
    <RouteDrawer.Form form={form} data-testid="profile-edit-form">
      <KeyboundForm onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <RouteDrawer.Body data-testid="profile-edit-body">
          <div className="flex flex-col gap-y-8">
            <div className="grid grid-cols-2 gap-4">
              <Form.Field
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <Form.Item data-testid="profile-edit-first-name-item">
                    <Form.Label data-testid="profile-edit-first-name-label">{t("fields.firstName")}</Form.Label>
                    <Form.Control data-testid="profile-edit-first-name-control">
                      <Input {...field} data-testid="profile-edit-first-name-input" />
                    </Form.Control>
                    <Form.ErrorMessage data-testid="profile-edit-first-name-error" />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <Form.Item data-testid="profile-edit-last-name-item">
                    <Form.Label data-testid="profile-edit-last-name-label">{t("fields.lastName")}</Form.Label>
                    <Form.Control data-testid="profile-edit-last-name-control">
                      <Input {...field} data-testid="profile-edit-last-name-input" />
                    </Form.Control>
                    <Form.ErrorMessage data-testid="profile-edit-last-name-error" />
                  </Form.Item>
                )}
              />
            </div>
            {/* TODO: Do we want to implement usage insights in V2? */}
            {/* <Form.Field
              control={form.control}
              name="usage_insights"
              render={({ field: { value, onChange, ...rest } }) => (
                <Form.Item>
                  <div className="flex items-center justify-between">
                    <Form.Label>
                      {t("profile.fields.usageInsightsLabel")}
                    </Form.Label>
                    <Form.Control>
                      <Switch dir="ltr"
                        className="rtl:rotate-180"
                        {...rest}
                        checked={value}
                        onCheckedChange={onChange}
                      />
                    </Form.Control>
                  </div>
                  <Form.Hint>
                    <span>
                      <Trans
                        i18nKey="profile.edit.usageInsightsHint"
                        components={[
                          <a
                            key="hint-link"
                            className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-fg underline"
                            // TODO change link once docs are public
                            href="https://medusa-resources-git-docs-v2-medusajs.vercel.app/resources/usage#admin-analytics"
                            target="_blank"
                            rel="noopener noreferrer"
                          />,
                        ]}
                      />
                    </span>
                  </Form.Hint>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            /> */}
          </div>
        </RouteDrawer.Body>
        <RouteDrawer.Footer data-testid="profile-edit-footer">
          <div className="flex items-center gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary" data-testid="profile-edit-cancel-button">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={isPending} data-testid="profile-edit-save-button">
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  )
}
