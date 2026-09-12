# PumpDuel marketing assets

The standalone social asset gallery lives directly in this repository's base folder. `index.html` is the page entry point; `catalog.json` contains the reviewed posts, captions and explicit list of media files.

Run `npm run preview` with Node 22 or later. No dependency installation, credentials, database or PumpDuel app checkout is required. The preview builds the public output and listens at http://127.0.0.1:8879.

## Phone workflow

- Open the hosted HTTPS page in iPhone Safari.
- Save one photo, save a story set with **Save post**, or choose a custom selection with the checkboxes.
- Choose **Save Image**, **Save Images** or **Save Video** in the iOS share sheet. iOS owns this final action.
- Copy a caption separately. Videos currently represented in this kit are cover images, not finished MP4s.

Visible images are prepared for file sharing in advance. A selection that is still loading asks for a fresh tap after preparation so iOS user activation is preserved. Unsupported selections show direct individual images; the page does not substitute ZIPs or force a Files download. A completed share call is never labelled as a confirmed Photos save.

Actual iPhone Photos imports, batch limits and mixed image/video behaviour must be checked on the target device over HTTPS. Desktop preview testing cannot verify these OS actions. Localhost on a phone refers to the phone itself; the Mac preview URL is not a hosted phone URL.

## Brand account setup guide

The Instagram, Facebook and TikTok tabs include an expandable brand setup guide with direct profile, Story, Highlight-cover and first-post save controls. It explains the recommended account type, profile copy, Instagram Story-to-Highlight workflow, Facebook Page setup and TikTok cover, website, music and disclosure options. Platform help links are included in the guide; menu labels and account availability can vary. No accounts are created or changed by the guide.

## Hosting

Run `npm run build` and publish only the generated `dist` folder with an HTTPS static host. Keep the project root as the build/source folder. Do not serve the Git checkout itself.

The build copies only the page files, reviewed catalogue assets and required font/license. The preview likewise serves an explicit URL allowlist, has no directory listing and never exposes the source repository or import receipt. Unexpected file extensions, changed asset hashes, symlinks and unexpected PNG metadata make validation fail. Rebuilding replaces the generated `dist` folder.

## Imported material

The 43 public PNGs use format-specific layouts, outlined PumpDuel typography, profile marks and Highlight covers. Each of the 12 Instagram Story slides has its own independently generated photograph in `campaign/masters/stories`: different people, settings, actions and camera compositions, including both slides of every pair. The scene assignments, exact generation prompts, dimensions and source hashes are recorded in [campaign/story-scenes.json](campaign/story-scenes.json). These images were made with the built-in image-generation tool. Tests reject missing assignments and repeated source photographs.

The other formats use the three original photographic masters. Story master resolution is 1122 × 1402; the original masters are 1672 × 941 or 941 × 1672. Larger output dimensions do not add photographic detail. Campaign people are AI-generated marketing illustrations, not customers or testimonials. `IMPORT-AUDIT.json` records the retired first-generation exports and remains excluded from the public build.

Run `npm ci` once, then `npm run redesign` to regenerate every platform export and refresh its byte count and SHA-256 integrity record in `catalog.json`. The photographic masters live in `campaign/masters`; output dimensions are preserved. The bundled Barlow Condensed Black and Barlow SemiBold fonts are converted to glyph paths before PNG rendering, so missing system fonts cannot change the design. Both fonts are from [Google Fonts' Barlow family](https://github.com/google/fonts/tree/main/ofl/barlow) under the bundled SIL Open Font License.

For a non-publishing preview, run `npm run redesign -- --preview facebook-cover instagram-stories-start-02 youtube-banner`. Images, self-contained SVGs and a text-layout report are written to an ignored `.local/typography-*` directory. The renderer checks actual glyph bounds for clipping, overlap and format-specific text-safe areas, including the central YouTube banner crop. Inspect the PNGs and mobile-size crops visually as well: bounds checks alone do not verify legibility or photo placement. Public previews and downloads use content-versioned URLs to avoid stale artwork after an update.

To add a finished asset, inspect its visible content and metadata, copy that specific file into a platform folder, and add its size, SHA-256 hash, dimensions and media type to `catalog.json`. Add it to a post's ordered asset list. Do not copy an entire generation/output folder. Preserve any AI provenance; if the validator encounters new metadata, review it explicitly before adding support.

`npm test` checks text rendering, safe areas, the public file boundary, asset integrity and traversal rejection. Use the gallery to verify selection, post order and captions before publishing new material.

## Generated video and media archive

[The media archive](media-archive/README.md) holds the generated videos, source clips, supporting images/audio and captions separately from the public gallery. Archive media are tracked with Git LFS; install it and run `git lfs pull` after cloning to retrieve the full files. See the archive manifest for exact filenames and integrity hashes. The public site build does not include this archive.
