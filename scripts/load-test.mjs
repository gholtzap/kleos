const baseUrl = process.env.KLEOS_BASE_URL;
const profileId = process.env.KLEOS_TEST_PROFILE_ID;
const total = Number(process.env.KLEOS_LOAD_REQUESTS ?? 1_000);
const concurrency = Number(process.env.KLEOS_LOAD_CONCURRENCY ?? 25);

if (!baseUrl || !profileId) {
  throw new Error(
    "KLEOS_BASE_URL and KLEOS_TEST_PROFILE_ID are required.",
  );
}
if (
  !Number.isInteger(total) ||
  total < 1 ||
  total > 100_000 ||
  !Number.isInteger(concurrency) ||
  concurrency < 1 ||
  concurrency > 500
) {
  throw new Error("Load-test limits are invalid.");
}

const targets = [
  `${baseUrl}/api/profiles?id=${encodeURIComponent(profileId)}`,
  `${baseUrl}/api/discover?q=engineering`,
];
const durations = [];
let failures = 0;
let cursor = 0;

async function worker() {
  for (;;) {
    const index = cursor;
    cursor += 1;
    if (index >= total) return;
    const startedAt = performance.now();
    try {
      const response = await fetch(targets[index % targets.length]);
      await response.arrayBuffer();
      if (!response.ok) failures += 1;
    } catch {
      failures += 1;
    } finally {
      durations.push(performance.now() - startedAt);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
durations.sort((left, right) => left - right);

function percentile(value) {
  const index = Math.min(
    durations.length - 1,
    Math.floor(durations.length * value),
  );
  return Math.round((durations[index] ?? 0) * 10) / 10;
}

const result = {
  requests: total,
  concurrency,
  failures,
  p50Ms: percentile(0.5),
  p95Ms: percentile(0.95),
  p99Ms: percentile(0.99),
};
console.log(JSON.stringify(result, null, 2));
if (failures) process.exitCode = 1;
