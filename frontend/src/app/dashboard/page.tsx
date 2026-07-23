import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

// TODO: Bu bileşen sadece yer tutucu (placeholder) - gerçek grafikler
// eklenince kaldırılacak.
function PlaceholderChartCard({ title }: { title: string }) {
  const bars = [40, 65, 30, 80, 55, 70, 45];
  return (
    <div className="flex flex-col gap-4 rounded border border-outline-variant/14 bg-surface p-4">
      <span className="font-body-strong text-body-strong text-on-surface">{title}</span>
      <div className="flex h-40 items-end gap-2">
        {bars.map((height, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-primary/40"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <span className="font-caption-mono text-caption-mono text-on-surface-variant">
        Örnek veri - gerçek grafik burada olacak
      </span>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex h-screen w-full bg-surface">
      <Sidebar />
      <main className="flex h-full w-full flex-col md:ml-sidebar-width">
        <TopBar title="Dashboard" />
        <div className="hide-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden p-container-padding">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PlaceholderChartCard title="Kaynağa göre ihale sayısı" />
            <PlaceholderChartCard title="Aylara göre ihale sayısı" />
          </div>
        </div>
      </main>
    </div>
  );
}
