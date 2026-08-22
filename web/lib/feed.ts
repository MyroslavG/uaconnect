import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type FeedPostRow = Database["public"]["Tables"]["feed_posts"]["Row"];
type FeedCommentRow =
  Database["public"]["Tables"]["feed_post_comments"]["Row"];
type FeedLikeRow = Database["public"]["Tables"]["feed_post_likes"]["Row"];
type BusinessRow = Pick<
  Database["public"]["Tables"]["businesses"]["Row"],
  "city" | "id" | "logo_url" | "name" | "slug"
>;
type FeedAuthor =
  Database["public"]["Functions"]["get_public_feed_authors"]["Returns"][number];

export type FeedPost = FeedPostRow & {
  author: FeedAuthor | null;
  business: BusinessRow | null;
  comments: FeedComment[];
  commentCount: number;
  likedByCurrentUser: boolean;
  likeCount: number;
};

export type FeedComment = FeedCommentRow & {
  author: FeedAuthor | null;
};

export async function getFeedPosts() {
  if (!isSupabaseConfigured()) {
    return [] as FeedPost[];
  }

  const supabase = await createClient();
  const { data: posts, error } = await supabase
    .from("feed_posts")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !posts?.length) {
    return [];
  }

  const postIds = posts.map((post) => post.id);
  const businessIds = posts
    .map((post) => post.business_id)
    .filter((businessId): businessId is string => Boolean(businessId));

  const [commentsResult, statsResult, visibleLikesResult] = await Promise.all([
    supabase
      .from("feed_post_comments")
      .select("*")
      .in("post_id", postIds)
      .order("created_at", { ascending: true }),
    supabase.rpc("get_feed_post_stats", { post_ids: postIds }),
    supabase.from("feed_post_likes").select("*").in("post_id", postIds),
  ]);

  if (commentsResult.error) {
    return [];
  }

  if (statsResult.error) {
    console.error("[kolo:web-feed-stats]", statsResult.error);
  }

  if (visibleLikesResult.error) {
    console.error("[kolo:web-feed-visible-likes]", visibleLikesResult.error);
  }

  const commentRows = commentsResult.data ?? [];
  const visibleLikeRows = (visibleLikesResult.data ?? []) as FeedLikeRow[];
  const authorIds = Array.from(
    new Set(
      [
        ...posts.map((post) => post.author_id),
        ...commentRows.map((comment) => comment.author_id),
      ].filter(Boolean),
    ),
  );
  const [authorsById, businessesById] = await Promise.all([
    getFeedAuthors(authorIds),
    getFeedBusinesses(businessIds),
  ]);
  const statsByPostId = new Map(
    (statsResult.data ?? []).map((row) => [row.post_id, row]),
  );
  const visibleLikesByPostId = new Map<string, FeedLikeRow[]>();
  const commentsByPostId = new Map<string, FeedComment[]>();

  for (const like of visibleLikeRows) {
    const postLikes = visibleLikesByPostId.get(like.post_id) ?? [];
    postLikes.push(like);
    visibleLikesByPostId.set(like.post_id, postLikes);
  }

  for (const comment of commentRows) {
    const postComments = commentsByPostId.get(comment.post_id) ?? [];
    postComments.push({
      ...comment,
      author: authorsById.get(comment.author_id) ?? null,
    });
    commentsByPostId.set(comment.post_id, postComments);
  }

  return posts.map((post) => {
    const postStats = statsByPostId.get(post.id);
    const postComments = commentsByPostId.get(post.id) ?? [];
    const visibleLikes = visibleLikesByPostId.get(post.id) ?? [];

    return {
      ...post,
      author: authorsById.get(post.author_id) ?? null,
      business: post.business_id
        ? businessesById.get(post.business_id) ?? null
        : null,
      comments: postComments,
      commentCount: Math.max(
        postComments.length,
        getCount(postStats?.comment_count),
      ),
      likedByCurrentUser: Boolean(
        postStats?.liked_by_current_user ?? visibleLikes.length > 0,
      ),
      likeCount: Math.max(getCount(postStats?.like_count), visibleLikes.length),
    };
  });
}

export async function getOwnedFeedBusinesses(userId: string) {
  if (!isSupabaseConfigured()) {
    return [] as BusinessRow[];
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("id, slug, name, city, logo_url")
    .eq("owner_id", userId)
    .eq("status", "published")
    .order("name", { ascending: true });

  return data ?? [];
}

async function getFeedAuthors(authorIds: string[]) {
  const authorsById = new Map<string, FeedAuthor>();

  if (authorIds.length === 0) {
    return authorsById;
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_feed_authors", {
    author_ids: authorIds,
  });

  for (const author of data ?? []) {
    authorsById.set(author.author_id, author);
  }

  return authorsById;
}

async function getFeedBusinesses(businessIds: string[]) {
  const businessesById = new Map<string, BusinessRow>();

  if (businessIds.length === 0) {
    return businessesById;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("id, slug, name, city, logo_url")
    .in("id", businessIds);

  for (const business of data ?? []) {
    businessesById.set(business.id, business);
  }

  return businessesById;
}

function getCount(value: number | null | undefined) {
  return Math.max(0, Number(value ?? 0));
}
