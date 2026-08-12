import { AdminPostEditor } from "@/components/admin/AdminPostEditor";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminPostPage({ params }: Props) {
  const { id } = await params;
  return <AdminPostEditor id={id} />;
}
