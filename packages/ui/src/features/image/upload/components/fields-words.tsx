"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

/** The Image fields' words (`Common.ImageFields`), for a field group's `render`, which calls no hooks. */
export const FieldsWords = ({
  children,
}: {
  children: (t: ReturnType<typeof useTranslations>) => ReactNode;
}) => children(useTranslations("Common.ImageFields"));
