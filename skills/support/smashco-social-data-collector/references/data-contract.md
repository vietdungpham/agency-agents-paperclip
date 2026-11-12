# Collection and handoff contract — version 1

## `records.jsonl`

UTF-8, one JSON object per line. Each record needs:

| Field | Meaning |
|---|---|
| schema_version | `1` |
| collection_id | Stable identifier for this task's collection; reuse on resume |
| record_key | Unique within collection: platform + kind + returned item ID; exact canonical URL fallback |
| platform | `facebook`, `instagram`, `threads`, `meta_ads_library` |
| kind | `post`, `comment`, `ad`, `profile` |
| source_url | Exact returned/observed URL; `null` if unavailable |
| item_id | Source identifier as string, or `null` |
| parent_key | Linked collected parent record key, or `null` |
| author | Object: `name`, `handle`, `id`; unavailable values `null` |
| text_original | Source text, unmodified; `null` if unavailable |
| published_at | ISO 8601 with timezone only if known; otherwise `null` |
| published_at_raw | Original date/time label, or `null` |
| collected_at | ISO 8601 UTC timestamp for observation |
| metrics | Object of source-defined metric observations; may be empty |
| media | Array of actual media references and separately labeled derived descriptions |
| evidence_refs | Nonempty array of raw-file/section/screenshot references accessible in delivery |
| missing_fields | Array of objects with `field` and factual `reason` |

Each metric observation is an object with `value` (exact number or `null`), `display_raw` (original label), `source_label` and `unit`. Preserve ranges as `min`/`max` with a null point value. Do not silently convert `1.2K` to an exact 1200. Store a genuinely observed zero as zero.

Add `ad_details` for ads: returned library ID, advertiser, status, dates, CTA, displayed destination, delivery platforms, creative variants and transparency observations. Add `derived_observations` when using OCR, translation or transcription; identify method, input evidence and uncertainty. These are not original source text.

Never invent source IDs/URLs, dates or source text to satisfy the schema. If no ID or canonical URL exists, use a local synthetic key labeled `local:` and explain the identity limitation. Report unresolved identity/deduplication gaps. Keep credentials out of all fields.

## `sources.csv`

Columns: `source_id,platform,source_url,query_or_target,filters_json,retrieved_at,evidence_ref,access_status`.

Use standard CSV quoting. `filters_json` includes actual date window/timezone, ordering, country/category/status and other applied filters. Do not label requested-but-unapplied filters as applied. Source IDs are local provenance identifiers, not platform IDs.

## `collection-notes.md`

Record:

1. Paperclip task identifier and collection ID; requested scope and explicit assumptions.
2. Requested versus collected counts per platform and kind; unique items versus repeated observations.
3. Actual time window, filters, sampling/order and pagination: pages read, source exhaustion, remaining cursor availability and stopping reason. Do not publish authentication-bearing cursors.
4. Data gaps, hidden/approximate metrics, inaccessible sources and errors; distinguish not found from not accessible.
5. Raw evidence locations, transformation notes and delivery references.
6. What Research can answer from the collected evidence and what remains unsupported. No strategic recommendations or performance claims.
7. Actual collection-worker count and waves; validator checks and source spot-check sample; work units completed, cooling down or blocked, retry counts and next eligible retry times where applicable.

Mark overall coverage `complete_for_requested_scope`, `partial` or `blocked`. A bounded top-N request can be complete for its scope without representing all posts on the platform. Report per-platform coverage when outcomes differ.

## Paperclip handoff

Publish through the existing Muse binding and use the returned references in a comment/task document:

> Đã thu thập [counts] trong phạm vi [window/targets]. Phạm vi: [coverage]. Dữ liệu: [published reference]. Nguồn và ghi chú: [published references]. Còn thiếu: [gaps]. Research có thể tiếp tục [bounded next step].

Confirm publication and native finalization separately. If waiting for an answer, use the binding's supported question/wait flow; if delivery failed, retain work and report the failure. Never mark the parent Research task completed as a side effect.

## Pilot acceptance

Use a real Research task requesting 3 publicly accessible posts on one platform before larger batches. Verify: correct task/run; source links resolve for Research; original text and observed counts match spot checks; missing data stays null; evidence is published outside Muse's local filesystem; a native completion receipt exists. Then test one partial-access case and one Ads Library sample separately. This contract defines acceptance; this package does not claim those live tests have passed.
