import { listVehicles } from "@/backend/vehicles";
import { GarageBoard } from "./garage-board";

export default async function GaragePage() {
  const vehicles = await listVehicles();
  return <GarageBoard initialVehicles={vehicles} />;
}
