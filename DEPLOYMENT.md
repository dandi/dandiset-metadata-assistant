# Deployment Guide

This guide covers deploying both the client application and the Cloudflare Worker proxy server.

## Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Cloudflare account (for proxy deployment)
- GitHub account (for client deployment via GitHub Pages)

## Part 1: Deploy the Proxy Server

The proxy server must be deployed first so you can configure the client with its URL.

### Step 1: Setup Cloudflare Worker

```bash
# Navigate to proxy directory
cd proxy

# Install dependencies
npm install

# Login to Cloudflare (this opens a browser)
npx wrangler login
```

### Step 2: Test Locally (Optional)

```bash
# Run the worker locally
npm run dev
```

Test it with:
```bash
curl http://localhost:8787/health
```

You should see:
```json
{
  "status": "ok",
  "service": "dandiset-metadata-proxy",
  "version": "1.0.0"
}
```

### Step 3: Deploy to Cloudflare

```bash
# Deploy to Cloudflare Workers
npm run deploy
```

After successful deployment, you'll see output like:
```
Published dandiset-metadata-proxy (X.XX sec)
  https://dandiset-metadata-proxy.your-subdomain.workers.dev
```

**Save this URL** - you'll need it for the client configuration.

### Step 4: Verify Deployment

Test the deployed worker:
```bash
curl https://dandiset-metadata-proxy.your-subdomain.workers.dev/health
```

## Part 2: Deploy the Client Application

### Step 1: Configure Environment

Create a `.env` file in the root directory:

```bash
# In the root directory (not in proxy/)
cp .env.example .env
```

Edit `.env` and set the proxy URL from Step 3 above:
```env
VITE_PROXY_URL=https://dandiset-metadata-proxy.your-subdomain.workers.dev
```

### Step 2: Test Locally

```bash
# In the root directory
npm install
npm run dev
```

The app should be available at `http://localhost:5173`.

### Step 3: Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

### Step 4: Deploy to GitHub Pages

If you're using GitHub Pages (as indicated by the repo):

```bash
# Build the project
npm run build

# Deploy to GitHub Pages (method depends on your setup)
# If using gh-pages package:
npm install --save-dev gh-pages
npx gh-pages -d dist
```

Or configure GitHub Actions for automatic deployment (see below).

### GitHub Actions Deployment (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_PROXY_URL: ${{ secrets.VITE_PROXY_URL }}
          
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

Then add the proxy URL as a GitHub secret:
1. Go to your repository Settings
2. Navigate to Secrets and variables → Actions
3. Add a new secret: `VITE_PROXY_URL` with your proxy URL

## Updating After Deployment

### Update Proxy Server

```bash
cd proxy
npm run deploy
```

### Update Client Application

```bash
# In root directory
npm run build

# Then deploy using your method (GitHub Actions will auto-deploy on push)
```

## Configuration Options

### Proxy Server

Edit `proxy/src/index.ts` to modify:
- **Allowed origins**: Update the `ALLOWED_ORIGINS` array
- **DANDI API base URL**: Modify `DANDI_API_BASE` constant
- **Schema cache TTL**: Adjust `SCHEMA_CACHE_TTL` in `validation.ts`

### Client Application

Environment variables (in `.env` or `.env.production`):
- `VITE_PROXY_URL`: Proxy server URL

## Troubleshooting

### Proxy Issues

**Problem**: CORS errors when committing metadata

**Solution**: 
1. Check that your app's origin is in the `ALLOWED_ORIGINS` list in `proxy/src/index.ts`
2. Redeploy the proxy after making changes: `cd proxy && npm run deploy`

**Problem**: "Schema not loaded" errors

**Solution**: 
1. Check proxy logs in Cloudflare dashboard
2. Verify the schema URL is accessible: `https://raw.githubusercontent.com/dandi/dandi-schema/refs/heads/master/releases/latest/dandiset.json`

### Client Issues

**Problem**: Client can't connect to proxy

**Solution**:
1. Verify `VITE_PROXY_URL` is set correctly in `.env`
2. Test the proxy health endpoint directly
3. Check browser console for errors
4. Verify the proxy is deployed and accessible

**Problem**: Build fails

**Solution**:
1. Clear node_modules: `rm -rf node_modules package-lock.json && npm install`
2. Check that all dependencies are installed
3. Verify environment variables are set

## Monitoring

### Cloudflare Dashboard

Monitor your worker at:
- Go to Cloudflare Dashboard
- Navigate to Workers & Pages
- Select `dandiset-metadata-proxy`
- View metrics, logs, and analytics

### Logs

View real-time logs:
```bash
cd proxy
npx wrangler tail
```

## Security Considerations

1. **API Keys**: Never commit API keys to the repository
2. **Origin Whitelist**: Only add trusted origins to the proxy
3. **Rate Limiting**: Consider enabling Cloudflare rate limiting for the proxy
4. **HTTPS**: Always use HTTPS for production deployments

## Cost Considerations

- **Cloudflare Workers**: Free tier includes 100,000 requests/day
- **GitHub Pages**: Free for public repositories

Both should be sufficient for this application's typical usage.
