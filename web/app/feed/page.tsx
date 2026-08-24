import type { Metadata } from "next";
import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Pencil,
  SendHorizontal,
  Sparkles,
  Store,
  Trash2,
  UserRound,
} from "lucide-react";

import { signInWithGoogle } from "@/app/auth/actions";
import {
  createFeedComment,
  createFeedPost,
  deleteFeedComment,
  deleteFeedPost,
  toggleFeedPostLike,
  updateFeedComment,
  updateFeedPost,
} from "@/app/feed/actions";
import { BusinessLogo } from "@/components/business-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getFeedPosts, getOwnedFeedBusinesses, type FeedPost } from "@/lib/feed";
import { copy, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/supabase/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Feed",
  description: "Community updates from Kolo users and businesses.",
};

const text = {
  uk: {
    kicker: "Стрічка",
    title: "Що нового у спільноті",
    intro: "Короткі оновлення від користувачів і українських бізнесів у Канаді.",
    composerTitle: "Поділитися оновленням",
    composerPlaceholder: "Напишіть коротке повідомлення...",
    postAs: "Опублікувати як",
    postAsMe: "Мій профіль",
    publish: "Опублікувати",
    signInTitle: "Увійдіть, щоб писати, лайкати й коментувати",
    signIn: "Увійти",
    emptyTitle: "У стрічці ще тихо",
    emptyText: "Перші оновлення з'являться тут.",
    like: "Лайк",
    liked: "Вподобано",
    comments: "Коментарі",
    commentPlaceholder: "Напишіть коментар...",
    comment: "Коментувати",
    business: "Бізнес",
    user: "Користувач",
    errorPost: "Не вдалося опублікувати повідомлення.",
    errorComment: "Не вдалося додати коментар.",
    edit: "Редагувати",
    delete: "Видалити",
    save: "Зберегти",
    cancel: "Скасувати",
  },
  en: {
    kicker: "Feed",
    title: "What’s new in the community",
    intro: "Short updates from Kolo users and Ukrainian-owned businesses in Canada.",
    composerTitle: "Share an update",
    composerPlaceholder: "Write a short message...",
    postAs: "Post as",
    postAsMe: "My profile",
    publish: "Publish",
    signInTitle: "Sign in to post, like, and comment",
    signIn: "Sign in",
    emptyTitle: "The feed is quiet for now",
    emptyText: "The first updates will appear here.",
    like: "Like",
    liked: "Liked",
    comments: "Comments",
    commentPlaceholder: "Write a comment...",
    comment: "Comment",
    business: "Business",
    user: "User",
    errorPost: "Could not publish the post.",
    errorComment: "Could not add the comment.",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
  },
} satisfies Record<Locale, Record<string, string>>;

type FeedPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const locale = await getRequestLocale();
  const labels = text[locale];
  const common = copy[locale].common;
  const user = await getCurrentUser();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [posts, ownedBusinesses] = await Promise.all([
    getFeedPosts(),
    user ? getOwnedFeedBusinesses(user.id) : Promise.resolve([]),
  ]);

  return (
    <section className="container max-w-4xl py-8 md:py-12">
      <div className="mb-6 max-w-3xl">
        <Badge variant="accent">{labels.kicker}</Badge>
        <h1 className="mt-4 text-4xl font-black tracking-normal md:text-5xl">
          {labels.title}
        </h1>
        <p className="mt-3 text-muted-foreground">{labels.intro}</p>
      </div>

      {resolvedSearchParams.error ? (
        <Card className="mb-4 border-destructive/35 bg-destructive/10">
          <CardContent className="p-4 text-sm font-bold text-destructive">
            {resolvedSearchParams.error === "comment"
              ? labels.errorComment
              : labels.errorPost}
          </CardContent>
        </Card>
      ) : null}

      {user ? (
        <Card className="mb-5 border-border bg-card shadow-sm">
          <CardContent className="grid gap-4 p-4 md:p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md border bg-secondary text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black">{labels.composerTitle}</h2>
                <p className="text-sm text-muted-foreground">
                  {labels.intro}
                </p>
              </div>
            </div>
            <form action={createFeedPost} className="grid gap-3">
              <Textarea
                maxLength={2000}
                name="body"
                placeholder={labels.composerPlaceholder}
                required
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="grid gap-1 text-sm font-bold text-muted-foreground sm:min-w-64">
                  <span>{labels.postAs}</span>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm font-bold text-foreground shadow-sm"
                    name="businessId"
                  >
                    <option value="">{labels.postAsMe}</option>
                    {ownedBusinesses.map((business) => (
                      <option key={business.id} value={business.id}>
                        {business.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button type="submit">
                  <SendHorizontal className="h-4 w-4" />
                  {labels.publish}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-5 border-border bg-card shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black">{labels.signInTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {labels.intro}
              </p>
            </div>
            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value="/feed" />
              <Button type="submit">{labels.signIn}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {posts.length ? (
        <div className="grid gap-4">
          {posts.map((post) => (
            <FeedPostCard
              canInteract={Boolean(user)}
              key={post.id}
              labels={labels}
              locale={locale}
              post={post}
              userId={user?.id ?? null}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed bg-card/80">
          <CardContent className="grid gap-3 p-8 text-center">
            <MessageCircle className="mx-auto h-10 w-10 text-primary" />
            <h2 className="text-2xl font-black">{labels.emptyTitle}</h2>
            <p className="text-sm text-muted-foreground">{labels.emptyText}</p>
            <Button asChild className="mx-auto mt-2" variant="outline">
              <Link href="/search">{common.search}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function FeedPostCard({
  canInteract,
  labels,
  locale,
  post,
  userId,
}: {
  canInteract: boolean;
  labels: Record<string, string>;
  locale: Locale;
  post: FeedPost;
  userId: string | null;
}) {
  const authorName =
    post.business?.name ||
    post.author?.author_name ||
    post.author?.author_id.slice(0, 8) ||
    labels.user;
  const avatarUrl = post.business?.logo_url || post.author?.author_avatar_url;
  const isOwnPost = post.author_id === userId;

  return (
    <Card className="overflow-hidden border-border bg-card shadow-sm">
      <CardContent className="grid gap-4 p-4 md:p-5">
        <div className="flex items-start gap-3">
          {avatarUrl ? (
            <BusinessLogo
              className="h-12 w-12 bg-background"
              logoUrl={avatarUrl}
              name={authorName}
            />
          ) : (
            <div className="grid h-12 w-12 place-items-center rounded-md border bg-secondary text-primary">
              {post.business_id ? (
                <Store className="h-5 w-5" />
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {post.business?.slug ? (
                <Link
                  className="font-black hover:text-hover-blue-foreground"
                  href={`/business/${post.business.slug}`}
                >
                  {authorName}
                </Link>
              ) : (
                <span className="font-black">{authorName}</span>
              )}
              <Badge variant={post.business_id ? "green" : "outline"}>
                {post.business_id ? labels.business : labels.user}
              </Badge>
            </div>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {formatFeedDate(post.created_at, locale)}
            </p>
          </div>
        </div>

        <p className="whitespace-pre-wrap text-base leading-7">{post.body}</p>

        {isOwnPost ? (
          <div className="flex flex-wrap items-start gap-2">
            <details className="min-w-0 flex-1 rounded-md border bg-background p-2">
              <summary className="inline-flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm font-black transition hover:bg-hover-blue hover:text-hover-blue-foreground">
                <Pencil className="h-4 w-4" />
                {labels.edit}
              </summary>
              <form action={updateFeedPost} className="mt-3 grid gap-2">
                <input type="hidden" name="postId" value={post.id} />
                <Textarea
                  defaultValue={post.body}
                  maxLength={2000}
                  name="body"
                  required
                />
                <Button className="justify-self-start" size="sm" type="submit">
                  {labels.save}
                </Button>
              </form>
            </details>
            <form action={deleteFeedPost}>
              <input type="hidden" name="postId" value={post.id} />
              <Button size="sm" type="submit" variant="outline">
                <Trash2 className="h-4 w-4" />
                {labels.delete}
              </Button>
            </form>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-y py-3">
          <form action={toggleFeedPostLike}>
            <input type="hidden" name="postId" value={post.id} />
            <input
              type="hidden"
              name="intent"
              value={post.likedByCurrentUser ? "unlike" : "like"}
            />
            <Button
              disabled={!canInteract}
              type="submit"
              variant={post.likedByCurrentUser ? "default" : "outline"}
              size="sm"
            >
              <Heart
                className="h-4 w-4"
                fill={post.likedByCurrentUser ? "currentColor" : "none"}
              />
              {post.likeCount}{" "}
              {post.likedByCurrentUser ? labels.liked : labels.like}
            </Button>
          </form>
          <Badge variant="outline" className="h-9 px-3">
            <MessageCircle className="mr-1.5 h-4 w-4" />
            {post.commentCount} {labels.comments}
          </Badge>
        </div>

        {post.comments.length ? (
          <div className="grid gap-3">
            {post.comments.map((comment) => (
              <div
                className="rounded-md border bg-background px-3 py-2 text-sm"
                key={comment.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black">
                    {comment.author?.author_name || labels.user}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {formatFeedDate(comment.created_at, locale)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap leading-6 text-muted-foreground">
                  {comment.body}
                </p>
                {comment.author_id === userId ? (
                  <div className="mt-3 flex flex-wrap items-start gap-2">
                    <details className="min-w-0 flex-1 rounded-md border bg-card p-2">
                      <summary className="cursor-pointer text-xs font-black">
                        {labels.edit}
                      </summary>
                      <form action={updateFeedComment} className="mt-2 grid gap-2">
                        <input type="hidden" name="commentId" value={comment.id} />
                        <Textarea
                          defaultValue={comment.body}
                          maxLength={1000}
                          name="body"
                          required
                        />
                        <Button className="justify-self-start" size="sm" type="submit">
                          {labels.save}
                        </Button>
                      </form>
                    </details>
                    <form action={deleteFeedComment}>
                      <input type="hidden" name="commentId" value={comment.id} />
                      <Button size="sm" type="submit" variant="outline">
                        {labels.delete}
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {canInteract ? (
          <form action={createFeedComment} className="flex gap-2">
            <input type="hidden" name="postId" value={post.id} />
            <input
              className={cn(
                "h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:border-primary/45 focus:ring-2 focus:ring-ring/25",
              )}
              maxLength={1000}
              name="body"
              placeholder={labels.commentPlaceholder}
              required
            />
            <Button type="submit" variant="secondary">
              {labels.comment}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatFeedDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-CA" : "en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
