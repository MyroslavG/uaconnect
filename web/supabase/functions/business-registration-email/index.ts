import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "jsr:@supabase/supabase-js@2";

type Delivery = {
  id: string;
  attempts: number;
  business_name: string;
  business_slug: string | null;
  notification_type: "submitted" | "approved";
  recipient_email: string;
  status: "queued" | "sending" | "sent" | "failed";
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const legacyServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function getServiceKey() {
  if (legacyServiceRoleKey) {
    return legacyServiceRoleKey;
  }

  const rawKeys = Deno.env.get("SUPABASE_SECRET_KEYS");

  if (rawKeys) {
    try {
      const secretKeys = JSON.parse(rawKeys) as Record<string, string>;

      if (secretKeys.default) {
        return secretKeys.default;
      }
    } catch {
      // Older projects expose the legacy service role key below.
    }
  }

  return null;
}

function matchesSecret(received: string | null, expected: string) {
  if (!received || received.length !== expected.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < received.length; index += 1) {
    difference |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  }

  return difference === 0;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[character];
  });
}

function buildEmail(delivery: Delivery, siteUrl: string) {
  const name = escapeHtml(delivery.business_name);
  const dashboardUrl = `${siteUrl}/dashboard`;
  const businessUrl = delivery.business_slug
    ? `${siteUrl}/business/${encodeURIComponent(delivery.business_slug)}`
    : dashboardUrl;
  const isApproval = delivery.notification_type === "approved";
  const heading = isApproval
    ? `Ваш бізнес ${name} тепер у Kolo`
    : `Ми отримали заявку для ${name}`;
  const copy = isApproval
    ? "Ми перевірили вашу заявку та опублікували профіль. Тепер люди можуть знайти ваш бізнес у Kolo."
    : "Дякуємо за заявку. Ми перевіримо інформацію та надішлемо вам email, щойно профіль буде опубліковано.";
  const englishCopy = isApproval
    ? "Your business profile has been reviewed and is now published on Kolo."
    : "Thanks for your request. We will review it and email you when your profile is published.";
  const actionLabel = isApproval ? "Переглянути профіль" : "Перейти до кабінету";
  const actionUrl = isApproval ? businessUrl : dashboardUrl;
  const subject = isApproval
    ? `Ваш бізнес тепер у Kolo: ${delivery.business_name}`
    : `Ми отримали заявку для ${delivery.business_name}`;

  const htmlContent = `<!doctype html>
<html lang="uk">
  <body style="margin:0;background:#f5f2ed;color:#291c0e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;background:#f5f2ed;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffdf9;border:1px solid #e8dfd4;border-radius:18px;overflow:hidden;">
          <tr><td style="padding:28px 30px 8px;font-size:26px;font-weight:700;letter-spacing:0.2px;">Kolo</td></tr>
          <tr><td style="padding:18px 30px 12px;font-size:24px;font-weight:700;line-height:1.25;">${heading}</td></tr>
          <tr><td style="padding:0 30px 8px;font-size:16px;line-height:1.6;">${copy}</td></tr>
          <tr><td style="padding:0 30px 24px;">
            <a href="${actionUrl}" style="display:inline-block;background:#291c0e;color:#fff;text-decoration:none;border-radius:10px;padding:13px 18px;font-size:15px;font-weight:600;">${actionLabel}</a>
          </td></tr>
          <tr><td style="padding:18px 30px 28px;border-top:1px solid #eee6dc;font-size:13px;line-height:1.55;color:#6d6256;">
            ${englishCopy}<br><br>
            Питання? Напишіть нам: <a href="mailto:myroslav@kredance.com" style="color:#6d6256;">myroslav@kredance.com</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const textContent = `${isApproval ? "Ваш бізнес тепер у Kolo" : "Ми отримали вашу заявку"}\n\n${copy}\n\n${actionLabel}: ${actionUrl}\n\n${englishCopy}\n\nKolo`;

  return { htmlContent, subject, textContent };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const webhookSecret = Deno.env.get("BUSINESS_EMAIL_WEBHOOK_SECRET");

  if (!webhookSecret || !matchesSecret(request.headers.get("x-kolo-email-secret"), webhookSecret)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const serviceKey = getServiceKey();

  if (!supabaseUrl || !serviceKey) {
    return Response.json({ error: "Supabase service key is unavailable." }, { status: 500 });
  }

  const payload = await request.json().catch(() => null) as { delivery_id?: unknown } | null;
  const deliveryId = typeof payload?.delivery_id === "string" ? payload.delivery_id : null;

  if (!deliveryId) {
    return Response.json({ error: "Missing delivery_id." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: existingDelivery, error: readError } = await supabase
    .from("business_registration_email_deliveries")
    .select("id, attempts, business_name, business_slug, notification_type, recipient_email, status")
    .eq("id", deliveryId)
    .maybeSingle();

  if (readError || !existingDelivery) {
    return Response.json({ error: "Delivery not found." }, { status: 404 });
  }

  const delivery = existingDelivery as Delivery;

  if (delivery.status === "sent") {
    return Response.json({ ok: true, alreadySent: true });
  }

  const { data: claimedDelivery, error: claimError } = await supabase
    .from("business_registration_email_deliveries")
    .update({ attempts: delivery.attempts + 1, error_message: null, status: "sending" })
    .eq("id", delivery.id)
    .in("status", ["queued", "failed"])
    .select("id")
    .maybeSingle();

  if (claimError) {
    return Response.json({ error: claimError.message }, { status: 500 });
  }

  if (!claimedDelivery) {
    return Response.json({ ok: true, inProgress: true }, { status: 202 });
  }

  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const fromEmail = Deno.env.get("EMAIL_FROM_ADDRESS") ?? "myroslav@kredance.com";
  const siteUrl = (Deno.env.get("SITE_URL") ?? "https://koloapp.ca").replace(/\/$/, "");

  if (!brevoApiKey) {
    await supabase
      .from("business_registration_email_deliveries")
      .update({ error_message: "BREVO_API_KEY is not configured.", status: "failed" })
      .eq("id", delivery.id);

    return Response.json({ error: "Email provider is not configured." }, { status: 500 });
  }

  const email = buildEmail(delivery, siteUrl);

  try {
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: fromEmail, name: "Kolo" },
        replyTo: { email: "myroslav@kredance.com", name: "Kolo" },
        to: [{ email: delivery.recipient_email }],
        subject: email.subject,
        htmlContent: email.htmlContent,
        textContent: email.textContent,
      }),
    });
    const brevoPayload = await brevoResponse.json().catch(() => null) as { messageId?: string; message?: string } | null;

    if (!brevoResponse.ok) {
      throw new Error(brevoPayload?.message ?? `Brevo returned ${brevoResponse.status}.`);
    }

    const { error: sentUpdateError } = await supabase
      .from("business_registration_email_deliveries")
      .update({
        provider_message_id: brevoPayload?.messageId ?? null,
        sent_at: new Date().toISOString(),
        status: "sent",
      })
      .eq("id", delivery.id);

    if (sentUpdateError) {
      throw sentUpdateError;
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send email.";

    await supabase
      .from("business_registration_email_deliveries")
      .update({ error_message: message.slice(0, 1000), status: "failed" })
      .eq("id", delivery.id);

    return Response.json({ error: "Unable to send email." }, { status: 502 });
  }
});
