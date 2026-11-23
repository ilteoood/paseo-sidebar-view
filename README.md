# paseo-sidebar-view

A Paseo plugin that replaces the sidebar content with its own sortable, filterable list of projects and workspaces.

## What you get

- Sorting by name, creation time, or last prompt.
- Grouping by project or by status, with collapsible groups; status headers carry their count.
- Pinned workspaces in a "Pinned" section above the rest.
- Configurable rows: title taken from the workspace title or its branch; branch, project, host, and labels shown or hidden; a trailing slot for added/removed line counts or a relative timestamp.
- Host and project filters, and a switch that reveals background workspaces.
- Row actions: new workspace, copy path, copy branch name, rename, pin, archive.
- Project actions: open project settings (desktop app only), remove the project after a confirmation.
- Sidebar metrics and tints that follow the built-in sidebar: 28px rows, hover, pressed and selected tints, an animated spinner for running workspaces, and a floating display menu anchored to the Workspaces header.

## Screenshots

The default view: projects and workspaces sorted by name.

![Sidebar sorted by name with workspaces nested under their projects](docs/screenshots/sidebar-sorted.png)

Grouped by status instead: one collapsible header per status, carrying its workspace count.

![Workspaces grouped by status, with a DONE header showing its count](docs/screenshots/grouped-by-status.png)

The Sort page of the display menu, opened from the settings button in the Workspaces header.

![Sort page of the display menu with Name selected](docs/screenshots/display-menu.png)

## Settings

Preferences are stored per device through `defineSettings({ id: "sort", scope: "device", version: 1 })`, so they follow the client rather than the daemon. They are edited from the display menu behind the settings button in the Workspaces header. Saves are optimistic; a failed save shows a toast, discards the pending change, and reloads the stored values.

| Option | Accepted values | Default |
| --- | --- | --- |
| Sort | `name`, `created`, `lastPrompt` | `name` |
| Grouping | `project`, `status` | `project` |
| Title source | `title`, `branch` | `title` |
| Show branch | on, off | on |
| Show project | on, off | off |
| Show host | on, off | off |
| Show labels | on, off | off |
| Trailing slot | `none`, `diff`, `timestamp` | `none` |
| Host filter | list of host ids; empty means every host | empty |
| Project filter | list of project keys; empty means every project | empty |
| Show background workspaces | on, off | off |

Sorting is ascending by name, with numbers compared the way people read them, and newest first for creation time and last prompt. The timestamp slot refreshes once a minute. The Host page of the display menu appears only when more than one host is connected.

## Install

A plugin is installed into one Paseo daemon. Directory sources are read on the daemon host; the files are not uploaded.

1. Turn on **Enable plugins** in **Settings → Plugins** on the daemon you are installing into. It is the global switch for every plugin on that host.
2. Install this checkout by its absolute path:

   ```bash
   npm install
   npm run typecheck
   paseo plugin install /absolute/path/to/paseo-sidebar-view
   paseo plugin ls
   ```

   `paseo plugin add` is an alias for `paseo plugin install`, and a relative path is resolved from the current directory. The runtime ID comes from `paseo-plugin.json`; `paseo plugin ls` prints it, and the plugin should report as `running`.

The same absolute path can be pasted into **Settings → Plugins → Plugin source** in the app, followed by **Install plugin**.

Requirements: Paseo >= 0.16.0 (`paseo-plugin.json`), built against `@getpaseo/plugin` 0.16.0 with React 19, React Native Web components, and TypeScript.

### Switch to this sidebar

Registering the view does not activate it. In the client, open **Settings → Sidebar → Sidebar view** and select **Sorted sidebar**. Header items, the callout, and the footer stay in place. When the view is not selected, or the plugin is disabled, the sidebar falls back to the default view.

### Pick up source changes

```bash
npm run typecheck
paseo plugin reload paseo-sidebar-view
```

A reload compiles the current source and starts the plugin again; a failed reload stays failed until the next one.

## How it fits together

| Path | Role |
| --- | --- |
| `index.client.tsx` | Registers the "Sorted sidebar" view (`addSidebarView`, id `sorted`). |
| `index.server.ts` | Registers the `remove-project` RPC handler. |
| `client/sidebar.tsx` | The view itself: workspace queries, filters, row model, menu anchoring. |
| `client/rows.tsx` | Workspace and project rows, status indicators, row action menus, rename and removal dialogs. |
| `client/menu.tsx` | Renders the floating menu surface and its rows. |
| `client/menu-placement.ts` | Places the menu above or below its anchor inside the sidebar. |
| `client/menu-entries.ts` | Menu entry type and the display menu page names. |
| `client/display-pages.ts` | Entries for each display menu page. |
| `client/preferences-draft.ts` | Draft preferences, optimistic apply, failure toast. |
| `client/preferences-save.ts` | Decides whether a draft should be written and compares documents. |
| `client/workspace-sort.ts` | Workspace comparators and project ordering. |
| `client/sidebar-styles.ts` | Row, header, and menu metrics. |
| `client/dialogs.tsx` | Rename and remove-project dialog bodies. |
| `client/spinner.tsx` | Animated running spinner. |
| `client/relative-time.ts` | Relative timestamp formatting. |
| `client/use-now.ts` | Clock that drives the timestamp slot. |
| `client/removal-message.ts` | Toast copy after a project removal. |
| `shared/preferences.ts` | Preference schema, defaults, labels, settings definition. |
| `shared/project-removal.ts` | `remove-project` RPC contract. |
| `server/project-removal.ts` | RPC handler that removes the project through the Paseo CLI. |

## Checks

```bash
npm run typecheck
npm test
```

`typecheck` runs `tsc --noEmit`; `test` runs `node --test` over the `*.test.ts` files beside the code.
