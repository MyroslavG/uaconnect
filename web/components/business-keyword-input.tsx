"use client";

import { type KeyboardEvent, useMemo, useState } from "react";
import { X } from "lucide-react";

import {
  BUSINESS_KEYWORD_MAX_COUNT,
  BUSINESS_KEYWORD_MIN_COUNT,
  formatBusinessKeywords,
  parseBusinessKeywords,
} from "@/lib/business-keywords";

type BusinessKeywordInputProps = {
  addLabel: string;
  defaultValue?: string | null;
  helper: string;
  id: string;
  name: string;
  placeholder: string;
};

export function BusinessKeywordInput({
  addLabel,
  defaultValue,
  helper,
  id,
  name,
  placeholder,
}: BusinessKeywordInputProps) {
  const [keywords, setKeywords] = useState(() =>
    parseBusinessKeywords(defaultValue),
  );
  const [draft, setDraft] = useState("");
  const submittedValue = useMemo(
    () => formatBusinessKeywords([...keywords, ...parseBusinessKeywords(draft)]),
    [draft, keywords],
  );

  function addDraft() {
    const nextKeywords = [
      ...keywords,
      ...parseBusinessKeywords(draft).filter(
        (keyword) => !keywords.includes(keyword),
      ),
    ].slice(0, BUSINESS_KEYWORD_MAX_COUNT);

    setKeywords(nextKeywords);
    setDraft("");
  }

  function removeKeyword(keyword: string) {
    setKeywords((currentKeywords) =>
      currentKeywords.filter((candidate) => candidate !== keyword),
    );
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }

    event.preventDefault();
    addDraft();
  }

  return (
    <div className="grid gap-2">
      <input name={name} type="hidden" value={submittedValue} />
      <div className="min-h-11 rounded-md border border-input bg-background/85 px-3 py-2 shadow-sm transition focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-ring/25">
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-bold text-foreground"
              key={keyword}
            >
              {keyword}
              <button
                aria-label={`Remove ${keyword}`}
                className="rounded-full text-muted-foreground transition hover:text-foreground"
                onClick={() => removeKeyword(keyword)}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          <input
            className="min-h-7 min-w-[180px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            id={id}
            onBlur={addDraft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleDraftKeyDown}
            placeholder={
              keywords.length >= BUSINESS_KEYWORD_MAX_COUNT ? "" : placeholder
            }
            value={draft}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
        <span>{helper}</span>
        <span>
          {parseBusinessKeywords(submittedValue).length}/
          {BUSINESS_KEYWORD_MAX_COUNT}
        </span>
      </div>
      {draft.trim() ? (
        <button
          className="w-fit rounded-md border bg-background px-3 py-1.5 text-xs font-bold transition hover:bg-muted"
          onClick={addDraft}
          type="button"
        >
          {addLabel}
        </button>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {BUSINESS_KEYWORD_MIN_COUNT}-{BUSINESS_KEYWORD_MAX_COUNT}
      </p>
    </div>
  );
}
