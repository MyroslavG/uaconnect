"use client";

import { KeyboardEvent, useState } from "react";

import { cn } from "@/lib/utils";

const COLLAPSED_LINE_COUNT = 5;
const EXPANDABLE_CHARACTER_COUNT = 260;

type FeedPostBodyProps = {
  body: string;
};

export function FeedPostBody({ body }: FeedPostBodyProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandable =
    body.length > EXPANDABLE_CHARACTER_COUNT ||
    body.split(/\r?\n/).length > COLLAPSED_LINE_COUNT;
  const bodyClassName = cn(
    "whitespace-pre-wrap text-base leading-7",
    isExpandable && !isExpanded ? "line-clamp-5" : null,
  );

  if (!isExpandable) {
    return <p className={bodyClassName}>{body}</p>;
  }

  function toggleExpanded() {
    setIsExpanded((value) => !value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleExpanded();
  }

  return (
    <div
      aria-expanded={isExpanded}
      className="cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-ring/25"
      onClick={toggleExpanded}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      title={body}
    >
      <p className={bodyClassName}>{body}</p>
      {!isExpanded ? (
        <span className="mt-1 inline-flex text-sm font-black leading-none text-muted-foreground">
          ...
        </span>
      ) : null}
    </div>
  );
}
