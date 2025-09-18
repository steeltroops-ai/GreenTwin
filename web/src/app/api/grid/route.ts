export const dynamic = "force-dynamic";

function randomBetween(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

export async function GET() {
  const now = Date.now();
  const current = randomBetween(200, 520); // gCO2/kWh
  const windows = [
    { start: new Date(now + 2 * 3600_000).toISOString(), end: new Date(now + 4 * 3600_000).toISOString(), intensity: randomBetween(200, 320) },
    { start: new Date(now + 24 * 3600_000).toISOString(), end: new Date(now + 26 * 3600_000).toISOString(), intensity: randomBetween(190, 300) },
  ];
  return Response.json({ current, windows });
}