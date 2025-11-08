import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Headphones } from 'lucide-react';
import type { Post } from '@/lib/posts';

interface BlogCardProps {
  post: Post;
}

export function BlogCard({ post }: BlogCardProps) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <Card className="group hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold group-hover:text-primary transition-colors text-balance leading-tight">
              {post.title}
            </h2>
            {post.audioUrl && (
              <Headphones className="w-5 h-5 sm:w-6 sm:h-6 text-secondary flex-shrink-0 mt-1" />
            )}
          </div>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed text-pretty">
            {post.description}
          </p>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-2">
            {post.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs sm:text-sm px-3 py-1">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground pt-4 border-t border-border/50">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{post.readTime}</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
