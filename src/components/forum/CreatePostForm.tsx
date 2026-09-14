"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { clientFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/envelope";
import { Button } from "@/components/ui/Button";
import { FieldGroup, Input, Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { CITY_LABEL } from "@/lib/format";

export function CreatePostForm() {
    const t = useTranslations("Forum");
    const navigationT = useTranslations("Navigation");
    const router = useRouter();
    const searchParams = useSearchParams();
    const venueId = searchParams.get("venue_id") ?? undefined;
    const venueName = searchParams.get("venue_name") ?? undefined;

    const [expanded, setExpanded] = useState(searchParams.get("compose") === "1");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [city, setCity] = useState("");
    const [tags, setTags] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [requiresLogin, setRequiresLogin] = useState(false);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setRequiresLogin(false);

        try {
            await clientFetch("/api/v1/forum/posts", {
                method: "POST",
                body: JSON.stringify({
                    title,
                    content,
                    city: city || undefined,
                    tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
                    venue_id: venueId,
                }),
            });

            setTitle("");
            setContent("");
            setCity("");
            setTags("");
            setExpanded(false);
            router.refresh();
        } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
                setRequiresLogin(true);
            } else {
                setError(err instanceof ApiError ? err.message : t("postError"));
            }
        } finally {
            setLoading(false);
        }
    }

    if (!expanded) {
        return (
            <button
                type="button"
                onClick={() => setExpanded(true)}
                className="w-full rounded-xl border-[1.5px] border-dashed border-border-heavy p-4 text-left text-sm text-muted transition-colors hover:border-amber hover:text-amber"
            >
                + {venueName ? t("composeVenue", { venueName }) : t("compose")}
            </button>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-void-2 p-4 sm:p-5">
            {venueName && (
                <div className="flex items-center gap-1.5 self-start rounded-md bg-amber-wash px-2.5 py-1 text-xs font-semibold text-amber">
                    {t("writingAbout", { venueName })}
                </div>
            )}
            <FieldGroup label={t("postTitle")}>
                <Input
                    required
                    minLength={3}
                    maxLength={160}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={t("titlePlaceholder")}
                />
            </FieldGroup>
            <FieldGroup label={t("postContent")}>
                <Textarea
                    required
                    maxLength={5000}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    className="min-h-28"
                />
            </FieldGroup>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FieldGroup label={t("optionalCity")}>
                    <Select value={city} onChange={(event) => setCity(event.target.value)}>
                        <option value="">{t("selectCity")}</option>
                        {Object.entries(CITY_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </Select>
                </FieldGroup>
                <FieldGroup label={t("tagsLabel")}>
                    <Input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="rooftop, Q1, group" />
                </FieldGroup>
            </div>

            {requiresLogin && (
                <Alert>
                    {t("loginRequired")} {" "}
                    <a href="/login?next=/forum" className="font-semibold underline">
                        {navigationT("login")}
                    </a>{" "}
                </Alert>
            )}
            {error && <Alert>{error}</Alert>}

            <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                    {loading ? t("posting") : t("publish")}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setExpanded(false)}>
                    {t("cancel")}
                </Button>
            </div>
        </form>
    );
}
