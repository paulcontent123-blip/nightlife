interface ArticleEditorGuideProps {
    onClose: () => void;
}

interface EditorToolGuide {
    button: string;
    purpose: string;
    action: string;
    markdown: string;
    html: string;
}

const TOOL_GUIDES: EditorToolGuide[] = [
    {
        button: "H1",
        purpose: "Tạo tiêu đề cấp 1.",
        action: "Đặt con trỏ trong dòng tiêu đề rồi bấm H1.",
        markdown: "# Tiêu đề",
        html: "<h1>",
    },
    {
        button: "H2",
        purpose: "Tạo tiêu đề phần chính và mục trong mục lục.",
        action: "Đặt con trỏ trong dòng tiêu đề rồi bấm H2.",
        markdown: "## Tiêu đề phần",
        html: "<h2>",
    },
    {
        button: "H3",
        purpose: "Tạo tiêu đề con bên trong một phần H2.",
        action: "Đặt con trỏ trong dòng tiêu đề rồi bấm H3.",
        markdown: "### Tiêu đề con",
        html: "<h3>",
    },
    {
        button: "B",
        purpose: "In đậm từ hoặc đoạn văn quan trọng.",
        action: "Bôi đen nội dung rồi bấm B hoặc nhấn Ctrl+B.",
        markdown: "**Nội dung**",
        html: "<strong>",
    },
    {
        button: "I",
        purpose: "In nghiêng từ hoặc cụm từ.",
        action: "Bôi đen nội dung rồi bấm I hoặc nhấn Ctrl+I.",
        markdown: "*Nội dung*",
        html: "<em>",
    },
    {
        button: "</>",
        purpose: "Định dạng mã hoặc tên kỹ thuật nằm trong dòng.",
        action: "Bôi đen nội dung rồi bấm nút mã.",
        markdown: "`Nội dung`",
        html: "<code>",
    },
    {
        button: "Link",
        purpose: "Gắn liên kết nội bộ hoặc liên kết ngoài.",
        action: "Bôi đen chữ, bấm Link, nhập URL rồi chọn Chèn.",
        markdown: "[Tên link](https://...) ",
        html: "<a>",
    },
    {
        button: "List",
        purpose: "Tạo danh sách không đánh số.",
        action: "Chọn một hoặc nhiều dòng rồi bấm List.",
        markdown: "- Mục danh sách",
        html: "<ul><li>",
    },
    {
        button: "1. List",
        purpose: "Tạo danh sách có thứ tự.",
        action: "Chọn một hoặc nhiều dòng rồi bấm 1. List.",
        markdown: "1. Mục danh sách",
        html: "<ol><li>",
    },
    {
        button: "Quote",
        purpose: "Tạo đoạn trích dẫn hoặc ghi chú nổi bật.",
        action: "Chọn đoạn cần trích dẫn rồi bấm Quote.",
        markdown: "> Nội dung trích dẫn",
        html: "<blockquote>",
    },
    {
        button: "Bảng",
        purpose: "Chèn bảng dữ liệu mẫu gồm ba cột.",
        action: "Đặt con trỏ ở vị trí cần chèn rồi bấm Bảng; sửa tên cột và dữ liệu.",
        markdown: "| Cột 1 | Cột 2 | Cột 3 |",
        html: "<table>",
    },
    {
        button: "HR",
        purpose: "Tạo đường phân cách giữa hai phần nội dung.",
        action: "Đặt con trỏ ở vị trí cần ngắt rồi bấm HR.",
        markdown: "---",
        html: "<hr>",
    },
    {
        button: "Tải ảnh",
        purpose: "Tải ảnh lên Cloudinary và chèn vào nội dung.",
        action: "Đặt con trỏ đúng vị trí, bấm Tải ảnh rồi chọn tối đa 10 ảnh từ máy.",
        markdown: "![ALT ảnh](URL ảnh)",
        html: "<img>",
    },
];

const EDITOR_MODES = [
    {
        name: "Soạn thảo",
        description: "Hiển thị vùng Markdown để nhập và chỉnh sửa nội dung.",
    },
    {
        name: "Xem trước",
        description: "Hiển thị bài viết sau khi Markdown được chuyển thành giao diện đọc.",
    },
    {
        name: "Chia đôi",
        description: "Hiển thị vùng soạn thảo và bản xem trước cạnh nhau để đối chiếu.",
    },
];

export function ArticleEditorGuide({ onClose }: ArticleEditorGuideProps) {
    return (
        <section
            id="article-editor-guide"
            aria-labelledby="article-editor-guide-title"
            className="overflow-hidden rounded-lg border border-amber/40 bg-void-2"
        >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-amber/5 px-4 py-3 sm:px-5">
                <div>
                    <p className="mb-1 text-[10.5px] font-bold uppercase text-amber">Trình soạn thảo Markdown</p>
                    <h2 id="article-editor-guide-title" className="font-display text-base font-bold text-white">
                        Hướng dẫn sử dụng các nút định dạng
                    </h2>
                    <p className="mt-1 max-w-3xl text-xs leading-5 text-muted">
                        Các nút sẽ tạo cú pháp Markdown; trang bài viết tự chuyển cú pháp đó thành thẻ HTML tương ứng.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="h-8 rounded-md border border-border-strong px-3 text-xs font-bold text-muted hover:border-amber hover:text-white"
                    aria-label="Đóng hướng dẫn sử dụng"
                >
                    Đóng
                </button>
            </div>

            <div className="grid gap-px border-b border-border bg-border md:grid-cols-3">
                <QuickRule title="Định dạng chữ" detail="Bôi đen nội dung trước khi dùng B, I, mã hoặc Link." />
                <QuickRule title="Định dạng dòng" detail="Đặt con trỏ trong dòng hoặc chọn nhiều dòng trước khi dùng heading và list." />
                <QuickRule title="Chèn nội dung" detail="Đặt con trỏ đúng vị trí trước khi chèn bảng, HR hoặc tải ảnh." />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-collapse text-left text-xs">
                    <thead className="bg-void-3 text-[10.5px] uppercase text-muted">
                        <tr>
                            <th className="w-24 px-4 py-3 font-bold">Nút</th>
                            <th className="w-52 px-4 py-3 font-bold">Công dụng</th>
                            <th className="px-4 py-3 font-bold">Cách sử dụng</th>
                            <th className="w-52 px-4 py-3 font-bold">Markdown tạo ra</th>
                            <th className="w-28 px-4 py-3 font-bold">Thẻ HTML</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {TOOL_GUIDES.map((tool) => (
                            <tr key={tool.button} className="align-top hover:bg-white/[0.025]">
                                <td className="px-4 py-3">
                                    <span className="inline-flex min-h-7 min-w-8 items-center justify-center rounded-md border border-border-strong bg-void-3 px-2 font-bold text-offwhite">
                                        {tool.button}
                                    </span>
                                </td>
                                <td className="px-4 py-3 leading-5 text-offwhite">{tool.purpose}</td>
                                <td className="px-4 py-3 leading-5 text-muted">{tool.action}</td>
                                <td className="px-4 py-3">
                                    <code className="break-words rounded bg-void-3 px-1.5 py-1 text-[11px] text-cyan">
                                        {tool.markdown}
                                    </code>
                                </td>
                                <td className="px-4 py-3">
                                    <code className="text-[11px] text-amber">{tool.html}</code>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="border-t border-border px-4 py-4 sm:px-5">
                <h3 className="text-xs font-bold uppercase text-offwhite">Chế độ hiển thị</h3>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {EDITOR_MODES.map((mode) => (
                        <div key={mode.name} className="min-w-0 border-l-2 border-amber pl-3">
                            <p className="text-xs font-bold text-white">{mode.name}</p>
                            <p className="mt-1 text-xs leading-5 text-muted">{mode.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function QuickRule({ title, detail }: { title: string; detail: string }) {
    return (
        <div className="min-w-0 bg-void-2 px-4 py-3 sm:px-5">
            <p className="text-xs font-bold text-white">{title}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
        </div>
    );
}
