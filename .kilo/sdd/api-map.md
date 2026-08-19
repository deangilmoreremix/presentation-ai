# Upstream (@udecode/*) -> Local (platejs / @platejs/*) API Map — VERIFIED for plate v53

Ported files must compile against the LOCAL codebase (plate v53). Do NOT add any
`@udecode/*` import. The import paths below were confirmed by reading node_modules
type declarations.

## Import substitution table
| Wrong (current code)                          | Correct (local)                          |
|-----------------------------------------------|------------------------------------------|
| `createPlatePlugin` from `"platejs"`          | `from "platejs/react"`                   |
| `useEditorPlugin` from `"platejs"`            | `from "platejs/react"`                   |
| `useEditorRef` from `"platejs"`               | `from "platejs/react"`                   |
| `PlateElement` from `"platejs/react"`         | keep `from "platejs/react"` (already OK) |
| `PlateLeaf` from `"platejs/react"`            | keep `from "platejs/react"` (already OK) |
| `TElement` from `"platejs"`                   | keep `from "platejs"` (OK — slate type)  |
| `TText` from `"platejs"`                      | keep `from "platejs"` (OK — slate type)  |
| `TDescendant` from `"platejs"`                | 🚫 does NOT exist. Use `Descendant` from `"platejs"` (or `TElement` where a node is meant). |
| `PlateElementProps` / `PlateLeafProps`        | these are fine from `platejs/react`; the TS2740 error is caused by OTHER issues (see Component typing) |

## Component typing (the TS2740 "missing type, api, setOptions, tf..." fix)
The TS2740 errors on `PlateElementProps<TElement, PluginConfig>` / `PlateLeafProps`
are NOT about the generic args — `PlateElementProps<N, C>` IS generic and valid.
They are caused by TWO real problems in the file, fixed by the import/withRef fixes:
  1. The file imports `createPlatePlugin` / `useEditorPlugin` from `"platejs"`
     (wrong module) — fixing those imports brings in the correct `platejs/react`
     type universe and resolves the props mismatch.
  2. `withRef<any>(...)` is already used in these files (correct). Do NOT switch to
     `withRef<typeof PlateElement>`.

## withRef signature (utils.tsx, TS2322)
`withRef<T extends ForwardRefExoticComponent<any>>` fails because PlateElement/
PlateLeaf are plain function components in plate v53, not ForwardRefExoticComponent.
Fix: relax the generic bound to `React.FC<any>` (or `any`) in
`src/components/plate/utils.tsx`. Example:
    export function withRef<T extends React.FC<any>>(Component: T) {
      return forwardRef<any, any>((props, ref) => <Component {...props} ref={ref} />) as unknown as T;
    }
(This single change clears utils.tsx AND the generating-leaf withRef<typeof PlateLeaf> error.)

## DnD (CRITICAL nuance)
- `useDraggable({ ... })` / `useDndNode({ ... })` options (type `UseDndNodeOptions`)
  MUST NOT include a top-level `id` field. Remove `id: element.id,` from the
  `useDraggable({...})` call. The draggable node is identified by `element` itself.
- `useDropLine({ id, orientation })` DOES accept `id` — LEAVE the `id` in
  `useDropLine({ id: element.id, orientation })` unchanged.
- `useDropNode`/`useDropLine` are different from `useDraggable`. Do not touch `useDropLine`.

## Verify before finishing
Run from repo root: `npx tsc --noEmit` and ensure ZERO errors in the files you touched.
Report the exact command + final error count for your files.
