# Static site

The site address is https://fp4-is-all-you-need.github.io/AWE/ .
The source and data are distributed under the [MIT License](../LICENSE).

## Build and check locally

Use Node 22.12 or later and Python 3.10 or later.

```sh
npm --prefix site ci
npm --prefix site run build:pages
python3 tools/serve_pages.py --directory site/dist
```

Open http://127.0.0.1:4176/AWE/ . The server has no HTML fallback for missing data.
Vite uses `base: './'`; the JSON data, workers, scripts and fonts use relative URLs.
The build checks catalog hashes and writes `manifest.json` with the size and SHA-256
of every distribution file. `publication.json` records metadata omitted from the site.
Source data, mathematical checks and provenance hashes remain in the repository.

To run the browser checks (after installing Chromium for Playwright):

```sh
cd site
npx playwright install chromium
npx playwright test --config playwright.pages.config.mjs
```

The tests check English and Japanese, wide and narrow screens, interactive selection,
and every file served under `/AWE/`. Reports and screenshots are written to `build/`.
An additional set of private disclosure patterns can be supplied to
`python3 tools/pages_artifact.py audit --rules /path/to/rules.json`.
Rules are a JSON object mapping category names to regular expressions; keep that file outside the repository.

## Publish

`tools/publish_org.sh --publish` creates the public organization repository and publishes
both source and site. This is an explicit publishing command, not part of a build.
It requires Git, authenticated GitHub CLI, Python and npm. Set `AWE_PUBLISH_TREE`
to the full Git tree ID recorded at approval; the script stops if the current tree
differs. Do not derive this value from HEAD at publication time. The exported commit
is fixed before any network operations.

The default author and committer are `meme-dayo <107521440+meme-dayo@users.noreply.github.com>`.
`AWE_PUBLISH_NAME` and `AWE_PUBLISH_EMAIL` can override them.

The script exports the `release-org` tree into a new repository with one commit on
`main`, builds that copy, then pushes the static files as one commit on `gh-pages`.
It creates or updates Pages to serve the root of that branch. It uses no Actions workflow.
The script refuses an existing destination and checks sizes before any creation or push.
The original development history is not copied.

Keep generated files out of the source branch. Each site publication replaces the
single-commit generated branch, avoiding accumulated copies of the data there.
This script prepares the first publication; later releases must be reviewed separately.

GitHub blocks repository files larger than 100 MiB and warns above 50 MiB. This
script uses stricter decimal limits of 100 MB per file and 1 GB for the site.
See [large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)
and [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
GitHub Free supports Pages for public repositories; private repositories need an eligible paid plan.
