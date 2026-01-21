# Project: Multi-agent RAG app

## Tech stack

- Frontend: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- Backend: Python FastAPI in `python-service/` (serving AutoGen agents)
- AI/ML: OpenAI GPT-4o, Microsoft AutoGen, Pinecone for vector search
- Infra: Docker, Docker Compose, Kubernetes manifests in `k8s/manifests/`

## Goals

- Document RAG over PDFs and crawled sites (chunk → embed with OpenAI → store in Pinecone → semantic search)
- Multi-agent chat: Researcher, Analyst, Reviewer AutoGen agents
- Streaming responses via Vercel AI SDK
- Dark/light mode via React context

## How to run things

- Frontend dev: `pnpm dev` (or `npm run dev`) in repo root
- Frontend build: `pnpm build`
- Python service dev: `uvicorn python-service.main:app --reload`
- Tests (frontend): `pnpm test`
- Tests (backend): `pytest` inside `python-service/`
- Docker compose: `docker compose up --build`
- Kubernetes manifests: `kubectl apply -f k8s/manifests/`

## Coding standards

- TypeScript:
  - Prefer function components + hooks
  - Strong typing (no `any`), explicit return types
  - Co-locate components in `src/app/components/` when possible
  - Use Tailwind utility classes; avoid inline styles
  - Keep server/client components clearly separated in Next.js 15 (use `"use client"` only when needed)
- React:
  - Use React 19 conventions (modern hooks, no legacy lifecycles)
  - Keep components small and focused; lift state where appropriate
- FastAPI:
  - Organize routes, schemas, and services in `python-service/`
  - Use Pydantic models for request/response DTOs
  - Keep AutoGen agent wiring in dedicated modules
- RAG:
  - Put embedding + Pinecone logic under `src/app/utils/`
  - Keep chunking/embedding code pure and testable

## Git & commits

- Use Conventional Commits:
  - `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `test:`, `perf:`
- Prefer small, focused commits.
- Mention tests in the commit body if added/changed.
- Do **not** create or modify Kubernetes manifests unless asked.

## How Claude Code should help

- Before coding:
  - Read relevant files and summarize current behavior.
  - Propose a brief plan and wait for approval for multi-file changes.
- When coding:
  - Show full file contents for any file you modify.
  - Update or add tests when behavior changes.
- After coding:
  - Suggest a Conventional Commit message.
  - Show the git commands to run (status, commit, push) but do not assume branch names.
