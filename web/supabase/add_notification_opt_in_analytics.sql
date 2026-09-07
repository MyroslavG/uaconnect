alter table public.analytics_events
  drop constraint if exists analytics_events_event_type_check;

alter table public.analytics_events
  add constraint analytics_events_event_type_check
  check (
    event_type in (
      'app_open',
      'business_submit',
      'business_update',
      'business_profile_view',
      'contact_click',
      'content_create',
      'content_delete',
      'content_update',
      'content_view',
      'notification_dismiss',
      'notification_permission_denied',
      'notification_permission_granted',
      'notification_prompt_dismiss',
      'notification_prompt_enable_click',
      'notification_prompt_view',
      'notification_settings_opened',
      'notification_view',
      'page_view',
      'search',
      'search_zero_results',
      'save_business',
      'share',
      'signin',
      'signup',
      'unsave_business'
    )
  );
