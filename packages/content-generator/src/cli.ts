import { prisma } from "@allonfire/database";
import { generatePromptForTopic } from "./generate";

async function main() {
  const topics = await prisma.topic.findMany({
    where: { status: "SELECTED" },
  });

  if (topics.length === 0) {
    console.log("No selected topics to generate prompts for.");
    return;
  }

  console.log(`Generating prompts for ${topics.length} topic(s)...`);

  for (const topic of topics) {
    await generatePromptForTopic(topic.id);
  }

  console.log("Done!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
