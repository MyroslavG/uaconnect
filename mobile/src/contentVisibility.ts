import type { BusinessContentItem } from "./types";

export function getPublicBusinessContentItems(
  items: BusinessContentItem[] | undefined,
  now = Date.now(),
) {
  return (items ?? []).filter((item) =>
    isPublicBusinessContentItemVisible(item, now),
  );
}

export function isPublicBusinessContentItemVisible(
  item: BusinessContentItem,
  now = Date.now(),
) {
  return item.type !== "event" || getContentTimestamp(item.startsAt) >= now;
}

function getContentTimestamp(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}
