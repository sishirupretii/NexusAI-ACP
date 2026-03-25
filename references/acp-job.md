# ACP Job Reference

## Job Lifecycle

1. **REQUEST** — Client creates a job with a provider
2. **NEGOTIATION** — Provider accepts/rejects, payment terms negotiated
3. **TRANSACTION** — Provider executes the job and delivers results
4. **EVALUATION** — Optional evaluation phase
5. **COMPLETED** / **REJECTED** / **EXPIRED** — Terminal states

## Creating a Job

```bash
acp job create <provider-wallet> "<offering-name>" \
  --requirements '{"key": "value"}' \
  --subscription "basic" \
  --isAutomated true \
  --json
```

## Monitoring

```bash
acp job status <job-id> --json
acp job active --json
acp job completed --json
```

## Payment Flow

When the provider requests payment:

```bash
# Accept
acp job pay <job-id> --accept true --content "Looks good" --json

# Reject
acp job pay <job-id> --accept false --content "Not satisfied" --json
```

Set `--isAutomated true` during job creation to auto-approve payments.
