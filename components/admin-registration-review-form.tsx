"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  reviewBusinessRegistration,
  type ReviewActionState,
} from "@/app/admin/registrations/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AdminRegistrationReviewFormProps = {
  labels: {
    approve: string;
    approving: string;
    reject: string;
    rejecting: string;
    reviewNote: string;
  };
  registrationId: string;
  reviewNote?: string | null;
};

const initialState: ReviewActionState = {
  ok: false,
  message: "",
};

export function AdminRegistrationReviewForm({
  labels,
  registrationId,
  reviewNote,
}: AdminRegistrationReviewFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    reviewBusinessRegistration,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <form
      action={formAction}
      className="grid gap-3 rounded-lg border bg-background/70 p-4"
    >
      <input type="hidden" name="id" value={registrationId} />
      <Label htmlFor={`review-${registrationId}`}>{labels.reviewNote}</Label>
      <Textarea
        id={`review-${registrationId}`}
        name="reviewNote"
        defaultValue={reviewNote ?? ""}
        placeholder={labels.reviewNote}
      />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Button
          disabled={isPending}
          name="status"
          type="submit"
          value="approved"
        >
          {isPending ? labels.approving : labels.approve}
        </Button>
        <Button
          disabled={isPending}
          name="status"
          type="submit"
          value="rejected"
          variant="outline"
        >
          {isPending ? labels.rejecting : labels.reject}
        </Button>
      </div>
      {state.message ? (
        <p
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${
            state.ok
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-destructive/25 bg-destructive/10 text-destructive"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
