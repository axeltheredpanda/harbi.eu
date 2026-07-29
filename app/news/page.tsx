import { redirect } from "next/navigation";

/** Legacy /news URL - no longer opens the drawer on the public site. */
export default function NewsRedirectPage() {
  redirect("/");
}
