# Migration Guide: flowershow-publish → @flowershow/publish

This package has been renamed from `flowershow` to `@flowershow/publish` (scoped package).

## What Changed?

### Package Name

- **Old**: `flowershow`
- **New**: `@flowershow/publish`

### Command Name

The command name remains the same: `publish`

## Why the Change?

1. **Scoped package** - Better namespace organization under `@flowershow`
2. **Consistency** - Aligns with other FlowerShow packages
3. **Better discoverability** - Easier to find all FlowerShow packages on npm

## How to Migrate

### 1. Uninstall Old Package

```bash
npm uninstall -g flowershow
```

### 2. Install New Package

```bash
npm install -g @flowershow/publish
```

### 3. No Re-authentication Needed

Your authentication token is stored in `~/.flowershow/token.json` and will continue to work with the new CLI. No need to log in again!

## Breaking Changes

None! All functionality remains the same, only the package name has changed.
