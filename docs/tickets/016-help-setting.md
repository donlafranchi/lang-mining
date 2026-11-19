# 016 Help level as a user setting

- Each person saves a help level (full, medium, light) per language on the Settings page. Stored on app_users (help_es, help_fa; null means the language default). Migration 0006.
- New lessons and reruns use the saved level. The paste form no longer has a help picker; it shows the current level with a link to Settings. The rerun picker on a lesson still overrides for that run.
- Before migration 0006 is run, everything works on defaults and saving says which SQL to run.
