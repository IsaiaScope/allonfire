# Placeholders in, volatile fields out: how a workflow n8n exports becomes the
# file committed in vps/workflows/. Node IDs stay: they are random per
# workflow and the connections need them. Tags go: their IDs are n8n's own.
(if type == "array" then .[0] else . end)
| del(.updatedAt, .createdAt, .versionId, .activeVersionId, .shared, .meta,
      .pinData, .staticData, .triggerCount, .isArchived, .tags, .versionCounter,
      .nodeGroups, .sourceWorkflowId, .versionMetadata)
| .nodes |= map(
    (if .parameters.chatId? then .parameters.chatId = "<telegram-chat-id>" else . end)
    | (if .type == "n8n-nodes-base.webhook" then .parameters.path = "<backup-webhook-path>" else . end)
    | (if .type == "n8n-nodes-base.httpRequest" and (.parameters.url | tostring | test("services/keep-alive")) then .parameters.url = "<keep-alive-url>" else . end)
    | (if .webhookId? then .webhookId = "<webhook-id>" else . end)
    | (if .credentials? then .credentials |= map_values(.id = "<credential-id>") else . end))
