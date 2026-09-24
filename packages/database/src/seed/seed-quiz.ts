import { prisma } from "../client";
import { createQuizQuestion } from "../laura/quiz.service";
import { QUIZ_QUESTIONS } from "./mock/quiz-questions";

async function seed() {
  const admin = await prisma.user.findFirst({
    select: { id: true, name: true },
    where: { role: "ADMIN" },
  });

  if (!admin) {
    console.error("No admin user found");
    process.exit(1);
  }

  // Clear existing quiz data
  console.log("Clearing existing quiz questions...");
  await prisma.quizAnswer.deleteMany();
  await prisma.quizQuestion.deleteMany();

  console.log(`Seeding as ${admin.name} (${admin.id})`);

  // In order, so createdAt follows the list.
  await QUIZ_QUESTIONS.reduce(async (previous, q) => {
    await previous;
    const created = await createQuizQuestion({
      answers: q.answers,
      createdBy: admin.id,
      imageThumbnailUrl: q.imageThumbnailUrl,
      imageUrl: q.imageUrl,
      text: q.text,
    });
    console.log(`  + ${created.id}: ${q.text.slice(0, 60)}...`);
  }, Promise.resolve());

  console.log(`\nSeeded ${QUIZ_QUESTIONS.length} quiz questions`);
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
