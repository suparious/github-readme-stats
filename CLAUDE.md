# CLAUDE.md - GitHub Readme Stats

**Attach to conversations about github-readme-stats only.**

---

## Component Context

- **Type**: App (standalone repo, forked from anuraghazra/github-readme-stats)
- **Purpose**: Generate dynamic GitHub stats SVG cards for README profiles
- **Platform**: srt-hq-k8s
- **Location**: `/Users/shaun/repos/github-readme-stats/`
- **Repository**: https://github.com/suparious/github-readme-stats
- **Upstream**: https://github.com/anuraghazra/github-readme-stats

---

## Architecture

**Runtime**: Node.js 22 (ESM)
**Entry Point**: `server.js` (Express server)
**API Routes**: `api/*.js` (route handlers)
**Cache**: Optional Redis/Valkey for GitHub API response caching

### Key Files

| File | Purpose |
|------|---------|
| `server.js` | Express HTTP server with health endpoints |
| `api/index.js` | Stats card endpoint |
| `api/pin.js` | Repository pin card endpoint |
| `api/top-langs.js` | Top languages card endpoint |
| `api/wakatime.js` | WakaTime stats endpoint |
| `api/gist.js` | Gist card endpoint |
| `src/common/redis.js` | Redis client wrapper |
| `src/fetchers/*.js` | GitHub API fetchers |
| `src/cards/*.js` | SVG card renderers |

### Endpoints

| Path | Description |
|------|-------------|
| `/api` | Stats card |
| `/api/pin` | Repository pin card |
| `/api/top-langs` | Top languages card |
| `/api/wakatime` | WakaTime stats card |
| `/api/gist` | Gist card |
| `/health` | Liveness probe |
| `/ready` | Readiness probe (checks Redis) |

---

## Platform Dependencies

### Required (Core)

| Dependency | Purpose |
|------------|---------|
| ingress | External HTTPS access via github-stats.solidrust.net |
| cert-manager | Automatic SSL certificates (DNS-01) |

### Optional (Services)

| Service | Purpose | Integration |
|---------|---------|-------------|
| data/valkey | API response caching | Set `REDIS_HOST`, `REDIS_PORT` |
| observability | Metrics collection | Add ServiceMonitor to k8s/ |

### External Dependencies

| Endpoint | Purpose | Required |
|----------|---------|----------|
| api.github.com | GitHub API data | Yes |
| valkey.shared-data-layer.svc.cluster.local:6379 | Cache | No |

### Dependency Declaration (Machine-Readable)

```yaml
dependencies:
  requires:
    core:
      - ingress
      - cert-manager
    services: []
  optional:
    services:
      - data/valkey
      - observability
  external:
    - endpoint: "api.github.com"
      purpose: "GitHub API for stats"
      required: true
    - endpoint: "valkey.shared-data-layer.svc.cluster.local:6379"
      purpose: "Redis-compatible cache"
      required: false
```

---

## Building

### Local Development

```bash
# Install dependencies
npm install

# Run locally
PAT_1=ghp_xxx npm run start

# Or with explicit server.js
PAT_1=ghp_xxx node server.js

# With Redis caching
REDIS_HOST=localhost REDIS_PORT=6379 PAT_1=ghp_xxx node server.js
```

### Docker Build

```bash
# Build image
docker build -t github-readme-stats .

# Run locally
docker run -p 9000:9000 -e PAT_1=ghp_xxx github-readme-stats

# Build and push to Gitea registry
docker build -t poseidon.hq.solidrust.net:30008/shaun/github-readme-stats:v1.0.0 .
docker push poseidon.hq.solidrust.net:30008/shaun/github-readme-stats:v1.0.0
```

---

## Deployment

Deployed to srt-hq-k8s via FluxCD:
- **Manifests**: `/Users/shaun/repos/srt-hq-k8s/manifests/apps/github-stats/`
- **Image**: `poseidon.hq.solidrust.net:30008/shaun/github-readme-stats`
- **Namespace**: `github-stats`

### Manual Trigger

```bash
# Force Flux reconciliation
flux reconcile ks github-stats

# Check deployment status
kubectl get pods -n github-stats
kubectl logs -n github-stats -l app=github-stats
```

---

## Access

- **URL**: https://github-stats.solidrust.net
- **Internal**: github-stats.github-stats.svc.cluster.local:9000
- **Usage**: `/api?username=suparious` - Generate stats card

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PAT_1` | Yes | GitHub Personal Access Token (can have multiple: PAT_1, PAT_2, etc.) |
| `PORT` | No | HTTP port (default: 9000) |
| `REDIS_HOST` | No | Redis/Valkey hostname |
| `REDIS_PORT` | No | Redis/Valkey port (default: 6379) |
| `CACHE_SECONDS` | No | Override default cache TTL |
| `FETCH_MULTI_PAGE_STARS` | No | Enable multi-page star fetching |

### Secrets (Kubernetes)

| Secret | Namespace | Keys |
|--------|-----------|------|
| `github-token` | `github-stats` | `PAT_1` (or multiple PATs) |

---

## Troubleshooting

### Common Issues

1. **GitHub API rate limiting**
   - Add multiple PATs: `PAT_1`, `PAT_2`, etc.
   - Enable Redis caching to reduce API calls
   - Check token scopes (needs `read:user` at minimum)

2. **Redis connection issues**
   ```bash
   # Verify Valkey is accessible
   kubectl exec -n shared-data-layer deploy/valkey -- redis-cli PING
   ```

3. **Pod not starting**
   ```bash
   kubectl describe pod -n github-stats -l app=github-stats
   kubectl logs -n github-stats -l app=github-stats
   ```

4. **Cards not rendering**
   - Check if username is valid
   - Verify GitHub token has correct permissions
   - Check for GraphQL errors in logs

---

## Development Notes

### Fork Maintenance

This is a fork with self-hosting modifications:
- Added Express server with health endpoints (`server.js`)
- Added Redis caching layer (`src/common/redis.js`)
- Added Dockerfile for containerization
- Removed Vercel-specific configuration

### Upstream Sync

```bash
git remote add upstream https://github.com/anuraghazra/github-readme-stats.git
git fetch upstream
git merge upstream/master --no-commit
# Resolve conflicts, keeping our modifications:
# - server.js
# - src/common/redis.js
# - Dockerfile
# - package.json dependencies
```

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

---

## User Preferences

When working on this app:
- Complete, production-ready solutions
- Run commands directly (no permission prompts)
- NO workarounds or temp fixes
- Keep Express patterns consistent

---

## References

- **Platform**: `/Users/shaun/repos/srt-hq-k8s/PLATFORM.md`
- **Main CLAUDE.md**: `/Users/shaun/repos/srt-hq-k8s/CLAUDE.md`
- **K8s Manifests**: `/Users/shaun/repos/srt-hq-k8s/manifests/apps/github-stats/`
- **Upstream Docs**: https://github.com/anuraghazra/github-readme-stats

---

**Version**: 1.0 | **Updated**: 2026-01-23
