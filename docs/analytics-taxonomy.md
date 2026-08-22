# Kolo Analytics Event Taxonomy

This is the shared event specification for Kolo web, iOS, and Android.

## Standard Fields

Every event should include these fields whenever available:

- `event_type`: one of the canonical event names below.
- `platform`: `web`, `mobile`, or `server`.
- `user_id`: Supabase user id when signed in.
- `anonymous_id`: local anonymous id for guests.
- `session_id`: local session id.
- `occurred_at`: database timestamp.
- `metadata`: extra JSON details that do not deserve their own top-level column yet.

Entity fields:

- `business_id`, `business_slug`, `business_name`
- `content_item_id`, `content_type`
- `city`, `category_slug`
- `search_query`
- `contact_type`

## Event Types

| Event | When It Fires | Required / Important Fields |
| --- | --- | --- |
| `app_open` | App/site is opened for the first time in a session. | `platform`, `user_id`, `anonymous_id`, `session_id` |
| `page_view` | Web page or mobile screen/tab is viewed. | `metadata.path` or `metadata.screen` |
| `signup` | User creates an account. | `user_id`, `metadata.provider` |
| `signin` | Existing user signs in. | `user_id`, `metadata.provider` |
| `search` | User searches or changes city/category filters. | `search_query`, `city`, `category_slug`, `metadata.resultCount`, `metadata.localOnly` |
| `search_zero_results` | Search returns no results. | `search_query`, `city`, `category_slug`, `metadata.localOnly` |
| `business_profile_view` | Business profile page or modal opens. | `business_id`, `business_slug`, `business_name`, `city`, `category_slug` |
| `content_view` | Service, event, or product detail opens. | `business_id`, `content_item_id`, `content_type` |
| `contact_click` | User taps phone, website, Instagram, route, address, or content link. | `business_id`, `contact_type`, `content_item_id` when applicable |
| `save_business` | Signed-in user saves a business. | `user_id`, `business_id` |
| `unsave_business` | Signed-in user removes a saved business. | `user_id`, `business_id` |
| `share` | User opens share UI for a business or content item. | `business_id`, `content_item_id`, `metadata.shareTarget` |
| `business_submit` | User submits a new business for review. | `user_id`, `city`, `category_slug` |
| `business_update` | Owner/admin updates a business profile. | `user_id`, `business_id` |
| `content_create` | Owner creates a service, event, or product. | `user_id`, `business_id`, `content_item_id`, `content_type` |
| `content_update` | Owner updates a service, event, or product. | `user_id`, `business_id`, `content_item_id`, `content_type` |
| `content_delete` | Owner deletes a service, event, or product. | `user_id`, `business_id`, `content_item_id`, `content_type` |
| `notification_view` | Logged-in user sees an in-app notification. | `user_id`, `metadata.notificationId` |
| `notification_dismiss` | Logged-in user dismisses an in-app notification. | `user_id`, `metadata.notificationId` |

## Contact Types

`contact_click` must use one of:

- `phone`
- `website`
- `instagram`
- `route`
- `address`
- `link`

## Metadata Conventions

Use camelCase keys in `metadata`.

Recommended keys:

- Search: `resultCount`, `localOnly`, `radius`, `source`
- Share: `shareTarget`
- Auth: `provider`
- Notification: `notificationId`
- Content: `title`

## Funnel Metrics Covered

This taxonomy supports:

- visited/opened -> `app_open`, `page_view`
- registered/signed in -> `signup`, `signin`
- searched -> `search`, `search_zero_results`
- opened business -> `business_profile_view`
- opened service/event/product -> `content_view`
- contacted business -> `contact_click`
- saved or shared -> `save_business`, `unsave_business`, `share`
- business owner activation -> `business_submit`, `business_update`, `content_create`
