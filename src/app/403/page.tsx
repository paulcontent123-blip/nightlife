import Link from "next/link";

export default function ForbiddenPage() {
    return (
        <main className="min-h-screen px-6 py-16">
            <div className="mx-auto max-w-xl">
                <p className="text-sm font-medium text-red-600">403</p>
                <h1 className="mt-3 text-3xl font-semibold">Forbidden</h1>
                <p className="mt-4 text-gray-600">
                    You do not have permission to access this page.
                </p>
                <Link
                    href="/"
                    className="mt-8 inline-flex h-10 items-center rounded-md bg-black px-4 text-sm font-medium text-white"
                >
                    Back home
                </Link>
            </div>
        </main>
    );
}
