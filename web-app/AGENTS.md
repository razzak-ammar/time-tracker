# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` contains Next.js App Router routes (e.g., `src/app/dashboard`, `src/app/time-entries`).
- `src/components/` holds reusable UI and feature components; shadcn/ui primitives live in `src/components/ui/`.
- `src/contexts/`, `src/hooks/`, `src/lib/`, and `src/types/` store shared state, hooks, utilities/Firebase setup, and TypeScript types.
- Static assets are served from `public/`.

## Build, Test, and Development Commands
- `npm run dev`: start the Next.js dev server with Turbopack.
- `npm run build`: create a production build.
- `npm run start`: run the production server from the build output.
- `npm run lint`: run Next.js ESLint checks.

## Coding Style & Naming Conventions
- Use TypeScript and React function components; prefer hooks for shared logic.
- Indentation: 2 spaces (default Next.js/TS style).
- Components use `PascalCase` filenames and exports (e.g., `OrganizationCard.tsx`).
- Hooks use `use` prefix (e.g., `useTimer.ts`); utilities are `camelCase`.
- Tailwind CSS is the primary styling approach; keep class lists readable and grouped by layout/spacing/color.

## Testing Guidelines
- No dedicated test framework or test files are present in the repository right now.
- Use `npm run lint` before submitting changes.
- If you add tests, co-locate with source or use a `__tests__/` folder and include clear, intent-based names (e.g., `timer-utils.test.ts`).

## Commit & Pull Request Guidelines
- Follow the existing commit message style: short, past-tense summaries like “Added …”, “Updated …”, “Renamed …”.
- Keep commits focused on a single change set.
- PRs should include a concise description, testing notes, and screenshots for UI changes.
- Link related issues or tasks when applicable.

## Configuration & Environment
- Copy `env.example` to `.env.local` and set Firebase credentials.
- Never commit `.env.local`; use `env.example` to document required variables.
