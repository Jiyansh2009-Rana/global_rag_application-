---
name: llm-text-generate
description: Automated generation, validation, and maintenance of llms.txt, llms-full.txt, and markdown content negotiation for LLM crawlers and AI search agents based on iannuttall/seo.
---

# LLM Text Generate & Validation Skill

Generates, validates, and maintains `/llms.txt` and `/llms-full.txt` files for web platforms to make documentation, core capabilities, and system schemas easily ingestible by LLMs, AI search engines (Perplexity, ChatGPT Search, Gemini), and autonomous coding agents.

## Specification Standard (`/llms.txt`)

An `llms.txt` file is placed at the root of a domain (`https://<domain>/llms.txt`) following the standard format:

```markdown
# Title of the Project / Platform

> Short one-paragraph summary of what the platform is and what it does.

## Core Capabilities
- [Feature 1](/docs/feature1): Description of feature 1
- [API Reference](/api/docs): Direct link to machine-readable endpoints

## Optional / Context
- [Architecture Details](/docs/architecture): In-depth system design
```

## Workflows

1. **Generation**:
   - Inspect existing platform documentation (`README.md`, `AGENTS.md`, OpenAPI spec `/docs`).
   - Extract key URLs, features, and public endpoints.
   - Format into clean Markdown without HTML tags or client-side rendering requirements.

2. **Validation**:
   - Verify that `/llms.txt` returns `HTTP 200` with `Content-Type: text/plain; charset=utf-8` or `text/markdown`.
   - Ensure all internal links resolve to valid endpoints or documents.
   - Confirm that crawler user-agents (`GPTBot`, `ClaudeBot`, `PerplexityBot`) are not blocked from reading it in `robots.txt`.

3. **Crawl & Audit**:
   - Use `seo crawl --url <domain>` or local test commands to ensure the file is served cleanly by the reverse proxy (Nginx / Cloudflare).
