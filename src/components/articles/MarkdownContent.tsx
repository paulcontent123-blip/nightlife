import Link from "next/link";
import type { ReactNode } from "react";

const IMAGE_BLOCK_PATTERN = /^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/;
const HEADING_PATTERN = /^(#{1,3})\s+(.+?)\s*#*$/;
const TABLE_SEPARATOR_PATTERN = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const UNORDERED_LIST_ITEM_PATTERN = /^[-*+]\s+(.+)$/;
const ORDERED_LIST_ITEM_PATTERN = /^\d+[.)]\s+(.+)$/;
const BLOCKQUOTE_LINE_PATTERN = /^>\s?(.*)$/;
const HORIZONTAL_RULE_PATTERN = /^(?:-{3,}|\*{3,}|_{3,})$/;

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

export interface MarkdownHeading {
    id: string;
    text: string;
    level: 1 | 2 | 3;
}

export function extractMarkdownHeadings(content: string): MarkdownHeading[] {
    const usedIds = new Map<string, number>();

    return splitMarkdownBlocks(content).flatMap((block) => {
        const match = block.match(HEADING_PATTERN);

        if (!match) {
            return [];
        }

        const text = stripInlineMarkdown(match[2]);
        const level = match[1].length as MarkdownHeading["level"];

        return [{ id: createUniqueHeadingId(text, usedIds), text, level }];
    });
}

export function MarkdownContent({ content }: { content: string }) {
    const blocks = splitMarkdownBlocks(content);
    const headings = extractMarkdownHeadings(content);
    let headingIndex = 0;

    return (
        <div className="space-y-5">
            {blocks.map((block, index) => {
                const heading = HEADING_PATTERN.test(block)
                    ? headings[headingIndex++]
                    : undefined;

                return renderBlock(block, index, heading);
            })}
        </div>
    );
}

function splitMarkdownBlocks(content: string) {
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const blocks: string[] = [];
    let buffer: string[] = [];
    let bufferType = "";

    function flushBuffer() {
        const block = buffer.join("\n").trim();

        if (block) {
            blocks.push(block);
        }

        buffer = [];
        bufferType = "";
    }

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) {
            flushBuffer();
            continue;
        }

        if (HEADING_PATTERN.test(trimmed) || IMAGE_BLOCK_PATTERN.test(trimmed) || HORIZONTAL_RULE_PATTERN.test(trimmed)) {
            flushBuffer();
            blocks.push(trimmed);
            continue;
        }

        const lineType = getMarkdownLineType(trimmed);

        if (buffer.length > 0 && lineType !== bufferType && (lineType !== "text" || bufferType !== "text")) {
            flushBuffer();
        }

        buffer.push(line);
        bufferType = lineType;
    }

    flushBuffer();

    return blocks;
}

function getMarkdownLineType(line: string) {
    if (UNORDERED_LIST_ITEM_PATTERN.test(line)) return "unordered-list";
    if (ORDERED_LIST_ITEM_PATTERN.test(line)) return "ordered-list";
    if (BLOCKQUOTE_LINE_PATTERN.test(line)) return "blockquote";

    return "text";
}

function renderBlock(block: string, index: number, heading?: MarkdownHeading) {
    const imageMatch = block.match(IMAGE_BLOCK_PATTERN);

    if (imageMatch) {
        const [, alt, url] = imageMatch;

        return (
            <figure key={index} className="my-7">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={url}
                    alt={alt}
                    className="aspect-[16/9] w-full rounded-lg border border-border object-cover"
                    loading="lazy"
                    decoding="async"
                />
                {alt && (
                    <figcaption className="mt-2 text-center text-xs text-muted">
                        {alt}
                    </figcaption>
                )}
            </figure>
        );
    }

    const headingMatch = block.match(HEADING_PATTERN);

    if (headingMatch && heading) {
        const title = headingMatch[2];
        const commonClassName = "scroll-mt-24 font-display font-extrabold text-white";

        if (heading.level === 1) {
            return (
                <h1 id={heading.id} key={index} className={`${commonClassName} pt-5 text-3xl leading-tight`}>
                    {renderInline(title)}
                </h1>
            );
        }

        if (heading.level === 2) {
            return (
                <h2 id={heading.id} key={index} className={`${commonClassName} pt-4 text-2xl leading-tight`}>
                    {renderInline(title)}
                </h2>
            );
        }

        return (
            <h3 id={heading.id} key={index} className={`${commonClassName} pt-2 text-xl leading-snug`}>
                {renderInline(title)}
            </h3>
        );
    }

    if (HORIZONTAL_RULE_PATTERN.test(block)) {
        return <hr key={index} className="my-8 border-border-strong" />;
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

    const list = parseList(lines);

    if (list) {
        const ListTag = list.ordered ? "ol" : "ul";

        return (
            <ListTag
                key={index}
                className={[
                    list.ordered ? "list-decimal" : "list-disc",
                    "space-y-2 pl-6 text-base leading-8 text-muted marker:text-amber",
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
            <blockquote
                key={index}
                className="border-l-2 border-amber bg-amber-wash px-5 py-4 text-base italic leading-8 text-offwhite"
            >
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
            .filter((row) => row.some(Boolean)),
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

function renderInline(value: string): ReactNode {
    const tokenPattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\*[^*\n]+\*|_[^_\n]+_|\[[^\]]+\]\([^)\s]+\))/g;
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(value)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(value.slice(lastIndex, match.index));
        }

        nodes.push(renderInlineToken(match[0], nodes.length));
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < value.length) {
        nodes.push(value.slice(lastIndex));
    }

    return nodes.length > 0 ? nodes : value;
}

function renderInlineToken(token: string, key: number): ReactNode {
    if (token.startsWith("`") && token.endsWith("`")) {
        return (
            <code key={key} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-amber-3">
                {token.slice(1, -1)}
            </code>
        );
    }

    if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) {
        return <strong key={key} className="font-bold text-offwhite">{renderInline(token.slice(2, -2))}</strong>;
    }

    if (token.startsWith("~~") && token.endsWith("~~")) {
        return <del key={key}>{renderInline(token.slice(2, -2))}</del>;
    }

    if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) {
        return <em key={key}>{renderInline(token.slice(1, -1))}</em>;
    }

    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);

    if (linkMatch) {
        return renderLink(linkMatch[1], linkMatch[2], key);
    }

    return token;
}

function renderLink(text: string, href: string, key: number) {
    if (href.startsWith("/")) {
        return (
            <Link key={key} href={href} prefetch={false} className="font-semibold text-amber underline-offset-4 hover:underline">
                {renderInline(text)}
            </Link>
        );
    }

    if (/^(https?:\/\/|mailto:|tel:)/.test(href)) {
        return (
            <a
                key={key}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="font-semibold text-amber underline-offset-4 hover:underline"
            >
                {renderInline(text)}
            </a>
        );
    }

    return text;
}

function stripInlineMarkdown(value: string) {
    return value
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[*_~`]/g, "")
        .replace(/<[^>]+>/g, "")
        .trim();
}

function createUniqueHeadingId(text: string, usedIds: Map<string, number>) {
    const base = text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[đĐ]/g, "d")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "section";
    const count = (usedIds.get(base) ?? 0) + 1;

    usedIds.set(base, count);

    return count === 1 ? base : `${base}-${count}`;
}
