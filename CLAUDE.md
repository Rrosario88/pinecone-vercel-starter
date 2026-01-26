# PINECONE-VERCEL-STARTER

This file defines Claude Code's behavior for PINECONE-VERCEL-STARTER.

## Tech stack

- Frontend: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- Backend: Python FastAPI in `python-service/` (serving AutoGen agents)
- AI/ML: OpenAI GPT-4o, Microsoft AutoGen, Pinecone for vector search
- Infra: Docker, Docker Compose, Kubernetes manifests in `k8s/manifests/`

## Goals

- Document RAG over PDFs and crawled sites
(chunk → embed with OpenAI → store in Pinecone → semantic search)
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

## Project Coding Principles

These must be strictly enforced in all code and proposed changes:

- **File Length and Structure**: Never allow a file to exceed 500 lines.
  If a file approaches 400 lines, break it up immediately.
  Treat 1000 lines as unacceptable, even temporarily.
  Use folders and naming conventions to keep small files logically grouped.
- **OOP First**: Every functionality should be in a dedicated class,

  struct, or protocol, even if it's small.

  Favor composition over inheritance, but always use object-oriented thinking.

  Code must be built for reuse, not just to "make it work."

  (Adapt to React: Use functional components with hooks

  for state/logic encapsulation,

  but think in terms of composable, reusable modules.)
- **Single Responsibility Principle**: Every file, class, and function

  should do one thing only.

  If it has multiple responsibilities, split it immediately.

  Each view, manager, or utility should be laser-focused on one concern.
- **Modular Design**: Code should connect like Lego –

  interchangeable, testable, and isolated.

  Ask: "Can I reuse this class in a different screen or project?"

  If not, refactor it.

  Reduce tight coupling between components.

  Favor dependency injection or protocols

  (in React: Use props, contexts, or hooks for loose coupling;

  in Python: Use dependency injection via FastAPI Depends or similar).
- **Manager and Coordinator Patterns**: Use ViewModel, Manager, and Coordinator

  naming conventions

  for logic separation:

  – UI logic → ViewModel (e.g., custom hooks or state management in React)

  – Business logic → Manager

  – Navigation/state flow → Coordinator

  (e.g., via React Router/context providers or Python orchestration classes).

  Never mix views and business logic directly.
- **Function and Class Size**: Keep functions under 30–40 lines.

  If a class/component is over 200 lines,

  assess splitting into smaller helper classes/components.
- **Naming and Readability**: All class, method, and variable names

  must be descriptive

  and intention-revealing. Avoid vague names like data, info, helper, or temp.
- **Scalability Mindset**: Always code as if someone else will scale this.

  Include extension points (e.g., protocol conformance, dependency injection)

  from day one

  (in React: Use interfaces, avoid props drilling via contexts;

  in Python: Use abstract classes or protocols).
- **Avoid God Classes**: Never let one file or class hold everything

  (e.g., massive ViewController, ViewModel, or Service).

  Split into UI, State, Handlers, Networking, etc.

  (In Next.js: Avoid bloated pages; use separate components, hooks, and utils.

  In FastAPI: Separate routes, services, and models.)

## Coding standards

- TypeScript:
  - Prefer function components + hooks
  - Strong typing (no `any`), explicit return types
  - Co-locate components in `src/app/components/` when possible
  - Use Tailwind utility classes; avoid inline styles
  - Keep server/client components clearly separated in Next.js 15
  (use `"use client"` only when needed)
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
  - Show the git commands to run
  (status, commit, push) but do not assume branch names.
