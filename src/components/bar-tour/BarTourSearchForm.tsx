"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FieldGroup, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { CITY_LABEL } from "@/lib/format";

const PRICE_RANGES = ["$", "$$", "$$$", "$$$$"];

export function BarTourSearchForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
    const [city, setCity] = useState(searchParams.get("city") ?? "");
    const [district, setDistrict] = useState(searchParams.get("district") ?? "");
    const [priceRange, setPriceRange] = useState(searchParams.get("price_range") ?? "");
    const [partySize, setPartySize] = useState(searchParams.get("party_size") ?? "");

    function handleSubmit(event: FormEvent) {
        event.preventDefault();

        const next = new URLSearchParams();

        if (keyword) next.set("keyword", keyword);
        if (city) next.set("city", city);
        if (district) next.set("district", district);
        if (priceRange) next.set("price_range", priceRange);
        if (partySize) next.set("party_size", partySize);

        router.push(`/bar-tour?${next.toString()}`);
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-void-2 p-5">
            <FieldGroup label="Bạn muốn đi chơi kiểu gì?">
                <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="rooftop, sinh nhật, edm, hẹn hò, happy hour..."
                />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <FieldGroup label="Thành phố">
                    <Select value={city} onChange={(event) => setCity(event.target.value)}>
                        <option value="">Tất cả</option>
                        {Object.entries(CITY_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </Select>
                </FieldGroup>
                <FieldGroup label="Quận">
                    <Input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="Quận 1" />
                </FieldGroup>
                <FieldGroup label="Mức giá">
                    <Select value={priceRange} onChange={(event) => setPriceRange(event.target.value)}>
                        <option value="">Tất cả</option>
                        {PRICE_RANGES.map((price) => (
                            <option key={price} value={price}>
                                {price}
                            </option>
                        ))}
                    </Select>
                </FieldGroup>
                <FieldGroup label="Số người">
                    <Input
                        type="number"
                        min={1}
                        value={partySize}
                        onChange={(event) => setPartySize(event.target.value)}
                        placeholder="4"
                    />
                </FieldGroup>
            </div>
            <Button type="submit" className="self-start">
                🔮 Gợi ý lịch trình
            </Button>
        </form>
    );
}
