import type { MarkdownHeading } from "@/components/articles/MarkdownContent";

export function ArticleTableOfContents({
    headings,
    collapsible = false,
}: {
    headings: MarkdownHeading[];
    collapsible?: boolean;
}) {
    if (headings.length === 0) return null;

    const links = (
        <ol className="mt-3 space-y-2.5">
            {headings.map((heading) => (
                <li
                    key={heading.id}
                    className={heading.level === 3 ? "pl-6" : heading.level === 2 ? "pl-3" : ""}
                >
                    <a
                        href={`#${heading.id}`}
                        className="block border-l border-border-strong pl-3 text-sm leading-5 text-muted transition-colors hover:border-amber hover:text-amber"
                    >
                        {heading.text}
                    </a>
                </li>
            ))}
        </ol>
    );

    if (collapsible) {
        return (
            <details className="border-y border-border py-4">
                <summary className="cursor-pointer font-display text-sm font-bold text-white">
                    Mục lục bài viết
                </summary>
                {links}
            </details>
        );
    }

    return (
        <nav aria-label="Mục lục bài viết">
            <p className="font-display text-sm font-bold text-white">Mục lục bài viết</p>
            {links}
        </nav>
    );
}
