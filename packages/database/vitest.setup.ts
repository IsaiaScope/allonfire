process.env.DATABASE_URL ??=
  "postgresql://allonfire:allonfire@localhost:5432/allonfire";
process.env.ENCRYPTION_KEY ??= "a".repeat(64);
