import { prisma } from "./index.js";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "admin@allonfire.com" },
    update: {},
    create: {
      email: "admin@allonfire.com",
      name: "Admin",
    },
  });

  console.log("Seeded admin user:", user.email);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
