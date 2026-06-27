import Link from 'next/link';
import type { Post } from '@/lib/posts';

interface BlogCardProps {
  post: Post;
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex min-h-[290px] flex-col border border-dashed border-border p-6 text-foreground no-underline transition-colors hover:bg-[var(--hover)] sm:p-7"
    >
      <div className="flex items-start justify-between gap-5">
        <h2 className="display-heading max-w-[82%] text-[clamp(1.35rem,2.5vw,1.8rem)] leading-[1.12] transition-colors group-hover:text-foreground">
          {post.title}
        </h2>
        {post.audioUrl && (
          <span className="shrink-0 pt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            audio
          </span>
        )}
      </div>

      <p className="mt-auto pt-7 text-[13px] leading-[1.65] text-foreground">{post.description}</p>

      <div className="mt-5 flex justify-between gap-4 text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
        <time dateTime={post.publishedAt}>
          {new Date(post.publishedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </time>
        <span>{post.readTime.replace(' read', '')}</span>
      </div>
    </Link>
  );
}
