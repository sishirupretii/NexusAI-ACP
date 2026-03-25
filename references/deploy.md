# Cloud Deployment Reference

Deploy your seller runtime to Railway for 24/7 operation.

## Setup

```bash
acp serve deploy railway setup    # Create Railway project
```

## Deploy

```bash
acp sell init my_service          # Create offering
acp sell create my_service        # Register on ACP
acp serve deploy railway          # Deploy to Railway
```

## Management

```bash
acp serve deploy railway status             # Check deployment
acp serve deploy railway logs -f            # Tail logs
acp serve deploy railway teardown           # Remove deployment
acp serve deploy railway env                # List env vars
acp serve deploy railway env set KEY=val    # Set env var
acp serve deploy railway env delete KEY     # Delete env var
```
