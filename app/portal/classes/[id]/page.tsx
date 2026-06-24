import ClassDetail from "@/components/ClassDetail";

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassDetail classId={id} />;
}
