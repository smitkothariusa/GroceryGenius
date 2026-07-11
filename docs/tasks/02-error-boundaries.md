# 02 — Add Error Boundaries to Frontend

**Priority:** 🔴 Critical
**Effort:** S (half day)
**Status:** NOT STARTED

## Problem

Confirmed via `grep -rl "ErrorBoundary\|componentDidCatch" frontend/src` →
no matches. There is no error boundary anywhere in the app. A render-time
exception thrown by any component — including inside the 7700-line
`App.tsx` monolith — unmounts the entire React tree and shows a blank white
screen with no recovery path.

## Implementation

1. Create `frontend/src/components/ErrorBoundary.tsx`:
   ```tsx
   import { Component, ErrorInfo, ReactNode } from 'react';

   interface Props {
     children: ReactNode;
     fallback?: (error: Error, reset: () => void) => ReactNode;
   }
   interface State {
     error: Error | null;
   }

   export class ErrorBoundary extends Component<Props, State> {
     state: State = { error: null };

     static getDerivedStateFromError(error: Error): State {
       return { error };
     }

     componentDidCatch(error: Error, info: ErrorInfo) {
       // log to error_logs table (see backend logging_config / existing
       // Supabase error_logs usage elsewhere in the app) rather than
       // console-only, so this is discoverable the same way as backend errors
     }

     reset = () => this.setState({ error: null });

     render() {
       if (this.state.error) {
         if (this.props.fallback) {
           return this.props.fallback(this.state.error, this.reset);
         }
         return <DefaultFallback error={this.state.error} reset={this.reset} />;
       }
       return this.props.children;
     }
   }
   ```

2. **All user-visible text in the fallback UI goes through i18n** (mandatory
   per CLAUDE.md — 6 languages, no hardcoded strings). Add the fallback
   copy keys to whatever i18n system `App.tsx` already uses (grep for the
   existing translation helper before inventing a new pattern).

3. **Placement** — wrap at two levels, not just the root:
   - Root level in `main.tsx`/`App.tsx` entry, so a total crash still shows
     a "something went wrong, reload" screen instead of blank white.
   - Around each major feature region inside `App.tsx` (recipe generator,
     pantry manager, shopping list, meal planner — whatever the top-level
     view sections currently are) so one feature crashing doesn't take down
     navigation and the others. Since `App.tsx` is a monolith, this can be
     done without extracting components first — just wrap the JSX blocks
     for each section.

4. Match existing visual design — purple-blue gradient + system-ui,
   `Toast.tsx`/error styling patterns already in the codebase, not the
   dormant Bright Kitchen palette.

5. Mobile-friendly fallback (per CLAUDE.md mobile-first requirement) — test
   at small viewport.

## Verification

- [ ] Temporarily throw inside a component during dev, confirm the boundary
      catches it and the rest of the app (nav, other sections) stays
      interactive
- [ ] Fallback text renders correctly in all 6 languages
- [ ] `npx tsc --noEmit` passes
- [ ] Caught errors show up wherever backend errors are already logged
      (check `error_logs` table pattern) so this isn't a silent catch
