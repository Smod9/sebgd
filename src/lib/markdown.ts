import { remark } from "remark";
import html from "remark-html";

export async function renderMarkdown(source: string): Promise<string> {
  const result = await remark().use(html).process(source);
  return String(result);
}
