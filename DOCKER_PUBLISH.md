# Docker Image Publishing Guide

## Prerequisites

1. **Docker Hub Account**: Create a free account at https://hub.docker.com if you don't have one
2. **Docker Login**: Authenticate your local Docker with Docker Hub

## Step-by-Step Publishing Process

### 1. Login to Docker Hub

```bash
docker login
```

Enter your Docker Hub username and password when prompted.

### 2. Tag Your Image

You need to tag your image with your Docker Hub username:

```bash
# Format: docker tag <local-image> <dockerhub-username>/<repository-name>:<tag>
docker tag sow-gen-app <YOUR_DOCKERHUB_USERNAME>/sow-gen-app:latest

# Optional: Add version tag
docker tag sow-gen-app <YOUR_DOCKERHUB_USERNAME>/sow-gen-app:1.0.0
```

**Example:**
```bash
docker tag sow-gen-app harrydocker/sow-gen-app:latest
docker tag sow-gen-app harrydocker/sow-gen-app:1.0.0
```

### 3. Push to Docker Hub

```bash
docker push <YOUR_DOCKERHUB_USERNAME>/sow-gen-app:latest
docker push <YOUR_DOCKERHUB_USERNAME>/sow-gen-app:1.0.0
```

**Example:**
```bash
docker push harrydocker/sow-gen-app:latest
docker push harrydocker/sow-gen-app:1.0.0
```

### 4. Update docker-compose.yml for Production

Update your `docker-compose.yml` to use the published image:

```yaml
services:
  app:
    image: <YOUR_DOCKERHUB_USERNAME>/sow-gen-app:latest  # Use published image
    # Remove 'build: .' line
    container_name: sow-gen-app
    ports:
      - "5000:5000"
    # ... rest of config
```

## Alternative: GitHub Container Registry (GHCR)

If you prefer using GitHub Container Registry instead:

### 1. Create GitHub Personal Access Token
- Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
- Generate new token with `write:packages` and `read:packages` scopes
- Save the token securely

### 2. Login to GHCR

```bash
echo YOUR_GITHUB_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### 3. Tag for GHCR

```bash
docker tag sow-gen-app ghcr.io/mind-menders/sow-gen-app:latest
docker tag sow-gen-app ghcr.io/mind-menders/sow-gen-app:1.0.0
```

### 4. Push to GHCR

```bash
docker push ghcr.io/mind-menders/sow-gen-app:latest
docker push ghcr.io/mind-menders/sow-gen-app:1.0.0
```

## Deploying Elsewhere

Once published, you can deploy on any server with:

```bash
# Pull the image
docker pull <YOUR_DOCKERHUB_USERNAME>/sow-gen-app:latest

# Or use docker-compose
docker compose pull
docker compose up -d
```

## Production docker-compose.yml Template

Create a `docker-compose.prod.yml` for production deployments:

```yaml
version: "3.9"

services:
  app:
    image: <YOUR_DOCKERHUB_USERNAME>/sow-gen-app:latest
    container_name: sow-gen-app
    restart: unless-stopped
    ports:
      - "5000:5000"
    env_file: .env
    environment:
      NODE_ENV: production
      SESSION_SECURE: "true"  # Enable in production with HTTPS
      MONGODB_URI: mongodb://mongo:27017/sow_generator
      PORT: 5000
    depends_on:
      - mongo
    networks:
      - sow-network

  mongo:
    image: mongo:7
    container_name: sow-gen-mongo
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    networks:
      - sow-network

volumes:
  mongo-data:

networks:
  sow-network:
    driver: bridge
```

## Automated Build with GitHub Actions

Create `.github/workflows/docker-publish.yml`:

```yaml
name: Docker Image CI

on:
  push:
    branches: [ main, master ]
    tags: [ 'v*' ]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          <YOUR_DOCKERHUB_USERNAME>/sow-gen-app:latest
          <YOUR_DOCKERHUB_USERNAME>/sow-gen-app:${{ github.sha }}
```

## Quick Commands Reference

```bash
# Login
docker login

# Build
docker compose build

# Tag
docker tag sow-gen-app <username>/sow-gen-app:latest

# Push
docker push <username>/sow-gen-app:latest

# Pull (on another server)
docker pull <username>/sow-gen-app:latest

# Deploy
docker compose -f docker-compose.prod.yml up -d
```

## Security Notes

⚠️ **Important:**
- Never commit `.env` files with sensitive data
- Use Docker secrets or environment variables for production
- Enable `SESSION_SECURE: "true"` when using HTTPS
- Consider using private registries for proprietary code
- Regularly update base images for security patches

## Troubleshooting

**Error: "denied: requested access to the resource is denied"**
- Solution: Make sure you're logged in with `docker login`
- Verify your Docker Hub username is correct in the image tag

**Error: "repository does not exist"**
- Solution: The repository is created automatically on first push
- Ensure the image name format is correct: `username/repository:tag`

**Large Image Size**
- Solution: Use `.dockerignore` to exclude unnecessary files
- Already configured in your project

## Cost Considerations

- **Docker Hub Free Tier**: 
  - Unlimited public repositories
  - 1 private repository
  - Rate limits on pulls
  
- **GitHub Container Registry**:
  - Free for public repositories
  - Storage limits apply

- **Production Alternatives**:
  - AWS ECR (Elastic Container Registry)
  - Google Container Registry
  - Azure Container Registry
  - Harbor (self-hosted)
