// =============================================================================
// Docker template generators — provider-agnostic.
// =============================================================================

export function generateDockerfile(): string {
  return `FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --include=dev

COPY . .

CMD ["npx", "tsx", "src/seller/runtime/seller.ts"]
`;
}

export function generateDockerignore(): string {
  return `node_modules
dist
.git
.gitignore
.env
config.json
active-bounties.json
seller.log
.vscode
.idea
*.md
!README.md
`;
}
