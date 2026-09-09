import Link from "next/link";
import type { ArticleListItem } from "@/lib/api/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ARTICLE_CATEGORY_LABEL } from "@/lib/format";
import { getOptimizedCloudinaryImageUrl } from "@/lib/cloudinary/image-url";

export function ArticleCard({ article, priority = false }: { article: ArticleListItem; priority?: boolean }) {
    const imageUrl = getOptimizedCloudinaryImageUrl(article.seo.og_image_url);

    return (
        <Link href={`/bai-viet/${article.slug}`} prefetch={false} className="group block h-full">
            <Card className="flex h-full flex-col overflow-hidden transition-colors group-hover:border-amber-border">
                {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={imageUrl}
                        alt={article.title}
                        width={640}
                        height={360}
                        loading={priority ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={priority ? "high" : "low"}
                        className="h-44 w-full object-cover"
                    />
                ) : (
                    <div className="flex h-44 items-center justify-center bg-void-3 text-xs font-semibold uppercase tracking-wide text-muted">
                        Nightlife.vn
                    </div>
                )}
                <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex flex-wrap gap-1.5">
                        <Badge tone={article.is_featured ? "amber" : "gray"}>
                            {ARTICLE_CATEGORY_LABEL[article.category] ?? article.category}
                        </Badge>
                        {article.city && <Badge tone="cyan">{article.city}</Badge>}
                    </div>
                    <div>
                        <h2 className="font-display text-lg font-extrabold leading-snug text-white group-hover:text-amber">
                            {article.title}
                        </h2>
                        {article.excerpt && (
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                                {article.excerpt}
                            </p>
                        )}
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-muted-2">
                        <span>{article.reading_time_minutes} phút đọc</span>
                        <span>{article.view_count} lượt xem</span>
                    </div>
                </div>
            </Card>
        </Link>
    );
}
