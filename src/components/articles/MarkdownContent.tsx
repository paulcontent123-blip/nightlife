import Link from "next/link";
import type { ReactNode } from "react";

const IMAGE_BLOCK_PATTERN = /^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/;
const TABLE_SEPARATOR_PATTERN = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const UNORDERED_LIST_ITEM_PATTERN = /^[-*+]\s+(.+)$/;
const ORDERED_LIST_ITEM_PATTERN = /^\d+[.)]\s+(.+)$/;
const BLOCKQUOTE_LINE_PATTERN = /^>\s?(.*)$/;

type TableAlignment = "left" | "center" | "right";

interface ParsedTable {
    headers: string[];
    rows: string[][];
    alignments: TableAlignment[];
}

interface ParsedList {
    ordered: boolean;
    items: string[];
}

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

    const lines = block.split("\n").map((line) => line.trimEnd());
    const table = parseTable(lines);

    if (table) {
        return (
            <div key={index} className="my-6 overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm text-muted">
                    <thead className="bg-white/5 text-white">
                        <tr>
                            {table.headers.map((header, headerIndex) => (
                                <th
                                    key={headerIndex}
                                    scope="col"
                                    align={table.alignments[headerIndex]}
                                    className="border-b border-border px-4 py-3 font-semibold"
                                >
                                    {renderInline(header)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {table.rows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-border last:border-b-0">
                                {table.headers.map((_, cellIndex) => (
                                    <td
                                        key={cellIndex}
                                        align={table.alignments[cellIndex]}
                                        className="px-4 py-3 align-top"
                                    >
                                        {renderInline(row[cellIndex] ?? "")}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
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

    const list = parseList(lines);

    if (list) {
        const ListTag = list.ordered ? "ol" : "ul";

        return (
            <ListTag
                key={index}
                className={[
                    list.ordered ? "list-decimal" : "list-disc",
                    "space-y-2 pl-5 text-base leading-8 text-muted",
                ].join(" ")}
            >
                {list.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{renderInline(item)}</li>
                ))}
            </ListTag>
        );
    }

    const quoteLines = parseBlockquote(lines);

    if (quoteLines) {
        return (
            <blockquote key={index} className="border-l-2 border-amber pl-4 text-base italic leading-8 text-muted">
                {quoteLines.map((line, lineIndex) => (
                    <p key={lineIndex}>{renderInline(line)}</p>
                ))}
            </blockquote>
        );
    }

    return (
        <p key={index} className="whitespace-pre-line text-base leading-8 text-muted">
            {renderInline(block)}
        </p>
    );
}

function parseTable(lines: string[]): ParsedTable | null {
    if (lines.length < 2 || !TABLE_SEPARATOR_PATTERN.test(lines[1])) {
        return null;
    }

    const headers = splitTableRow(lines[0]);
    const separatorCells = splitTableRow(lines[1]);

    if (headers.length < 2 || separatorCells.length !== headers.length) {
        return null;
    }

    return {
        headers,
        rows: lines.slice(2)
            .map(splitTableRow)
            .filter((row) => row.length > 0),
        alignments: separatorCells.map(getTableAlignment),
    };
}

function splitTableRow(line: string) {
    const normalized = line.trim().replace(/^\|/, "").replace(/\|$/, "");

    return normalized.split("|").map((cell) => cell.trim());
}

function getTableAlignment(separator: string): TableAlignment {
    const trimmed = separator.trim();

    if (trimmed.startsWith(":") && trimmed.endsWith(":")) {
        return "center";
    }

    if (trimmed.endsWith(":")) {
        return "right";
    }

    return "left";
}

function parseList(lines: string[]): ParsedList | null {
    if (lines.length === 0) {
        return null;
    }

    const unorderedItems = lines.map((line) => line.trim().match(UNORDERED_LIST_ITEM_PATTERN));

    if (unorderedItems.every(Boolean)) {
        return {
            ordered: false,
            items: unorderedItems.map((match) => match?.[1] ?? ""),
        };
    }

    const orderedItems = lines.map((line) => line.trim().match(ORDERED_LIST_ITEM_PATTERN));

    if (orderedItems.every(Boolean)) {
        return {
            ordered: true,
            items: orderedItems.map((match) => match?.[1] ?? ""),
        };
    }

    return null;
}

function parseBlockquote(lines: string[]) {
    const matches = lines.map((line) => line.match(BLOCKQUOTE_LINE_PATTERN));

    if (!matches.every(Boolean)) {
        return null;
    }

    return matches.map((match) => match?.[1] ?? "");
}

function renderInline(value: string) {
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const linkPattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;

    while ((match = linkPattern.exec(value)) !== null) {
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
            <Link key={key} href={href} prefetch={false} className="font-semibold text-amber hover:text-amber-2">
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
