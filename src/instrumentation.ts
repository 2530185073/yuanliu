export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build" || process.env.SCHEDULER === "off") return;
  const { startScheduler } = await import("./server/scheduler");
  startScheduler();
}
