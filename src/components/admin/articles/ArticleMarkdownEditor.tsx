"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import type { ArticleImageUploadResult } from "@/lib/api/types";
import { MarkdownContent } from "@/components/articles/MarkdownContent";

type EditorMode = "write" | "preview" | "split";

interface TextSelection {
    start: number;
    end: number;
}

interface ArticleMarkdownEditorProps {
    value: string;
    articleTitle: string;
    onChange: (value: string) => void;
    onError: (message: string | null) => void;
    onUploadingChange?: (uploading: boolean) => void;
}

const MAX_IMAGE_FILES = 10;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export function ArticleMarkdownEditor({
    value,
    articleTitle,
    onChange,
    onError,
    onUploadingChange,
}: ArticleMarkdownEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const selectionRef = useRef<TextSelection>({ start: 0, end: 0 });
    const linkSelectionRef = useRef<TextSelection>({ start: 0, end: 0 });
    const [mode, setMode] = useState<EditorMode>("write");
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const [showLinkEditor, setShowLinkEditor] = useState(false);
    const [linkText, setLinkText] = useState("");
    const [linkUrl, setLinkUrl] = useState("");
    const stats = useMemo(() => {
        const trimmed = value.trim();
        const words = trimmed ? trimmed.split(/\s+/).length : 0;

        return {
            words,
            characters: value.length,
            minutes: Math.max(1, Math.ceil(words / 220)),
        };
    }, [value]);

    function rememberSelection() {
        const textarea = textareaRef.current;

        if (textarea) {
            selectionRef.current = {
                start: textarea.selectionStart,
                end: textarea.selectionEnd,
            };
        }

        return selectionRef.current;
    }

    function replaceRange(
        range: TextSelection,
        replacement: string,
        selectedStart = replacement.length,
        selectedEnd = selectedStart
    ) {
        const nextValue = `${value.slice(0, range.start)}${replacement}${value.slice(range.end)}`;
        const nextSelection = {
            start: range.start + selectedStart,
            end: range.start + selectedEnd,
        };

        selectionRef.current = nextSelection;
        onChange(nextValue);

        requestAnimationFrame(() => {
            const textarea = textareaRef.current;

            if (!textarea) return;

            textarea.focus();
            textarea.setSelectionRange(nextSelection.start, nextSelection.end);
        });
    }

    function wrapSelection(prefix: string, suffix: string, placeholder: string) {
        const range = rememberSelection();
        const selected = value.slice(range.start, range.end) || placeholder;
        const replacement = `${prefix}${selected}${suffix}`;

        replaceRange(range, replacement, prefix.length, prefix.length + selected.length);
    }

    function applyLineFormat(kind: "h1" | "h2" | "h3" | "bullet" | "ordered" | "quote") {
        const range = rememberSelection();
        const lineStart = value.lastIndexOf("\n", Math.max(0, range.start - 1)) + 1;
        const nextLineBreak = value.indexOf("\n", range.end);
        const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
        const selectedBlock = value.slice(lineStart, lineEnd);
        const source = selectedBlock || defaultLineText(kind);
        const replacement = source.split("\n").map((line, index) => {
            const content = stripExistingLinePrefix(line) || defaultLineText(kind);

            if (kind === "ordered") {
                return `${index + 1}. ${content}`;
            }

            const prefix = {
                h1: "# ",
                h2: "## ",
                h3: "### ",
                bullet: "- ",
                quote: "> ",
            }[kind];

            return `${prefix}${content}`;
        }).join("\n");

        replaceRange({ start: lineStart, end: lineEnd }, replacement, 0, replacement.length);
    }

    function insertBlock(block: string, range = rememberSelection()) {
        const before = value.slice(0, range.start);
        const after = value.slice(range.end);
        const leadingBreak = before.length === 0 || before.endsWith("\n\n")
            ? ""
            : before.endsWith("\n") ? "\n" : "\n\n";
        const trailingBreak = after.length === 0 || after.startsWith("\n\n")
            ? ""
            : after.startsWith("\n") ? "\n" : "\n\n";
        const replacement = `${leadingBreak}${block.trim()}${trailingBreak}`;

        replaceRange(range, replacement);
    }

    function openLinkForm() {
        const range = rememberSelection();

        linkSelectionRef.current = range;
        setLinkText(value.slice(range.start, range.end));
        setLinkUrl("");
        setShowLinkEditor(true);
    }

    function insertLink() {
        const rawUrl = linkUrl.trim();

        if (!rawUrl) {
            onError("Vui lòng nhập đường dẫn cần chèn.");
            return;
        }

        const normalizedUrl = /^(https?:\/\/|\/|mailto:|tel:)/.test(rawUrl)
            ? rawUrl
            : `https://${rawUrl}`;
        const label = linkText.trim() || normalizedUrl;
        const markdown = `[${label}](${normalizedUrl})`;

        replaceRange(linkSelectionRef.current, markdown, markdown.length, markdown.length);
        setShowLinkEditor(false);
        setLinkText("");
        setLinkUrl("");
        onError(null);
    }

    function openImagePicker() {
        rememberSelection();
        imageInputRef.current?.click();
    }

    async function uploadSelectedImages(files: FileList | null) {
        if (!files || files.length === 0) return;

        if (files.length > MAX_IMAGE_FILES) {
            onError(`Mỗi lần chỉ được tải tối đa ${MAX_IMAGE_FILES} ảnh.`);
            resetImageInput();
            return;
        }

        const selectedFiles = Array.from(files);
        const invalidFile = selectedFiles.find((file) => !file.type.startsWith("image/") || file.size > MAX_IMAGE_SIZE_BYTES);

        if (invalidFile) {
            onError(`Ảnh ${invalidFile.name} không hợp lệ hoặc lớn hơn 10 MB.`);
            resetImageInput();
            return;
        }

        const insertionRange = selectionRef.current;
        const uploadedImages: ArticleImageUploadResult[] = [];
        const failedFiles: string[] = [];
        let firstUploadError: string | null = null;

        setUploading(true);
        onUploadingChange?.(true);
        onError(null);

        for (let index = 0; index < selectedFiles.length; index += 1) {
            const file = selectedFiles[index];
            setUploadProgress(`Đang tải ${index + 1}/${selectedFiles.length}`);

            try {
                const formData = new FormData();
                formData.append("image", file);
                formData.append("alt", createImageAlt(articleTitle, file.name, index, selectedFiles.length));

                const image = await clientFetch<ArticleImageUploadResult>("/api/v1/admin/bai-viet/images", {
                    method: "POST",
                    body: formData,
                });

                uploadedImages.push(image);
            } catch (caughtError) {
                failedFiles.push(file.name);

                if (!firstUploadError && caughtError instanceof ApiError) {
                    firstUploadError = caughtError.message;
                }
            }
        }

        if (uploadedImages.length > 0) {
            insertBlock(uploadedImages.map((image) => image.markdown).join("\n\n"), insertionRange);
        }

        if (failedFiles.length > 0) {
            onError(firstUploadError ?? `Không tải được ${failedFiles.length} ảnh: ${failedFiles.join(", ")}.`);
        }

        setUploading(false);
        setUploadProgress("");
        onUploadingChange?.(false);
        resetImageInput();
    }

    function resetImageInput() {
        if (imageInputRef.current) {
            imageInputRef.current.value = "";
        }
    }

    function handleEditorShortcut(event: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (!(event.ctrlKey || event.metaKey)) return;

        const key = event.key.toLowerCase();

        if (key === "b") {
            event.preventDefault();
            wrapSelection("**", "**", "văn bản in đậm");
        }

        if (key === "i") {
            event.preventDefault();
            wrapSelection("*", "*", "văn bản in nghiêng");
        }

        if (key === "k") {
            event.preventDefault();
            openLinkForm();
        }
    }

    const showEditor = mode === "write" || mode === "split";
    const showPreview = mode === "preview" || mode === "split";

    return (
        <section className="overflow-hidden rounded-lg border border-border-strong bg-void-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2.5">
                <div className="flex rounded-md border border-border bg-void-3 p-0.5" aria-label="Chế độ soạn thảo">
                    <ModeButton active={mode === "write"} onClick={() => setMode("write")}>Soạn thảo</ModeButton>
                    <ModeButton active={mode === "preview"} onClick={() => setMode("preview")}>Xem trước</ModeButton>
                    <ModeButton active={mode === "split"} onClick={() => setMode("split")}>Chia đôi</ModeButton>
                </div>
                <div className="text-xs text-muted">
                    {stats.words} từ · {stats.minutes} phút đọc
                </div>
            </div>

            {showEditor && (
                <>
                    <div
                        role="toolbar"
                        aria-label="Định dạng nội dung bài viết"
                        className="flex min-h-11 flex-wrap items-center gap-1 border-b border-border bg-void-3 px-2 py-1.5"
                    >
                        <ToolbarButton title="Tiêu đề H1" onClick={() => applyLineFormat("h1")}>H1</ToolbarButton>
                        <ToolbarButton title="Tiêu đề H2" onClick={() => applyLineFormat("h2")}>H2</ToolbarButton>
                        <ToolbarButton title="Tiêu đề H3" onClick={() => applyLineFormat("h3")}>H3</ToolbarButton>
                        <ToolbarDivider />
                        <ToolbarButton title="In đậm (Ctrl+B)" onClick={() => wrapSelection("**", "**", "văn bản in đậm")}>
                            <strong>B</strong>
                        </ToolbarButton>
                        <ToolbarButton title="In nghiêng (Ctrl+I)" onClick={() => wrapSelection("*", "*", "văn bản in nghiêng")}>
                            <em>I</em>
                        </ToolbarButton>
                        <ToolbarButton title="Mã nội tuyến" onClick={() => wrapSelection("`", "`", "nội dung")}>{"</>"}</ToolbarButton>
                        <ToolbarButton title="Chèn liên kết (Ctrl+K)" onClick={openLinkForm}>Link</ToolbarButton>
                        <ToolbarDivider />
                        <ToolbarButton title="Danh sách dấu đầu dòng" onClick={() => applyLineFormat("bullet")}>List</ToolbarButton>
                        <ToolbarButton title="Danh sách đánh số" onClick={() => applyLineFormat("ordered")}>1. List</ToolbarButton>
                        <ToolbarButton title="Trích dẫn" onClick={() => applyLineFormat("quote")}>Quote</ToolbarButton>
                        <ToolbarButton
                            title="Chèn bảng 3 cột"
                            onClick={() => insertBlock("| Cột 1 | Cột 2 | Cột 3 |\n| --- | --- | --- |\n| Nội dung | Nội dung | Nội dung |")}
                        >
                            Bảng
                        </ToolbarButton>
                        <ToolbarButton title="Đường phân cách" onClick={() => insertBlock("---")}>HR</ToolbarButton>
                        <ToolbarDivider />
                        <ToolbarButton title="Chọn và tải ảnh từ máy" disabled={uploading} onClick={openImagePicker} wide>
                            {uploading ? uploadProgress : "Tải ảnh"}
                        </ToolbarButton>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={uploading}
                            onChange={(event) => void uploadSelectedImages(event.target.files)}
                        />
                    </div>

                    {showLinkEditor && (
                        <div className="grid gap-2 border-b border-border bg-void-3 px-3 py-3 sm:grid-cols-[minmax(120px,.8fr)_minmax(180px,1.2fr)_auto]">
                            <input
                                value={linkText}
                                onChange={(event) => setLinkText(event.target.value)}
                                placeholder="Nội dung liên kết"
                                className="h-9 min-w-0 rounded-md border border-border-strong bg-void-2 px-3 text-sm text-white outline-none focus:border-amber"
                            />
                            <input
                                value={linkUrl}
                                onChange={(event) => setLinkUrl(event.target.value)}
                                placeholder="https://... hoặc /duong-dan"
                                className="h-9 min-w-0 rounded-md border border-border-strong bg-void-2 px-3 text-sm text-white outline-none focus:border-amber"
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        insertLink();
                                    }
                                }}
                            />
                            <div className="flex gap-2">
                                <button type="button" className="h-9 rounded-md bg-amber px-3 text-xs font-bold text-void" onClick={insertLink}>
                                    Chèn
                                </button>
                                <button type="button" className="h-9 px-2 text-xs font-semibold text-muted hover:text-white" onClick={() => setShowLinkEditor(false)}>
                                    Hủy
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className={mode === "split" ? "grid lg:grid-cols-2" : ""}>
                {showEditor && (
                    <textarea
                        ref={textareaRef}
                        required
                        value={value}
                        disabled={uploading}
                        onChange={(event) => onChange(event.target.value)}
                        onSelect={rememberSelection}
                        onClick={rememberSelection}
                        onKeyUp={rememberSelection}
                        onKeyDown={handleEditorShortcut}
                        className="min-h-[560px] w-full resize-y bg-void-2 px-5 py-4 font-mono text-sm leading-7 text-offwhite outline-none placeholder:text-muted-2 disabled:opacity-60"
                        placeholder={"Bắt đầu nội dung bài viết...\n\n## Tiêu đề phần\n\nNội dung bài viết"}
                    />
                )}
                {showPreview && (
                    <div className={`min-h-[560px] overflow-y-auto bg-void-2 px-5 py-4 ${mode === "split" ? "border-t border-border lg:border-l lg:border-t-0" : ""}`}>
                        {value.trim() ? (
                            <MarkdownContent content={value} />
                        ) : (
                            <p className="text-sm text-muted">Nội dung xem trước sẽ hiển thị tại đây.</p>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t border-border px-3 py-2 text-xs text-muted">
                <span>Markdown</span>
                <span>{stats.characters.toLocaleString("vi-VN")} ký tự</span>
            </div>
        </section>
    );
}

function ToolbarButton({
    children,
    title,
    onClick,
    disabled = false,
    wide = false,
}: {
    children: ReactNode;
    title: string;
    onClick: () => void;
    disabled?: boolean;
    wide?: boolean;
}) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            className={[
                "flex h-8 items-center justify-center rounded-md border border-transparent px-2 text-xs font-semibold text-muted transition-colors hover:border-border-strong hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
                wide ? "min-w-20" : "min-w-8",
            ].join(" ")}
        >
            {children}
        </button>
    );
}

function ToolbarDivider() {
    return <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border-strong" />;
}

function ModeButton({ children, active, onClick }: { children: ReactNode; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                "h-7 rounded px-2.5 text-xs font-semibold transition-colors",
                active ? "bg-amber text-void" : "text-muted hover:text-white",
            ].join(" ")}
        >
            {children}
        </button>
    );
}

function stripExistingLinePrefix(value: string) {
    return value.replace(/^\s*(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s?)/, "").trim();
}

function defaultLineText(kind: "h1" | "h2" | "h3" | "bullet" | "ordered" | "quote") {
    if (kind === "bullet" || kind === "ordered") return "Mục danh sách";
    if (kind === "quote") return "Nội dung trích dẫn";

    return "Tiêu đề";
}

function createImageAlt(title: string, fileName: string, index: number, total: number) {
    const fileLabel = fileName.replace(/\.[a-zA-Z0-9]+$/, "").replace(/[-_]+/g, " ").trim();
    const base = title.trim() || fileLabel || "Ảnh bài viết";

    return total > 1 ? `${base} ${index + 1}` : base;
}
