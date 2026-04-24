import { InitOptions } from "i18next"

export const defaultI18nOptions: InitOptions = {
  debug: process.env.NODE_ENV === "development",
  fallbackLng: "en",
  fallbackNS: "translation",
  interpolation: {
    escapeValue: false,
  }
}
