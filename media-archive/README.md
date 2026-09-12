# Generated marketing media archive

This folder preserves the generated marketing library: finished edits, source exercise clips, selected earlier revisions, images, supporting audio and captions. It is a backup library, not a list of assets approved for posting.

## Contents

- 328 MP4 files and one WebM.
- 631 PNG/JPG images, including generated character references, post images and review frames.
- 18 audio files and 71 caption files.
- 1,049 files total, 924 distinct byte sequences, containing about 11.8 GB of distinct content.

Original filenames and folders are retained under `marketing-system`, `content-factory` and `rivalry-motion`. `manifest.json` records every archived file's size and SHA-256 hash. Original source files were not moved or deleted.

The archive was cleaned before upload. Exact video aliases, playback-repair workspaces, rejected edits, previews and failed trials were removed from this copy. The source worktrees retain their original files.

## Start here

- [Latest 20 Duel edits](marketing-system/duel-video-harness/captures/bedwin-variety-twenty-20260912/edits/)
- [Latest three Challenge edits](marketing-system/duel-video-harness/captures/bedwin-solo-three-20260912/edits/)
- [Bedwin source clips and generated images](marketing-system/characters/bedwin/)
- [Elias source clips and generated images](marketing-system/characters/elias/)
- [Finished slideshow images](marketing-system/generated/export-packs/)

`sound-on.mp4` files can contain audition audio whose commercial rights have not been established. Matching `add-music.mp4` files are intended for adding licensed or platform-native audio. Character footage and performance fixtures are synthetic; archiving them does not make them real customer results. Keep the disclosure in the associated captions. Choose the current finished edit for posting.

Challenge codes and expiry dates are part of each creative. Recheck them before posting; an archived challenge video is not evidence that its challenge is still open.

## Get the full files

Install Git LFS, then run these commands in the repository:

```sh
git lfs install --local
git lfs pull
git lfs fsck
```

Git commits contain small pointers for archive media; the full files live in the repository's Git LFS storage. A backup is complete only after both the Git commit and all its LFS objects have been uploaded. A plain pointer-only checkout is not a usable media backup.

For future additions, copy the selected media into this archive, retain its embedded provenance and update the manifest. Use normal Git with the LFS pre-push hook enabled so the media objects are uploaded with the commit. Do not disable the hook or push pointers without their media.

## Website boundary and privacy

This archive is excluded from `catalog.json` and from the public `dist` build. The gallery still publishes only its reviewed asset allowlist. GitHub Pages does not automatically serve these LFS files. Adding a video to the phone gallery requires a separate reviewed hosting and catalogue change.

Only media files and named caption text were imported. App code, credentials, environment files, API responses, generation logs, databases, private source notes, build products, ZIP packs and unrelated research screenshots were excluded. Media metadata was inspected for sensitive fields; original image bytes and embedded AI Content Credentials were preserved.
