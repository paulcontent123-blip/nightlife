"use client";

import { useState, type FormEvent } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const REQUEST_TYPES = [
    {
        id: "booking",
        icon: "🍽️",
        title: "Đặt bàn ngay",
        description: "Chọn venue, ngày giờ và số người — xác nhận trong 5 phút",
        optionLabel: "Đặt bàn nhóm lớn (10+)",
    },
    {
        id: "corporate",
        icon: "🏢",
        title: "Corporate Event",
        description: "Team building, year-end party, client dinner — chúng tôi lo toàn bộ",
        optionLabel: "Corporate Event",
    },
    {
        id: "venue_partner",
        icon: "🎭",
        title: "Đưa venue lên Nightlife",
        description: "Chủ bar/club đăng ký để tiếp cận 48K+ lượt đặt bàn/tháng",
        optionLabel: "Đưa venue lên Nightlife",
    },
    {
        id: "advertising",
        icon: "📡",
        title: "Advertising & Partnership",
        description: "Brand muốn tiếp cận cộng đồng nightlife — content, events, ads",
        optionLabel: "Advertising & Partnership",
    },
];

export default function LienHePage() {
    const [requestType, setRequestType] = useState(REQUEST_TYPES[0].id);
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [description, setDescription] = useState("");
    const [submitted, setSubmitted] = useState(false);

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        // No backend wired yet for this flow — the tech lead hasn't confirmed
        // where these requests should be routed. This is UI-only for now.
        setSubmitted(true);
    }

    return (
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-10">
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
                <div>
                    <SectionHeading
                        tag="Hợp tác & Đặt bàn"
                        title={
                            <>
                                Bắt đầu đêm
                                <br />
                                <em className="not-italic text-amber">theo cách của bạn</em>
                            </>
                        }
                    />

                    <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {REQUEST_TYPES.map((type) => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => setRequestType(type.id)}
                                className={[
                                    "rounded-xl border-[1.5px] p-4 text-left transition-colors",
                                    requestType === type.id
                                        ? "border-amber-border bg-amber-wash"
                                        : "border-border bg-void-2 hover:border-border-heavy",
                                ].join(" ")}
                            >
                                <span className="mb-2 block text-2xl">{type.icon}</span>
                                <p className="font-display text-sm font-bold text-white">{type.title}</p>
                                <p className="mt-1 text-xs leading-relaxed text-muted">{type.description}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-void-2 p-6 sm:p-8">
                    {submitted ? (
                        <Alert tone="success">
                            Đã ghi nhận yêu cầu của bạn! Đội ngũ Nightlife.vn sẽ liên hệ lại trong vòng 2 giờ.
                        </Alert>
                    ) : (
                        <>
                            <p className="mb-1.5 font-display text-xl font-extrabold">Liên hệ với chúng tôi</p>
                            <p className="mb-6 text-sm text-muted">Phản hồi trong 2 giờ · Hotline 24/7 cho đặt bàn khẩn</p>

                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FieldGroup label="Họ và tên">
                                        <Input
                                            required
                                            value={name}
                                            onChange={(event) => setName(event.target.value)}
                                            placeholder="Nguyễn Văn A"
                                        />
                                    </FieldGroup>
                                    <FieldGroup label="Điện thoại">
                                        <Input
                                            required
                                            type="tel"
                                            value={phone}
                                            onChange={(event) => setPhone(event.target.value)}
                                            placeholder="090 xxx xxxx"
                                        />
                                    </FieldGroup>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FieldGroup label="Email">
                                        <Input
                                            required
                                            type="email"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            placeholder="contact@brand.vn"
                                        />
                                    </FieldGroup>
                                    <FieldGroup label="Loại yêu cầu">
                                        <Select value={requestType} onChange={(event) => setRequestType(event.target.value)}>
                                            {REQUEST_TYPES.map((type) => (
                                                <option key={type.id} value={type.id}>
                                                    {type.optionLabel}
                                                </option>
                                            ))}
                                        </Select>
                                    </FieldGroup>
                                </div>

                                <FieldGroup label="Mô tả">
                                    <Textarea
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        placeholder="Venue quan tâm, ngày giờ, số người, yêu cầu đặc biệt..."
                                        className="min-h-28"
                                    />
                                </FieldGroup>

                                <Button type="submit" size="lg">
                                    Gửi yêu cầu → Phản hồi trong 2h
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
