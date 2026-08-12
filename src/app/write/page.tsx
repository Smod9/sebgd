import { redirect } from "next/navigation";

/** Alias for the unlinked compose UI. */
export default function WritePage() {
  redirect("/admin");
}
