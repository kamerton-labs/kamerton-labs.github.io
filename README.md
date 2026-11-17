# kamerton-labs.github.io

The website of [Kamerton](https://github.com/kamerton-labs/kamerton): a landing page and the documentation, in English. Built with [VitePress](https://vitepress.dev) and published to GitHub Pages.

## Run locally

Requirements: Node 24 and pnpm 12.

```sh
pnpm install
pnpm dev        # live preview at http://localhost:5173
pnpm build      # static site in docs/.vitepress/dist (fails on dead links)
pnpm preview    # serve the built site, http://localhost:4173
```

## Layout

```
docs/
  index.md                 English landing page
  docs/*.md                English documentation
  public/                  logo, favicon, screenshots (served as is)
  public/screens/          <name>-light.webp and <name>-dark.webp
  .vitepress/config.mts    navigation, sidebar, search
  .vitepress/theme/        colours and fonts (custom.css), components, motion.ts
```

The landing pages are Markdown with a few HTML blocks styled by `custom.css` (`k-*` classes). The theme only overrides VitePress CSS variables; it does not replace any VitePress layout.

## Add a page

1. Create `docs/docs/<name>.md`. Start it with a `# Title`.
2. Add the page to the sidebar in `docs/.vitepress/config.mts` (`sidebar`).
3. Link to it with relative links (`./<name>`) or root links (`/docs/<name>`). Never write the full site origin: the site must keep working if a custom domain is attached.
4. Run `pnpm build`; it fails on dead links.

Write in plain words and short sentences; no exclamation marks or emoji. Every claim must be backed by the Kamerton repository (README, docs, CHANGELOG, NOTICE, chart values).

## Screenshots

Screenshots are real captures of the Kamerton UI at 1440×900, converted to WebP (`cwebp -q 82`). Show one with:

```md
<Shot name="rule-card" alt="What the screenshot shows" caption="Optional caption" />
```

`Shot` loads `/screens/<name>-light.webp` and, in the dark theme, `/screens/<name>-dark.webp`. Pass `:dark="false"` when there is no dark capture.

## Replace the video placeholder

The landing pages contain `<VideoTour />`, which shows one line saying there is no video yet. When the video is ready:

1. Put the file in `docs/public/video/` (for example `kamerton-tour.mp4`, a poster image and optional `.vtt` subtitles), or host it elsewhere.
2. In `docs/index.md` change the tag to:

   ```md
   <VideoTour src="/video/kamerton-tour.mp4" poster="/video/poster.webp" captions="/video/kamerton-tour.en.vtt" />
   ```

   `src` may also be a full URL. Large videos are better hosted outside the repository; GitHub Pages sites have a size limit.

To use a link to a video service instead, replace `<VideoTour />` with a normal Markdown link.

## Deploy

`.github/workflows/deploy.yml` builds the site with pnpm and publishes it with the official Pages actions on every push to `main`. In the repository settings set **Pages → Source** to **GitHub Actions**. A custom domain can be added later in the same settings (and a `docs/public/CNAME` file); no links need to change.

## Licence

AGPL-3.0-only, the same licence as Kamerton. See [LICENSE](LICENSE).
