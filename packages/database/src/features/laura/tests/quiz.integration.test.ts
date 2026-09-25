// @module-tag integration
import { prisma } from "../../prisma/client";
import {
  createQuizQuestion,
  getQuizQuestionById,
  updateQuizQuestion,
} from "../quiz.service";

// Runs against DATABASE_URL. Every row hangs off USER_ID and goes with it.
const USER_ID = "quiz-test-user";
const IMAGE = {
  imageBlurHash: "LKO2?U%2Tw=w",
  imageThumbnailUrl: "quiz-test-thumb.jpg",
  imageUrl: "quiz-test.jpg",
};

let questionId = "";

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.user.create({
    data: { email: "quiz-test@allonfire.test", id: USER_ID },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.$disconnect();
});

describe("updateQuizQuestion", () => {
  beforeAll(async () => {
    const question = await createQuizQuestion({
      answers: [
        { isCorrect: true, sortOrder: 0, text: "With image", ...IMAGE },
        { isCorrect: false, sortOrder: 1, text: "Without" },
      ],
      createdBy: USER_ID,
      text: "Which one keeps its picture?",
    });
    questionId = question.id;
  });

  it("keeps a kept answer image whole, blur hash included", async () => {
    await updateQuizQuestion(questionId, {
      answers: [
        {
          isCorrect: true,
          keepImageUrl: IMAGE.imageUrl,
          sortOrder: 0,
          text: "With image",
        },
        { isCorrect: false, sortOrder: 1, text: "Without" },
      ],
      text: "Which one keeps its picture?",
    });

    const answers = (await getQuizQuestionById(questionId))?.answers;
    expect(answers?.[0]).toMatchObject(IMAGE);
    expect(answers?.[1]?.imageUrl).toBeNull();
  });

  it("writes no image for a kept URL the question does not hold", async () => {
    await updateQuizQuestion(questionId, {
      answers: [
        {
          isCorrect: true,
          keepImageUrl: "https://elsewhere.example/planted.jpg",
          sortOrder: 0,
          text: "With image",
        },
      ],
      text: "Which one keeps its picture?",
    });

    const answers = (await getQuizQuestionById(questionId))?.answers;
    expect(answers?.[0]).toMatchObject({
      imageBlurHash: null,
      imageThumbnailUrl: null,
      imageUrl: null,
    });
  });
});
