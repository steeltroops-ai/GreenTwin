export const dynamic = "force-dynamic";

export async function GET() {
  const today = new Date();
  const series = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const base = 6.5 - i * 0.18 + Math.sin(i * 0.7) * 0.4;
    return {
      date: d.toISOString().slice(0, 10),
      kg: Number(Math.max(2.1, base).toFixed(2)),
    };
  });
  return Response.json({ series });
}