import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  migrations: {
    seed: 'ts-node --project tsconfig.json prisma/seed.ts',
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});

