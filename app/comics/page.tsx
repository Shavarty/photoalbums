import { redirect } from "next/navigation";

export default function ComicsPage() {
  redirect("/editor?mode=comics");
}
