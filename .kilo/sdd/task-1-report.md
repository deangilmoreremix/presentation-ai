status: DONE
commit: 6f4c014c486529954979d19f585e0819591e5ae8
verification: npx tsc --noEmit 2>&1 | grep "utils.tsx" returned no output — the utils.tsx TypeScript error is resolved.
concerns: The generic bound change from ForwardRefExoticComponent to FC<any> required an additional `const C = Component as any` cast inside withRef's body. This is because FC<any> does not declare ref in its props type, so TypeScript rejects passing ref={ref} to a plain function component even though React handles it at runtime. The cast preserves the original runtime behavior while satisfying the type checker.
