import { publicDirectory } from "@/lib/public/directory";
import { StrategiserDemo } from "./strategiser-demo";

/*
  Per request, like the rest of the showcase. Prerendered, the roster size in
  the copy would be frozen at whatever the build saw — zero, when the database
  is unreachable — and quietly stay wrong.
*/
export const dynamic = "force-dynamic";
export const metadata = { title: "Strategiser" };

export default async function PublicStrategiserPage() {
  const roster = await publicDirectory();
  return <StrategiserDemo rosterSize={roster.length} />;
}
