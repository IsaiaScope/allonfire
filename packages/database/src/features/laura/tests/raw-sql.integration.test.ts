// @module-tag integration
import { prisma } from "../../prisma/client";
import {
  getAllRandomPhotos,
  getPhotoCount,
  getRandomPhotos,
  getUserPhotoCount,
} from "../photo.service";
import { getRandomQuizQuestions } from "../quiz.service";

// Runs against DATABASE_URL (the dev database locally, CI's fresh one there).
// Every row hangs off USER_ID and goes with it.
const USER_ID = "raw-sql-test-user";
// Random photos dedupe on the first 6 characters of the blurHash.
const BLUR_HASH = "Zq9rawSQLtest";

let photoId = "";
let questionId = "";

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.user.create({
    data: { email: "raw-sql-test@allonfire.test", id: USER_ID },
  });
  const photo = await prisma.photo.create({
    data: {
      blurHash: BLUR_HASH,
      height: 1,
      thumbnailUrl: "raw-sql-test-thumb.jpg",
      uploadedBy: USER_ID,
      url: "raw-sql-test.jpg",
      width: 1,
    },
  });
  photoId = photo.id;
  const question = await prisma.quizQuestion.create({
    data: { createdBy: USER_ID, text: "Does raw SQL find this?" },
  });
  questionId = question.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.$disconnect();
});

describe("services that run raw SQL", () => {
  it("getRandomPhotos reads the user's photos", async () => {
    const photos = await getRandomPhotos(USER_ID, 5);
    expect(photos.map((photo) => photo.id)).toEqual([photoId]);
  });

  it("getAllRandomPhotos reads every user's photos", async () => {
    const photos = await getAllRandomPhotos(await getPhotoCount());
    expect(photos.map((photo) => photo.id)).toContain(photoId);
  });

  it("getUserPhotoCount counts the user's distinct photos", async () => {
    expect(await getUserPhotoCount(USER_ID)).toBe(1);
  });

  it("getRandomQuizQuestions reads the questions", async () => {
    const questions = await getRandomQuizQuestions(
      await prisma.quizQuestion.count()
    );
    expect(questions.map((question) => question.id)).toContain(questionId);
  });
});
