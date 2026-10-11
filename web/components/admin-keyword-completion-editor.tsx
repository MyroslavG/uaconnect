"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, SearchCheck } from "lucide-react";

import {
  updateBusinessSearchKeywords,
  type KeywordCompletionActionState,
} from "@/app/admin/search-quality/actions";
import { BusinessKeywordInput } from "@/components/business-keyword-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type KeywordCompletionBusiness = {
  businessId: string;
  category: string;
  city: string;
  keywordCount: number;
  keywords: string | null;
  name: string;
};

type AdminKeywordCompletionEditorProps = {
  businesses: KeywordCompletionBusiness[];
};

const initialState: KeywordCompletionActionState = {
  message: "",
  ok: false,
};

export function AdminKeywordCompletionEditor({
  businesses,
}: AdminKeywordCompletionEditorProps) {
  if (!businesses.length) {
    return (
      <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
        Усі опубліковані бізнеси мають від 3 до 10 ключових слів.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {businesses.map((business) => (
        <KeywordCompletionRow business={business} key={business.businessId} />
      ))}
    </div>
  );
}

function KeywordCompletionRow({ business }: { business: KeywordCompletionBusiness }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateBusinessSearchKeywords,
    initialState,
  );

  useEffect(() => {
    if (!state.ok) {
      return;
    }

    setIsOpen(false);
    router.refresh();
  }, [router, state.ok]);

  return (
    <div className="grid min-w-0 gap-3 rounded-lg border bg-background/70 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-base font-black">{business.name}</h3>
          <Badge variant={business.keywordCount < 3 ? "destructive" : "outline"}>
            {business.keywordCount}/3-10
          </Badge>
        </div>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {business.city} · {business.category}
        </p>
        {business.keywords ? (
          <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
            {business.keywords}
          </p>
        ) : null}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="justify-center" size="sm" type="button">
            <Pencil className="h-4 w-4" />
            Редагувати
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ключові слова: {business.name}</DialogTitle>
            <DialogDescription>
              Додайте 3-10 слів або коротких фраз, якими люди реально шукають цей бізнес.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="grid gap-5">
            <input name="businessId" type="hidden" value={business.businessId} />
            <BusinessKeywordInput
              addLabel="Додати слово"
              defaultValue={business.keywords}
              helper="Наприклад: манікюр, нігті, педикюр"
              id={`search-keywords-${business.businessId}`}
              name="keywords"
              placeholder="Додайте ключове слово"
            />
            {state.message ? (
              <p
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  state.ok
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-destructive/20 bg-destructive/10 text-destructive"
                }`}
              >
                {state.message}
              </p>
            ) : null}
            <Button disabled={isPending} type="submit">
              {isPending ? <SearchCheck className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
              {isPending ? "Зберігаємо..." : "Зберегти ключові слова"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
