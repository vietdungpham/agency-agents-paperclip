# Platform collection routes

Read only the requested platform sections. These are routing hints; installed Muse documentation owns executable syntax and account authorization.

## Facebook

Discover the installed Facebook skill (the referenced archive calls it `facebook_cli` and uses `facebook-cli`). It documents post reads, comments, reaction summaries, timeline reads and group posts. Confirm which operations and target types the current runtime supports before collecting. A timeline may include material authored by someone other than its owner: retain both identities when returned.

Resolve share links through the installed reader's supported flow. Keep the returned canonical URL; do not guess numeric IDs or treat a video/media ID as a post ID. Record comment ordering, reply coverage and pagination. Ranked feed/group samples are not exhaustive keyword search. A reaction total is not a list of individual reactors.

Recommended post fields: account/page, author, item ID, permalink, original text, publication time, content format, media references, observed reaction/comment/share metrics. Collect comments only when requested, with parent post/comment IDs and a source reference. Minimize personal data; do not collect friend graphs or contact information for ordinary market research.

## Instagram

Use the live Instagram skill; the archive documents `instagram-cli` and `accounts` discovery. Use the authenticated account identifier for account-scoped operations, not the competitor's identifier. Discover requested public posts through supported search/profile reads and retrieve details for selected posts/Reels.

Recommended fields: handle, item ID, permalink, caption, publication time, format, media references, displayed likes/comments/views when available. Preserve whether views refer to plays, views or another source-defined metric. Do not present own-account insights as competitor metrics. Keep any media description separate from the caption and mark it as derived.

## Threads

Use the live Threads skill; the archive documents `threads-cli`, search, profile threads, post reads and comments. Preserve the actual keyword, order, language/date filters and account context where relevant. Hydrate selected records by their returned URL or ID.

Recommended fields: author/handle, item ID, permalink, original text, publication time, media, visible likes/replies/reposts/quotes. Preserve root/reply/quote relationships when returned. Reposts and quoted posts are distinct observations, not automatically duplicates. Search ranking and trends do not establish population-wide sentiment or volume.

## Meta Ads Library

First inspect the live tool catalog for an Ads Library reader. A skill named `meta-ads` does not prove access to public ad-library data: check its actual operations. Do not use a managed ad-account report as a substitute for competitor Ads Library observations.

If needed, use the public Ads Library in Muse's permitted browser. Record the exact query URL, country, category, advertiser/page, active status, keyword, date filters and retrieval time. If any filter cannot be set, record the actual scope. Capture each selected ad's detail page or stable source reference and visible creative evidence. An aggregate search page alone is weak evidence for a specific ad.

Fields when displayed: ad-library ID, advertiser/page name and ID, library/detail URL, status, start/end dates, platforms, ad copy/headline, CTA, creative type and references, displayed destination URL, variants/grouping and transparency fields. Preserve all returned variants or explicitly state which were sampled. Do not invent an end date for an active ad. Do not click a tracked destination unless destination inspection is requested; distinguish displayed destination from a resolved final URL.

Spend, impressions, targeting and delivery details vary by ad category and region. Collect them only if actually exposed, retaining source labels, currencies, units and ranges. Absence means unavailable, not zero. Ad duration or multiple creatives do not establish profitable performance. If blocked, retain the URL/filter state and report the access gap; do not claim no ads exist.

## Upstream references consulted

- https://github.com/win4r/MuseAI-Skills/blob/main/opt/hatch/skills/facebook-cli/SKILL.md
- https://github.com/win4r/MuseAI-Skills/blob/main/opt/hatch/skills/instagram/SKILL.md
- https://github.com/win4r/MuseAI-Skills/blob/main/opt/hatch/skills/threads/SKILL.md
- https://github.com/obra/muse-skills

These are independent archives. This skill supplies an original SMASHCO workflow, not copied provider tooling. A live Ads Library collection has not been verified by this package.
