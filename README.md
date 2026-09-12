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

## Hosting

Run `npm run build` and publish only the generated `dist` folder with an HTTPS static host. Keep the project root as the build/source folder. Do not serve the Git checkout itself.

The build copies only the page files, reviewed catalogue assets and required font/license. The preview likewise serves an explicit URL allowlist, has no directory listing and never exposes the source repository or import receipt. Unexpected file extensions, changed asset hashes, symlinks and unexpected PNG metadata make validation fail. Rebuilding replaces the generated `dist` folder.

## Imported material

43 finished PNGs, one display font and its license were copied byte-for-byte from the existing social brand kit. The app screens depict marketing fixtures, not customer results. No original files were moved or deleted. No app source, raw captures, editable SVGs, generation scripts, credentials, environment files, archives, internal notes or source provenance documents were copied. `IMPORT-AUDIT.json` records relative filenames, sizes and hashes; it is excluded from the public build.

To add a finished asset, inspect its visible content and metadata, copy that specific file into a platform folder, and add its size, SHA-256 hash, dimensions and media type to `catalog.json`. Add it to a post's ordered asset list. Do not copy an entire generation/output folder. Preserve any AI provenance; if the validator encounters new metadata, review it explicitly before adding support.

`npm test` checks the public file boundary, asset integrity and traversal rejection. Use the gallery to verify selection, post order and captions before publishing new material.
