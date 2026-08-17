import Link from "next/link";
import type { ReactNode } from "react";

const IMAGE_BLOCK_PATTERN = /^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/;
const LINK_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)/g;

export function MarkdownContent({ content }: { content: string }) {
    const blocks = content.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

    return (
        <div className="space-y-5">
            {blocks.map((block, index) => renderBlock(block, index))}
        </div>
    );
}

function renderBlock(block: string, index: number) {
    const imageMatch = block.match(IMAGE_BLOCK_PATTERN);

    if (imageMatch) {
        const [, alt, url] = imageMatch;

        return (
            <figure key={index} className="my-7">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={url}
                    alt={alt}
                    className="aspect-[16/9] w-full rounded-xl border border-border object-cover"
                    loading="lazy"
                />
                {alt && (
                    <figcaption className="mt-2 text-center text-xs text-muted-2">
                        {alt}
                    </figcaption>
                )}
            </figure>
        );
    }

    if (block.startsWith("### ")) {
        return (
            <h3 key={index} className="pt-2 font-display text-xl font-bold text-white">
                {renderInline(block.replace(/^###\s+/, ""))}
            </h3>
        );
    }

    if (block.startsWith("## ")) {
        return (
            <h2 key={index} className="pt-4 font-display text-2xl font-extrabold text-white">
                {renderInline(block.replace(/^##\s+/, ""))}
            </h2>
        );
    }

    if (block.startsWith("# ")) {
        return (
            <h2 key={index} className="pt-4 font-display text-3xl font-extrabold text-white">
                {renderInline(block.replace(/^#\s+/, ""))}
            </h2>
        );
    }

    const listItems = block
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("- "));

    if (listItems.length > 0 && listItems.length === block.split("\n").filter(Boolean).length) {
        return (
            <ul key={index} className="list-disc space-y-2 pl-5 text-base leading-8 text-muted">
                {listItems.map((item, itemIndex) => (
                    <li key={itemIndex}>{renderInline(item.replace(/^-\s+/, ""))}</li>
                ))}
            </ul>
        );
    }

    return (
        <p key={index} className="whitespace-pre-line text-base leading-8 text-muted">
            {renderInline(block)}
        </p>
    );
}

function renderInline(value: string) {
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = LINK_PATTERN.exec(value)) !== null) {
        const [raw, text, href] = match;

        if (match.index > lastIndex) {
            nodes.push(value.slice(lastIndex, match.index));
        }

        nodes.push(renderLink(text, href, nodes.length));
        lastIndex = match.index + raw.length;
    }

    if (lastIndex < value.length) {
        nodes.push(value.slice(lastIndex));
    }

    return nodes.length > 0 ? nodes : value;
}

function renderLink(text: string, href: string, key: number) {
    if (href.startsWith("/")) {
        return (
            <Link key={key} href={href} className="font-semibold text-amber hover:text-amber-2">
                {text}
            </Link>
        );
    }

    if (href.startsWith("http://") || href.startsWith("https://")) {
        return (
            <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-amber hover:text-amber-2"
            >
                {text}
            </a>
        );
    }

    return text;
}
