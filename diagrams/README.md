Mermaid workflow diagram for MonoLog

Files
- `logic-workflow.mmd` — a Mermaid flowchart describing the app root layout, main swipe views, major components, and backend API endpoints.

How to preview
- In VS Code: install a Mermaid preview extension (e.g. "Markdown Preview Enhanced" or "Mermaid Preview"). Open `logic-workflow.mmd` and use the extension to render.
- Online: copy the contents into the Mermaid Live Editor (https://mermaid.live).

What the diagram shows
- Root layout composition (Header, AppShell, Navbar, ToastProvider, preloader)
- AppShell swipe/main views: Feed, Explore, Upload, Calendar, Profile
- Key UI components used by those views (PostCard, PostView, ImageEditor, PostsList)
- Important API route groupings under `app/api/` used by those features (posts, comments, users, storage, communities, threads)

Next steps
- Generate a PNG/SVG export from the Mermaid live editor or use a VS Code extension to export.
- Expand the diagram with more detail per view (component trees, hooks, auth flows) if needed.
