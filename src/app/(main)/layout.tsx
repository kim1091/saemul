import BottomNav from "@/components/ui/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full pb-20">
      {children}
      <BottomNav role="member" />
    </div>
  );
}
