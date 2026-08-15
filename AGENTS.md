Before implementing a change, review the relevant existing code and identify whether the new work overlaps with logic, data structures, APIs, validation, state handling, or behavior that already exists.

Use the existing code as context to decide whether the system needs better primitives.

A primitive may be:                       
- a reusable function
- a data type                            
- an interface
- an API endpoint
- a validation rule                      
- a state transition
- a module boundary                     
- a shared error-handling pattern
- a test helper                           
- a storage abstraction
- a domain-specific operation

Before adding new feature code, ask:      
1. Does this behavior already exist somewhere?
2. Is similar logic duplicated or beginning to diverge?
3. Is there an implicit concept in the code that should be made explicit?
4. Is a feature becoming hard to build because the underlying primitives are weak?
5. Would a small, reliable abstraction make this feature and future features simpler?
6. Are there places where the code is working but the boundaries are unclear?       7. Are there assumptions hidden in implementation details that should become named contracts?

When you find these opportunities, prefer improving the underlying primitive before layering more behavior on top.

Do not refactor for its own sake. Refactor only when it makes the current task simpler, removes duplication, clarifies a concept, strengthens correctness, or creates a stable foundation for nearby future work. 

The goal is to continuously turn repeated patterns and implicit concepts into simple, reliable, well-tested building blocks.

Never use loose types - 

## Database and deployment changes

- Put each schema change in a new ordered file in `migrations/`.
- Add a PostgreSQL integration test for each schema or persistence change.
- Run `npm run test:db` against a disposable PostgreSQL database before merge.
- Keep migrations transaction-safe and compatible with the deployed application. Use separate expand, backfill, and contract releases for destructive changes.
- Run production migrations before the production build. Do not run migrations from request handlers or application startup.
- Treat a failed migration as a failed deployment. Do not bypass the migration or required CI checks.
- Verify the exact production deployment and its affected API routes before you report completion.
