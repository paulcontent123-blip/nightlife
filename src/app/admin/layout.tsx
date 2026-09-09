import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/modules/auth/auth.guard";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default async function AdminLayout({ children }: { children: ReactNode }) {
    let displayName = "Admin";

    try {
        const admin = await requireAdmin();
        displayName = admin.display_name;
    } catch {
        redirect("/");
    }

    return (
        <div className="flex min-h-screen bg-void-3">
            <AdminSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-16 items-center justify-between border-b border-border bg-void-2 px-5 sm:px-8">
                    <p className="font-display text-sm font-bold text-white">Nightlife Admin</p>
                    <div className="flex items-center gap-3">
                        <span className="hidden text-[13px] text-muted sm:inline">
                            Xin chào, <span className="text-white">{displayName}</span>
                        </span>
                        <ThemeToggle />
                        <LogoutButton />
                    </div>
                </header>
                <main className="flex-1 px-5 py-8 sm:px-8">{children}</main>
            </div>
        </div>
    );
}
