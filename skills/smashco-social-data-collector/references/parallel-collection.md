# Parallel collection and temporary blocks

## Workers and ownership

For search/retrieval assignments, aim for 10–20 collection sub-agents plus one dedicated validator/aggregator, subject to actual runtime support and source limits. Choose 10 for ordinary scope and up to 20 when there are enough independent work units. Do not invent a sub-agent API: inspect the actual Muse delegation capability first. If the runtime supports fewer workers, use available capacity in waves and report it. For a task smaller than ten meaningful work units, use fewer active workers rather than duplicate requests to fill slots.

The main Muse agent owns the accepted Paperclip assignment, keeps the checkpoint and coordinates workers. Collection sub-agents do not create independent Paperclip runs, accept the same assignment, complete the parent task or receive copied credentials. Use delegation with the runtime's existing permission boundaries. If delegation is unavailable, collect sequentially and disclose that limitation.

The validator/aggregator is separate from the 10–20 collectors. It validates evidence and packages the dataset for Research; it does not produce strategy or business-performance conclusions.

## Divide the work without duplication

Partition by platform and then by nonoverlapping account, keyword group, date window or returned page range. Do not assign multiple workers the same pagination cursor or have them guess cursors. If a query has sequential pagination, one worker owns that cursor chain. Give each work unit a stable `unit_id`, scope, requested fields, unique-record target, request budget, evidence destination and stop condition. Allocate the parent's total count/budget across units; do not give every worker the full parent quota.

Each collector writes isolated outputs under `workers/<unit_id>/`: records, raw evidence, source log and checkpoint. Preserve unique record keys and provenance when the validator merges them. Cross-query duplicate discoveries may be retained as observations but count once toward unique-item totals. All workers share the source/account request budget: twenty workers must not produce twenty times the permitted request rate. Stagger launches and reduce per-source concurrency when throttled.

Checkpoint fields: `unit_id`, status (`pending`, `running`, `cooldown`, `completed`, `blocked`), actual scope, counts, completed batches, safe continuation reference, retry count, last error category, `last_attempt_at` and `next_retry_at` in UTC. Do not include secrets or authentication-bearing cursor material in published checkpoints; keep any necessary sensitive continuation state in the runtime's supported private storage.

## Ten-minute cooldown

When a search/read gets a temporary rate limit, explicit wait instruction or temporary provider block:

1. Preserve collected results and mark only that unit `cooldown`.
2. Set `next_retry_at` to at least ten minutes after the failure. If `Retry-After` or the provider's stated reset is later, use that later time.
3. Stop requests for that unit. A source/account-wide limit pauses all units sharing that source/account; it is not a reason to fan out through other workers.
4. Continue unrelated eligible work. The validator may validate already collected batches while units wait.
5. Resume the same unit from its last safe checkpoint, without recollecting completed batches, only if the assignment is still valid and its deadline/budget permits.

Default: at most two cooldown retries per unit after the initial failure. A new worker does not reset the retry count. Once exhausted, mark the unit blocked, publish the partial dataset and report the gap to Research through the supported Paperclip flow. The parent task may specify a different finite retry budget explicitly.

Use a real supported delayed-resume/wait mechanism that retains the current assignment and checkpoint. Do not invent a scheduler, create a persistent polling loop or mark the task completed while waiting. If this runtime cannot resume after ten minutes, report the saved checkpoint and retry time as blocked/waiting through its actual binding; request an operator-supported resume rather than promising one. Before a delayed retry, check cancellation, authority, deadline and already-published receipts.

Classify the response rather than treating every 403 as temporary. A revoked credential, forbidden/private content, policy denial, login requirement or CAPTCHA needing user action is `blocked`, not an automatic cooldown retry. Report the required action; do not solve a challenge or switch accounts/proxies to bypass it. A vague transport error is not proof of an access denial: record uncertainty and use the same bounded read retry budget.

## Validator/aggregator

Validate all rows for required fields, identity/deduplication, evidence references, source-window alignment, timestamp interpretation and missing/approximate metric handling. Spot-check source fidelity on at least one record per nonempty worker output and additional records where truncation, OCR or ambiguous metrics create uncertainty. Report the sample checked; structural validation of every row is not source-by-source verification of every row.

Return specific defects to the responsible collector within the existing request/retry budget. The validator must not fill missing facts from memory or turn a failed source check into a fabricated value. Keep unresolved defects visible, along with cooldown/exhausted units.

Merge to the parent collection files, retaining per-row evidence and source lineage. Report actual collector count, waves, completed/cooldown/blocked units, validation sample and remaining gaps in `collection-notes.md`. The main Muse agent then publishes through its existing Paperclip binding, verifies accessible artifact references and performs native completion only when the requested scope or agreed partial handoff is satisfied.
