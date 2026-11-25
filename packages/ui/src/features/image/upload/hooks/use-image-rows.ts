import { useSelector } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import { aofToast } from "../../../../shared/hooks/use-aof-toast";
import { acceptFiles } from "../utils/accept-files";
import type { AddImagesForm } from "./use-add-images-form";

const idsOf = (state: { values: { rows: { id?: string | undefined }[] } }) =>
  state.values.rows.map(({ id }) => id ?? "").join(" ");

/** Where focus goes after a row is removed: the Remove button now at its place, else the one before it, else the heading. */
const focusAround = (root: HTMLElement | null, index: number) => {
  const removers = [
    ...(root?.querySelectorAll<HTMLElement>("[data-remove-row] button") ?? []),
  ];
  const target =
    removers[index] ?? removers.at(-1) ?? root?.querySelector("h1");
  target?.focus();
};

/**
 * The Add Images form's rows: picking files into rows (a file left out says
 * why in a toast and the rows stay as they were), copying the shared set onto
 * the rows already there, and keeping focus in the form when a row goes, by
 * whatever way it went. `root` goes on the element holding the form's heading
 * (an `h1` with `tabIndex={-1}`) and each row's Remove button inside a
 * `data-remove-row`.
 */
export const useImageRows = (form: AddImagesForm) => {
  const t = useTranslations("Common.ImageUpload.field");
  const root = useRef<HTMLDivElement>(null);
  const held = useRef<string[]>([]);
  const ids = useSelector(form.store, idsOf);
  // A row gone is told by the keys: focus moves once it is out of the page.
  useEffect(() => {
    const before = held.current;
    const now = ids === "" ? [] : ids.split(" ");
    held.current = now;
    if (now.length < before.length) {
      const index = before.findIndex((id, at) => id !== now[at]);
      focusAround(root.current, index === -1 ? now.length : index);
    }
  }, [ids]);
  const pick = useCallback(
    (files: File[]) => {
      const { rows, shared } = form.state.values;
      const { accepted, refused } = acceptFiles(
        {
          bytes: rows.reduce((sum, { file }) => sum + file.size, 0),
          count: rows.length,
        },
        files
      );
      if (refused) {
        aofToast(t(refused), "error");
      }
      for (const file of accepted) {
        form.pushFieldValue("rows", {
          access: shared.access,
          alt: { en: "", it: "" },
          apps: [...shared.apps],
          file,
          id: crypto.randomUUID(),
          picker: "",
        });
      }
    },
    [form, t]
  );
  const applyToAll = useCallback(() => {
    const { rows, shared } = form.state.values;
    form.setFieldValue(
      "rows",
      rows.map((row) => ({
        ...row,
        access: shared.access,
        apps: [...shared.apps],
      }))
    );
  }, [form]);
  return { applyToAll, pick, root };
};
