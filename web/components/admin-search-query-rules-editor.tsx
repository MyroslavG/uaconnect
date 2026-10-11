"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus, Save, SearchCheck, Trash2 } from "lucide-react";

import {
  createSearchQueryRule,
  deleteSearchQueryRule,
  updateSearchQueryRule,
  type SearchQueryRuleActionState,
} from "@/app/admin/search-quality/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/lib/types";

export type AdminSearchQueryRule = {
  aliases: string[];
  id: string;
  inferredCategorySlugs: string[];
  isEnabled: boolean;
  note: string | null;
  query: string;
};

type AdminSearchQueryRulesEditorProps = {
  categories: Category[];
  rules: AdminSearchQueryRule[];
};

const initialState: SearchQueryRuleActionState = { message: "", ok: false };

export function AdminSearchQueryRulesEditor({
  categories,
  rules,
}: AdminSearchQueryRulesEditorProps) {
  const categoryNames = new Map(categories.map((category) => [category.slug, category.name]));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Додайте синоніми до запиту та, за потреби, підкажіть категорію. Правило
          застосовується і на сайті, і в мобільному застосунку.
        </p>
        <RuleDialog categories={categories} />
      </div>

      {rules.length ? (
        <div className="grid gap-3">
          {rules.map((rule) => (
            <div
              className="grid gap-3 rounded-lg border bg-background/70 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              key={rule.id}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-black">{rule.query}</h3>
                  <Badge variant={rule.isEnabled ? "secondary" : "outline"}>
                    {rule.isEnabled ? "Активне" : "Вимкнене"}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {rule.aliases.length
                    ? `Синоніми: ${rule.aliases.join(", ")}`
                    : "Без додаткових синонімів"}
                </p>
                {rule.inferredCategorySlugs.length ? (
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Категорії: {rule.inferredCategorySlugs
                      .map((slug) => categoryNames.get(slug) ?? slug)
                      .join(", ")}
                  </p>
                ) : null}
                {rule.note ? (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{rule.note}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <RuleDialog categories={categories} rule={rule} />
                <form action={deleteSearchQueryRule}>
                  <input name="ruleId" type="hidden" value={rule.id} />
                  <Button
                    className="text-destructive hover:text-destructive"
                    onClick={(event) => {
                      if (!window.confirm(`Видалити правило «${rule.query}»?`)) {
                        event.preventDefault();
                      }
                    }}
                    size="sm"
                    type="submit"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                    Видалити
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
          Правил ще немає. Додайте перше правило для запиту, який потребує кращих результатів.
        </p>
      )}
    </div>
  );
}

function RuleDialog({
  categories,
  rule,
}: {
  categories: Category[];
  rule?: AdminSearchQueryRule;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    rule ? updateSearchQueryRule : createSearchQueryRule,
    initialState,
  );
  const isEditing = Boolean(rule);

  useEffect(() => {
    if (state.ok) {
      setIsOpen(false);
    }
  }, [state.ok]);

  return (
    <>
      <Button onClick={() => setIsOpen(true)} size="sm" type="button" variant={isEditing ? "outline" : "default"}>
        {isEditing ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {isEditing ? "Редагувати" : "Додати правило"}
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-h-[min(90vh,48rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Редагувати правило пошуку" : "Нове правило пошуку"}</DialogTitle>
            <DialogDescription>
              Вкажіть фразу, її синоніми та категорії, які повинні підсилювати результати.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="grid gap-5">
            {rule ? <input name="ruleId" type="hidden" value={rule.id} /> : null}
            <div className="grid gap-2">
              <Label htmlFor={`rule-query-${rule?.id ?? "new"}`}>Запит або фраза</Label>
              <Input
                defaultValue={rule?.query}
                id={`rule-query-${rule?.id ?? "new"}`}
                maxLength={120}
                name="query"
                placeholder="Наприклад: шугаринг"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`rule-aliases-${rule?.id ?? "new"}`}>Синоніми та варіанти</Label>
              <Textarea
                className="min-h-24"
                defaultValue={rule?.aliases.join(", ")}
                id={`rule-aliases-${rule?.id ?? "new"}`}
                maxLength={1600}
                name="aliases"
                placeholder="sugaring, цукрова депіляція"
              />
              <p className="text-xs text-muted-foreground">Розділяйте комами, крапкою з комою або з нового рядка.</p>
            </div>
            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium">Підсилити категорії</legend>
              <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
                {categories.map((category) => (
                  <label className="flex items-center gap-2 text-sm" key={category.slug}>
                    <input
                      className="h-4 w-4 accent-primary"
                      defaultChecked={rule?.inferredCategorySlugs.includes(category.slug)}
                      name="categorySlugs"
                      type="checkbox"
                      value={category.slug}
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-2">
              <Label htmlFor={`rule-note-${rule?.id ?? "new"}`}>Нотатка для команди</Label>
              <Textarea
                className="min-h-20"
                defaultValue={rule?.note ?? ""}
                id={`rule-note-${rule?.id ?? "new"}`}
                maxLength={300}
                name="note"
                placeholder="Чому додали це правило"
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                className="h-4 w-4 accent-primary"
                defaultChecked={rule?.isEnabled ?? true}
                name="isEnabled"
                type="checkbox"
              />
              Правило активне
            </label>
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
              {isPending ? "Зберігаємо..." : "Зберегти правило"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
