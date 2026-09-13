# Supabase

Nothing here yet. The database schema arrives in Phase 3 of the build order
(PROJECT_SPEC.md section 27), and the Row-Level Security policies that enforce
anonymity arrive in Phase 6.

When migrations land, they go in `supabase/migrations/` as numbered SQL files,
so the history of how the database changed is tracked the same way the code is.

## The shape it will take

Written down here early because it is the decision everything else depends on,
and because it is a correction to what the spec originally said.

    pickles         id, jar_id, text_content, drawing_url, revealed, created_at
    pickle_authors  pickle_id, author_id

`pickles` carries no author column. `pickle_authors` gets a Row-Level Security
policy returning only rows where `author_id = auth.uid()`, which is what makes
"you wrote this" work for the author and returns nothing for anyone else.

Row-Level Security filters rows, not columns — so keeping the author id in a
separate table is not a stylistic preference. It is the difference between a
promise the database enforces and a promise the interface merely displays.
