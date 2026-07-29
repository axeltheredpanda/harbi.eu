import { getNationalE10Price } from "@/backend/fuel";

export async function GET() {
  const price = await getNationalE10Price();
  if (!price) {
    return Response.json({ error: "Fuel price unavailable" }, { status: 502 });
  }
  return Response.json({ price });
}
