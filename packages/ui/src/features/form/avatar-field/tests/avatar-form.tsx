import { useAOFForm } from "../../utils/form";

/** The field's name and words, as the field's tests give them. */
export const AVATAR_FIELD = {
  LABEL: "Picture",
  LABELS: {
    busy: "Preparing the picture",
    cancel: "Cancel",
    change: "Change",
    choose: "Choose a picture",
    cropAgain: "Crop again",
    current: "Current picture",
    dialogTitle: "Crop the picture",
    drop: "Drop your picture here",
    formats: "JPEG, PNG, WebP, AVIF or HEIC, up to 20 MB",
    remove: "Remove the picture",
    tooLarge: "Too large",
    unreadable: "Unreadable",
    use: "Use",
    wrongType: "Not a picture",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
  },
} as const;

const NO_AVATAR: { avatar: File | null } = { avatar: null };

/** The field in a form, holding `current` when given. */
export const AvatarForm = ({ current }: { current?: string | null }) => {
  const form = useAOFForm({ defaultValues: NO_AVATAR });
  return (
    <form.AppField name="avatar">
      {(field) => (
        <field.AvatarField
          current={current}
          label={AVATAR_FIELD.LABEL}
          labels={AVATAR_FIELD.LABELS}
        />
      )}
    </form.AppField>
  );
};
