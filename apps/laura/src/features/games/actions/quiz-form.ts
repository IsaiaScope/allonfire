// Form parsing and image upload for the quiz CRUD actions in quiz-admin.ts. Kept out
// of the "use server" file so these helpers are not exposed as server actions.
import { processPhoto, uploadFile } from "@allonfire/storage";
import { validateImageFile } from "@/lib/file-validation";

export async function processAndUploadImage(
  file: File,
  pathPrefix: string,
  id: string
) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await processPhoto(buffer);

  const [fullUrl, thumbUrl] = await Promise.all([
    uploadFile(`${pathPrefix}/full/${id}.jpg`, processed.full, "image/jpeg"),
    uploadFile(
      `${pathPrefix}/thumb/${id}.jpg`,
      processed.thumbnail,
      "image/jpeg"
    ),
  ]);

  return {
    imageBlurHash: processed.blurHash,
    imageThumbnailUrl: thumbUrl,
    imageUrl: fullUrl,
  };
}

type ParsedAnswer = {
  text: string;
  isCorrect: boolean;
  sortOrder: number;
  image?: File;
};

type FormValidation =
  | {
      valid: true;
      text: string;
      answers: ParsedAnswer[];
      questionImage: File | null;
    }
  | { valid: false; error: string };

function parseAnswer(
  formData: FormData,
  index: number
): { answer: ParsedAnswer } | { error: string } {
  const answerText = formData.get(`answer-${index}-text`) as string;
  if (!answerText || answerText.length < 1 || answerText.length > 200) {
    return { error: `Answer ${index + 1} text must be 1-200 characters` };
  }

  const answerImage = formData.get(`answer-${index}-image`) as File | null;
  if (answerImage && answerImage.size > 0) {
    const imageError = validateImageFile(answerImage);
    if (imageError) {
      return { error: imageError };
    }
  }

  return {
    answer: {
      ...(answerImage && answerImage.size > 0 && { image: answerImage }),
      isCorrect: formData.get(`answer-${index}-correct`) === "true",
      sortOrder: index,
      text: answerText,
    },
  };
}

export function validateQuestionForm(formData: FormData): FormValidation {
  const text = formData.get("text") as string;
  if (!text || text.length < 1 || text.length > 500) {
    return { error: "Question text must be 1-500 characters", valid: false };
  }

  const answerCount = Number(formData.get("answerCount"));
  if (answerCount < 2 || answerCount > 4) {
    return { error: "Must have 2-4 answers", valid: false };
  }

  const answers: ParsedAnswer[] = [];
  for (let i = 0; i < answerCount; i += 1) {
    const result = parseAnswer(formData, i);
    if ("error" in result) {
      return { error: result.error, valid: false };
    }
    answers.push(result.answer);
  }

  const correctCount = answers.filter((a) => a.isCorrect).length;
  if (correctCount !== 1) {
    return { error: "Exactly one answer must be correct", valid: false };
  }

  const image = formData.get("image") as File | null;
  const questionImage = image && image.size > 0 ? image : null;
  if (questionImage) {
    const imageError = validateImageFile(questionImage);
    if (imageError) {
      return { error: imageError, valid: false };
    }
  }

  return { answers, questionImage, text, valid: true };
}
