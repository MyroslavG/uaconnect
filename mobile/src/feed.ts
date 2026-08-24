import { isSupabaseConfigured, supabase } from "./supabase";

type FeedPostRow = {
  id: string;
  author_id: string;
  business_id: string | null;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type FeedCommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

type FeedAuthorRow = {
  author_id: string;
  author_name: string | null;
  author_avatar_url: string | null;
};

type FeedBusinessRow = {
  id: string;
  slug: string | null;
  name: string;
  city: string;
  logo_url: string | null;
};

type FeedStatsRow = {
  post_id: string;
  like_count: number;
  comment_count: number;
  liked_by_current_user: boolean;
};

type FeedLikeRow = {
  post_id: string;
  user_id: string;
};

export type MobileFeedComment = FeedCommentRow & {
  author?: FeedAuthorRow;
};

export type MobileFeedPost = FeedPostRow & {
  author?: FeedAuthorRow;
  business?: FeedBusinessRow;
  comments: MobileFeedComment[];
  commentCount: number;
  likedByCurrentUser: boolean;
  likeCount: number;
};

export async function fetchMobileFeedPosts() {
  if (!isSupabaseConfigured) {
    return [] as MobileFeedPost[];
  }

  const { data: posts, error } = await supabase
    .from("feed_posts")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  const postRows = (posts ?? []) as FeedPostRow[];

  if (!postRows.length) {
    return [];
  }

  const postIds = postRows.map((post) => post.id);
  const businessIds = postRows
    .map((post) => post.business_id)
    .filter((businessId): businessId is string => Boolean(businessId));
  const [commentsResult, statsResult, visibleLikesResult] = await Promise.all([
    supabase
      .from("feed_post_comments")
      .select("*")
      .in("post_id", postIds)
      .order("created_at", { ascending: true }),
    supabase.rpc("get_feed_post_stats", { post_ids: postIds }),
    supabase.from("feed_post_likes").select("post_id, user_id").in("post_id", postIds),
  ]);

  if (commentsResult.error) {
    throw commentsResult.error;
  }

  if (statsResult.error) {
    console.error("[kolo:mobile-feed-stats]", statsResult.error);
  }

  if (visibleLikesResult.error) {
    console.error("[kolo:mobile-feed-visible-likes]", visibleLikesResult.error);
  }

  const commentRows = (commentsResult.data ?? []) as FeedCommentRow[];
  const visibleLikeRows = (visibleLikesResult.data ?? []) as FeedLikeRow[];
  const authorIds = Array.from(
    new Set([
      ...postRows.map((post) => post.author_id),
      ...commentRows.map((comment) => comment.author_id),
    ]),
  );
  const [authorsById, businessesById] = await Promise.all([
    fetchFeedAuthors(authorIds),
    fetchFeedBusinesses(businessIds),
  ]);
  const statsByPostId = new Map(
    ((statsResult.data ?? []) as FeedStatsRow[]).map((row) => [row.post_id, row]),
  );
  const visibleLikesByPostId = new Map<string, FeedLikeRow[]>();
  const commentsByPostId = new Map<string, MobileFeedComment[]>();

  for (const like of visibleLikeRows) {
    const postLikes = visibleLikesByPostId.get(like.post_id) ?? [];
    postLikes.push(like);
    visibleLikesByPostId.set(like.post_id, postLikes);
  }

  for (const comment of commentRows) {
    const postComments = commentsByPostId.get(comment.post_id) ?? [];
    postComments.push({
      ...comment,
      author: authorsById.get(comment.author_id),
    });
    commentsByPostId.set(comment.post_id, postComments);
  }

  return postRows.map((post) => {
    const postStats = statsByPostId.get(post.id);
    const postComments = commentsByPostId.get(post.id) ?? [];
    const visibleLikes = visibleLikesByPostId.get(post.id) ?? [];
    const fallbackLikedByCurrentUser = visibleLikes.length > 0;
    const fallbackLikeCount = visibleLikes.length;

    return {
      ...post,
      author: authorsById.get(post.author_id),
      business: post.business_id ? businessesById.get(post.business_id) : undefined,
      comments: postComments,
      commentCount: Math.max(
        postComments.length,
        Number(postStats?.comment_count ?? 0),
      ),
      likedByCurrentUser: Boolean(
        postStats?.liked_by_current_user ?? fallbackLikedByCurrentUser,
      ),
      likeCount: Math.max(Number(postStats?.like_count ?? 0), fallbackLikeCount),
    };
  });
}

export async function createMobileFeedPost({
  body,
  businessId,
}: {
  authorId: string;
  body: string;
  businessId?: string | null;
}) {
  const { error } = await supabase.rpc("create_feed_post", {
    body: body.trim(),
    target_business_id: businessId || null,
  });

  if (error) {
    throw error;
  }
}

export async function toggleMobileFeedLike({
  isLiked,
  postId,
  userId,
}: {
  isLiked: boolean;
  postId: string;
  userId: string;
}) {
  const { error } = await supabase.rpc("toggle_feed_post_like", {
    should_like: !isLiked,
    target_post_id: postId,
  });

  if (!error) {
    return;
  }

  if (!isMissingRpcError(error)) {
    throw error;
  }

  if (!isLiked) {
    const { error: insertError } = await supabase.from("feed_post_likes").insert({
      post_id: postId,
      user_id: userId,
    });

    if (insertError && insertError.code !== "23505") {
      throw insertError;
    }

    return;
  }

  const { error: deleteError } = await supabase
    .from("feed_post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);

  if (deleteError) {
    throw deleteError;
  }
}

export async function updateMobileFeedPost({
  authorId,
  body,
  postId,
}: {
  authorId: string;
  body: string;
  postId: string;
}) {
  const trimmedBody = body.trim();

  if (!trimmedBody || trimmedBody.length > 2000) {
    throw new Error("Post must include text and be under 2000 characters.");
  }

  const { error } = await supabase.rpc("update_feed_post", {
    body: trimmedBody,
    target_post_id: postId,
  });

  if (!error) {
    return;
  }

  if (!isMissingRpcError(error)) {
    throw error;
  }

  const { data, error: updateError } = await supabase
    .from("feed_posts")
    .update({ body: trimmedBody })
    .eq("id", postId)
    .eq("author_id", authorId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw updateError;
  }

  if (!data) {
    throw new Error("Post was not updated. Make sure this account owns the post.");
  }
}

export async function deleteMobileFeedPost({
  authorId,
  postId,
}: {
  authorId: string;
  postId: string;
}) {
  const { error } = await supabase.rpc("delete_feed_post", {
    target_post_id: postId,
  });

  if (!error) {
    return;
  }

  if (!isMissingRpcError(error)) {
    throw error;
  }

  const { data, error: deleteError } = await supabase
    .from("feed_posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", authorId)
    .select("id")
    .maybeSingle();

  if (deleteError) {
    throw deleteError;
  }

  if (!data) {
    throw new Error("Post was not deleted. Make sure this account owns the post.");
  }
}

export async function createMobileFeedComment({
  authorId,
  body,
  postId,
}: {
  authorId: string;
  body: string;
  postId: string;
}) {
  const trimmedBody = body.trim();
  const { data, error } = await supabase.rpc("create_feed_comment", {
    body: trimmedBody,
    target_post_id: postId,
  });

  if (!error) {
    return typeof data === "string" ? data : "";
  }

  if (!isMissingRpcError(error)) {
    throw error;
  }

  const { data: insertedComment, error: insertError } = await supabase
    .from("feed_post_comments")
    .insert({
      author_id: authorId,
      body: trimmedBody,
      post_id: postId,
    })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  return (insertedComment as { id?: string } | null)?.id ?? "";
}

export async function updateMobileFeedComment({
  authorId,
  body,
  commentId,
}: {
  authorId: string;
  body: string;
  commentId: string;
}) {
  const trimmedBody = body.trim();

  if (!trimmedBody || trimmedBody.length > 1000) {
    throw new Error("Comment must include text and be under 1000 characters.");
  }

  const { error } = await supabase
    .from("feed_post_comments")
    .update({ body: trimmedBody })
    .eq("id", commentId)
    .eq("author_id", authorId);

  if (error) {
    throw error;
  }
}

export async function deleteMobileFeedComment({
  authorId,
  commentId,
}: {
  authorId: string;
  commentId: string;
}) {
  const { error } = await supabase
    .from("feed_post_comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", authorId);

  if (error) {
    throw error;
  }
}

async function fetchFeedAuthors(authorIds: string[]) {
  const authorsById = new Map<string, FeedAuthorRow>();

  if (!authorIds.length) {
    return authorsById;
  }

  const { data } = await supabase.rpc("get_public_feed_authors", {
    author_ids: authorIds,
  });

  for (const author of (data ?? []) as FeedAuthorRow[]) {
    authorsById.set(author.author_id, author);
  }

  return authorsById;
}

async function fetchFeedBusinesses(businessIds: string[]) {
  const businessesById = new Map<string, FeedBusinessRow>();

  if (!businessIds.length) {
    return businessesById;
  }

  const { data } = await supabase
    .from("businesses")
    .select("id, slug, name, city, logo_url")
    .in("id", businessIds);

  for (const business of (data ?? []) as FeedBusinessRow[]) {
    businessesById.set(business.id, business);
  }

  return businessesById;
}

function isMissingRpcError(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST202" ||
    Boolean(error.message?.includes("Could not find the function"))
  );
}
