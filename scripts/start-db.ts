import EmbeddedPostgres from "embedded-postgres";

const port = Number(process.env.PGPORT ?? 55432);
// Managed development sandboxes may block System V shared memory.
process.env.PGOPTIONS = `${process.env.PGOPTIONS ?? ""} -c dynamic_shared_memory_type=mmap`.trim();
const pg = new EmbeddedPostgres({
  databaseDir: "./data/postgres",
  user: "abilityteach",
  password: "abilityteach",
  port,
  persistent: true,
  initdbFlags: ["--set", "dynamic_shared_memory_type=mmap", "--set", "shared_memory_type=mmap"],
  postgresFlags: ["-c", "dynamic_shared_memory_type=mmap"],
  autoRehydrateSymlinks: true,
  onError: (error) => console.error("[local postgres]", error),
});

await pg.initialise();
await pg.start();
const client = pg.getPgClient();
try {
  await client.connect();
  const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'abilityteach'");
  if (result.rowCount === 0) await pg.createDatabase("abilityteach");
  console.log(`AbilityTeach PostgreSQL is ready on localhost:${port}. Press Ctrl+C to stop it.`);
} finally {
  await client.end();
}

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
await new Promise<void>(() => undefined);
