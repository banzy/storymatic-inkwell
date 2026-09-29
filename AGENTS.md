<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Storymatic project modes
- Keep Develop and Book as views of the Mongo-backed EngineState at `/book/$projectId` (Book uses `?view=book`), and Manuscript at `/p/$projectId`; a shared project shell connects them because they are modes of one project, not separate products.
- Keep older manuscript-derived Story Space secondary and separate from EngineState because its data is not yet synchronized with developing-book memory.
