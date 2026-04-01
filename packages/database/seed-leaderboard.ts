/**
 * Temporary seed script to inject fake leaderboard data for debugging.
 * Run: npx tsx packages/database/seed-leaderboard.ts
 * Delete after use.
 */
import { PrismaClient } from "./generated/prisma/client";

const prisma = new PrismaClient();

const FAKE_PLAYERS = [
  "Marco Rossi",
  "Giulia Bianchi",
  "Luca Ferrari",
  "Sofia Russo",
  "Alessandro Conti",
  "Chiara Moretti",
  "Matteo Ricci",
  "Elena Lombardi",
  "Davide Marino",
  "Francesca Costa",
  "Andrea Romano",
  "Valentina Greco",
  "Pietro Colombo",
  "Anna Fontana",
  "Giuseppe Marchetti",
  "Laura Rinaldi",
  "Simone Galli",
  "Beatrice Mancini",
  "Federico Barbieri",
  "Martina Pellegrini",
  "Nicola Santoro",
  "Sara Fabbri",
  "Tommaso Villa",
  "Elisa Cattaneo",
  "Lorenzo Monti",
  "Camilla Giordano",
  "Gabriele Testa",
  "Ilaria Parisi",
  "Riccardo Vitale",
  "Lucia De Luca",
];

async function main() {
  // Step 1: Check existing users
  const existingUsers = await prisma.user.findMany({
    select: { id: true, name: true },
  });
  console.log(`Found ${existingUsers.length} existing users`);

  // Step 2: Create fake users if needed
  const targetPlayers = 30;
  const usersToCreate = targetPlayers - existingUsers.length;
  const createdUsers: { id: string; name: string }[] = [];

  if (usersToCreate > 0) {
    console.log(`Creating ${usersToCreate} fake users...`);
    for (let i = 0; i < usersToCreate; i++) {
      const name = FAKE_PLAYERS[existingUsers.length + i] ?? `Player ${i + 1}`;
      const user = await prisma.user.create({
        data: {
          name,
          email: `fake-${Date.now()}-${i}@debug.local`,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        select: { id: true, name: true },
      });
      createdUsers.push(user);
    }
    console.log(`Created ${createdUsers.length} fake users`);
  }

  const allUsers = [...existingUsers, ...createdUsers];
  console.log(`Total users for seeding: ${allUsers.length}`);

  // Step 3: Insert MEMORY scores
  const memoryScores = allUsers.map((user) => ({
    userId: user.id,
    gameType: "MEMORY" as const,
    timeMs: 15_000 + Math.floor(Math.random() * 105_000), // 15s - 2min
    score: 12 + Math.floor(Math.random() * 28), // 12-40 moves
    metadata: { pairs: 6, gridSize: "3x4" },
    createdAt: new Date(
      Date.now() - Math.floor(Math.random() * 30) * 86_400_000
    ), // last 30 days
  }));

  // Add some users with multiple games (so distinct works)
  for (let i = 0; i < 5 && i < allUsers.length; i++) {
    const user = allUsers[i];
    if (!user) {
      continue;
    }
    memoryScores.push({
      userId: user.id,
      gameType: "MEMORY" as const,
      timeMs: 20_000 + Math.floor(Math.random() * 80_000),
      score: 14 + Math.floor(Math.random() * 20),
      metadata: { pairs: 6, gridSize: "3x4" },
      createdAt: new Date(
        Date.now() - Math.floor(Math.random() * 15) * 86_400_000
      ),
    });
  }

  const memoryResult = await prisma.gameScore.createMany({
    data: memoryScores,
  });
  console.log(`Inserted ${memoryResult.count} MEMORY scores`);

  // Step 4: Insert QUIZ scores
  const quizScores = allUsers.map((user) => ({
    userId: user.id,
    gameType: "QUIZ" as const,
    timeMs: 20_000 + Math.floor(Math.random() * 100_000), // 20s - 2min
    score: 3 + Math.floor(Math.random() * 8), // 3-10 correct
    metadata: { questionCount: 10 },
    createdAt: new Date(
      Date.now() - Math.floor(Math.random() * 30) * 86_400_000
    ),
  }));

  // Extra games for some users
  for (let i = 0; i < 5 && i < allUsers.length; i++) {
    const user = allUsers[i];
    if (!user) {
      continue;
    }
    quizScores.push({
      userId: user.id,
      gameType: "QUIZ" as const,
      timeMs: 25_000 + Math.floor(Math.random() * 75_000),
      score: 5 + Math.floor(Math.random() * 6),
      metadata: { questionCount: 10 },
      createdAt: new Date(
        Date.now() - Math.floor(Math.random() * 15) * 86_400_000
      ),
    });
  }

  const quizResult = await prisma.gameScore.createMany({ data: quizScores });
  console.log(`Inserted ${quizResult.count} QUIZ scores`);

  // Summary
  const totalMemory = await prisma.gameScore.count({
    where: { gameType: "MEMORY" },
  });
  const totalQuiz = await prisma.gameScore.count({
    where: { gameType: "QUIZ" },
  });
  console.log(`\nTotal scores in DB: MEMORY=${totalMemory}, QUIZ=${totalQuiz}`);
  console.log(
    "Done! Visit /games/memory/leaderboard and /games/quiz/leaderboard to verify."
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
