"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function createFeedPost(formData: FormData) {
  const body = String(formData.get("body") ?? "").trim();
  const businessId = String(formData.get("businessId") ?? "").trim();

  if (!body || body.length > 2000) {
    redirect("/feed?error=post");
  }

  if (!isSupabaseConfigured()) {
    redirect("/feed");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard?next=/feed");
  }

  const { error } = await supabase.rpc("create_feed_post", {
    body,
    target_business_id: businessId || null,
  });

  if (error) {
    redirect("/feed?error=post");
  }

  revalidatePath("/feed");
  redirect("/feed");
}

export async function updateFeedPost(formData: FormData) {
  const postId = String(formData.get("postId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!postId || !body || body.length > 2000) {
    redirect("/feed?error=post");
  }

  if (!isSupabaseConfigured()) {
    redirect("/feed");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard?next=/feed");
  }

  const { error } = await supabase.rpc("update_feed_post", {
    body,
    target_post_id: postId,
  });

  if (error) {
    if (!isMissingRpcError(error)) {
      redirect("/feed?error=post");
    }

    const { data, error: updateError } = await supabase
      .from("feed_posts")
      .update({ body })
      .eq("id", postId)
      .eq("author_id", user.id)
      .select("id")
      .maybeSingle();

    if (updateError || !data) {
      redirect("/feed?error=post");
    }
  }

  revalidatePath("/feed");
  redirect("/feed");
}

export async function deleteFeedPost(formData: FormData) {
  const postId = String(formData.get("postId") ?? "").trim();

  if (!postId || !isSupabaseConfigured()) {
    redirect("/feed");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard?next=/feed");
  }

  const { error } = await supabase.rpc("delete_feed_post", {
    target_post_id: postId,
  });

  if (error) {
    if (!isMissingRpcError(error)) {
      redirect("/feed?error=post");
    }

    const { data, error: deleteError } = await supabase
      .from("feed_posts")
      .delete()
      .eq("id", postId)
      .eq("author_id", user.id)
      .select("id")
      .maybeSingle();

    if (deleteError || !data) {
      redirect("/feed?error=post");
    }
  }

  revalidatePath("/feed");
  redirect("/feed");
}

export async function toggleFeedPostLike(formData: FormData) {
  const postId = String(formData.get("postId") ?? "").trim();
  const intent = String(formData.get("intent") ?? "like").trim();

  if (!postId || !isSupabaseConfigured()) {
    redirect("/feed");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard?next=/feed");
  }

  await supabase.rpc("toggle_feed_post_like", {
    should_like: intent !== "unlike",
    target_post_id: postId,
  });

  revalidatePath("/feed");
}

export async function createFeedComment(formData: FormData) {
  const postId = String(formData.get("postId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!postId || !body || body.length > 1000) {
    redirect("/feed?error=comment");
  }

  if (!isSupabaseConfigured()) {
    redirect("/feed");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard?next=/feed");
  }

  const { error } = await supabase.rpc("create_feed_comment", {
    body,
    target_post_id: postId,
  });

  if (error) {
    redirect("/feed?error=comment");
  }

  revalidatePath("/feed");
  redirect("/feed");
}

export async function updateFeedComment(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!commentId || !body || body.length > 1000) {
    redirect("/feed?error=comment");
  }

  if (!isSupabaseConfigured()) {
    redirect("/feed");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard?next=/feed");
  }

  const { error } = await supabase
    .from("feed_post_comments")
    .update({ body })
    .eq("id", commentId)
    .eq("author_id", user.id);

  if (error) {
    redirect("/feed?error=comment");
  }

  revalidatePath("/feed");
  redirect("/feed");
}

export async function deleteFeedComment(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "").trim();

  if (!commentId || !isSupabaseConfigured()) {
    redirect("/feed");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard?next=/feed");
  }

  await supabase
    .from("feed_post_comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", user.id);

  revalidatePath("/feed");
  redirect("/feed");
}

function isMissingRpcError(error: { code?: string; message?: string }) {
  return (
    error.code === "PGRST202" ||
    Boolean(error.message?.includes("Could not find the function"))
  );
}
