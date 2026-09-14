import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/modules/auth/auth.guard";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AdminMobileNavigation } from "@/components/layout/AdminMobileNavigation";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

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
                <header className="relative flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-void-2 px-4 sm:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <AdminMobileNavigation />
                        <p className="hidden truncate font-display text-sm font-bold text-white sm:block">Nightlife Admin</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <span className="hidden text-[13px] text-muted sm:inline">
                            Xin chào, <span className="text-white">{displayName}</span>
                        </span>
                        <LanguageSwitcher />
                        <ThemeToggle />
                        <LogoutButton />
                    </div>
                </header>
                <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
            </div>
        </div>
    );
}
