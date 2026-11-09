import { spawn } from "node:child_process";

const isolatedEnv = { ...process.env };
for (const key of [
  "DATABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PAYMENT_PROVIDER",
  "PAYMENT_LOCAL_SECRET",
  "PAYMENT_PROVIDER_SECRET_KEY",
  "PAYMENT_WEBHOOK_SECRET",
  "CRON_SECRET",
]) {
  isolatedEnv[key] = "";
}
isolatedEnv.NEXT_PUBLIC_APP_URL = "http://127.0.0.1:3101";

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run E2E tests through npm run test:e2e");

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, ...args], {
      cwd: process.cwd(),
      env: isolatedEnv,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

console.log("Running browser tests with isolated demo services");
const buildResult = await run(["run", "build"]);
if (buildResult !== 0) process.exitCode = buildResult;
else process.exitCode = await run(["exec", "--", "playwright", "test", ...process.argv.slice(2)]);
