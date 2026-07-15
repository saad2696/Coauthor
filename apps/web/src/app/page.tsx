import { redirect } from "next/navigation";

// Root → dashboard. The (app) guard bounces unauthenticated users to /login.
export default function RootPage() {
  redirect("/dashboard");
}
