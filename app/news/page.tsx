import { redirect } from "next/navigation";

/** Legacy /news page → home with drawer open. */
export default function NewsRedirectPage() {
  redirect("/?news=1");
}
