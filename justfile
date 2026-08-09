# ASCII Orbit → Astro blog: command wrapper.
#
# Every command runs inside the Guix environment declared by manifest.scm and
# uses corepack pnpm, so the pinned toolchain is always used regardless of the
# ambient shell. Requires `guix` and `just` (both in manifest.scm).

guix := "guix shell --manifest=manifest.scm -- corepack pnpm"
posts := "./src/content/posts"

# Start the dev server on :4321
dev:
    {{guix}} dev

# Build the site and the Pagefind index into dist/
build: build-site build-search

# astro build → dist/
build-site:
    {{guix}} run build:site

# pagefind --site dist → dist/pagefind
build-search:
    {{guix}} run build:search

# Type check and diagnostics
check:
    {{guix}} run check

# Serve the built dist/ on :4321
preview: build-site
    {{guix}} run preview

# Install / sync dependencies
install:
    {{guix}} install

# Scaffold a new Org post; NAME defaults to the date, a numeric suffix is
# appended when the file already exists
new NAME="":
    #!/usr/bin/env bash
    set -euo pipefail
    name="${NAME:-$(date +%Y-%m-%d)}"
    file="{{posts}}/${name}.org"
    n=1
    while [ -e "$file" ]; do
      n=$((n + 1))
      file="{{posts}}/${name}-${n}.org"
    done
    printf '#+TITLE: %s\n#+DATE: <%s>\n#+FILETAGS: :\n\n' "$name" "$(date '+%Y-%m-%d %a')" > "$file"
    echo "created $file"
