import { NavBar } from "@/components/nav-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <NavBar />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
    </div>
  );
}
