import { PencilSquare, Trash, XCircle, CheckCircle } from "@medusajs/icons"
import { Badge, Container, Heading, StatusBadge, toast, usePrompt } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { SectionRow } from "../../../../../components/common/section/section-row"
import { useDeleteCommissionRate, useUpdateCommissionRate } from "../../../../../hooks/api/commission-rates"
import { CommissionRateDTO } from "@mercurjs/types"

type CommissionRateGeneralSectionProps = {
  commissionRate: CommissionRateDTO
}

export const CommissionRateGeneralSection = ({
  commissionRate,
}: CommissionRateGeneralSectionProps) => {
  const formatValue = () => {
    if (commissionRate.type === "percentage") {
      return `${commissionRate.value}%`
    }
    return commissionRate.currency_code
      ? `${commissionRate.value} ${commissionRate.currency_code.toUpperCase()}`
      : `${commissionRate.value}`
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>{commissionRate.name}</Heading>
        <div className="flex items-center gap-4">
          <StatusBadge color={commissionRate.is_enabled ? "green" : "grey"}>
            {commissionRate.is_enabled ? "מופעל" : "מושבת"}
          </StatusBadge>
          <CommissionRateActions commissionRate={commissionRate} />
        </div>
      </div>
      <SectionRow
        title="קוד"
        value={
          <Badge size="2xsmall" className="uppercase">
            {commissionRate.code}
          </Badge>
        }
      />
      <SectionRow
        title="סוג"
        value={
          <Badge
            size="2xsmall"
            color={commissionRate.type === "percentage" ? "blue" : "grey"}
          >
            {commissionRate.type === "percentage" ? "אחוז" : "קבוע"}
          </Badge>
        }
      />
      <SectionRow title="שיעור" value={formatValue()} />
      <SectionRow
        title="יעד"
        value={commissionRate.target === "item" ? "פריט" : "משלוח"}
      />
      <SectionRow
        title="כולל מע&quot;מ"
        value={commissionRate.include_tax ? "כן" : "לא"}
      />
      <SectionRow title="עדיפות" value={String(commissionRate.priority)} />
      {commissionRate.min_amount != null && (
        <SectionRow
          title="סכום מינימלי"
          value={
            commissionRate.currency_code
              ? `${commissionRate.min_amount} ${commissionRate.currency_code.toUpperCase()}`
              : String(commissionRate.min_amount)
          }
        />
      )}
    </Container>
  )
}

const CommissionRateActions = ({
  commissionRate,
}: {
  commissionRate: CommissionRateDTO
}) => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { mutateAsync } = useDeleteCommissionRate(commissionRate.id)
  const { mutateAsync: updateCommissionRate } = useUpdateCommissionRate(commissionRate.id)
  const prompt = usePrompt()

  const handleToggleEnabled = async () => {
    const newEnabled = !commissionRate.is_enabled
    await updateCommissionRate(
      { is_enabled: newEnabled },
      {
        onSuccess: () => {
          toast.success(
            newEnabled
              ? "שיעור העמלה הופעל בהצלחה"
              : "שיעור העמלה הושבת בהצלחה"
          )
        },
        onError: (e) => {
          toast.error(e.message)
        },
      }
    )
  }

  const handleDelete = async () => {
    const res = await prompt({
      title: t("general.areYouSure"),
      description: `האם אתה בטוח שברצונך למחוק את שיעור העמלה "${commissionRate.name}"?`,
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    })

    if (!res) {
      return
    }

    await mutateAsync(undefined, {
      onSuccess: () => {
        toast.success("שיעור העמלה נמחק בהצלחה")
        navigate("/settings/commission-rates", { replace: true })
      },
      onError: (e) => {
        toast.error(e.message)
      },
    })
  }

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <PencilSquare />,
              label: t("actions.edit"),
              to: `/settings/commission-rates/${commissionRate.id}/edit`,
            },
            {
              icon: commissionRate.is_enabled ? <XCircle /> : <CheckCircle />,
              label: commissionRate.is_enabled ? t("actions.disable") : t("actions.enable"),
              onClick: handleToggleEnabled,
            },
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              label: t("actions.delete"),
              onClick: handleDelete,
            },
          ],
        },
      ]}
    />
  )
}
