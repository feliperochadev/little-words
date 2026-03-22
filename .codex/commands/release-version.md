# /release-version

Create a GitHub release for the current app version with changelog entries.

## Steps

1. **Get current version**
   - Run `grep '"version"' package.json` to extract the current version string (e.g., 0.7.0-beta)

2. **Check if release already exists**
   - Run `gh release view v{version}` to check if a release already exists for this version
   - If it exists, ask user if they want to delete and recreate, or stop

3. **Check if tag exists**
   - Run `git tag -l "v{version}"` to see if a git tag exists
   - If not, create it with `git tag v{version}` and push with `git push origin v{version}`

4. **Find previous version**
   - Read `.agents/AGENTS-CHANGELOG.md` to find the version entry before the current version
   - Extract the major.minor.patch pattern (e.g., from 0.7.0-beta entries find where 0.6.1-beta or 0.6.0-beta was bumped)
   - Identify the changelog ID (e.g., 2026-03-20_3) where the previous version was bumped

5. **Extract changelog entries**
   - Read all changelog entries from current version down to (but not including) the previous version bump entry
   - Organize entries by category: [config], [feature], [fix], [upgrade], [test], [refactor], [security], etc.
   - Extract a main change description from the most important entries (largest feature or critical fix)

6. **Build release notes**
   - Create a markdown file with:
     - Title: `v{version}` with main change description (e.g., "v0.7.0-beta: Media Management & Variant Linking")
     - Sections by category (#### Configuration, #### Features, #### Bug Fixes, etc.)
     - Each section lists the relevant changelog entries with bullet points
     - Keep descriptions concise but informative

7. **Create GitHub release**
   - Run `gh release create v{version} -F /tmp/release-notes.md` to create the release
   - Confirm release URL is returned

8. **Verify release**
   - Run `gh release view v{version}` to confirm the release was created with correct notes

## Important Notes

- The release notes should accurately reflect the changelog entries between versions
- Main change description should highlight the most significant feature or fix
- Use consistent formatting with markdown headers and bullet points
- If release already exists, do NOT overwrite without explicit user confirmation
- Include all change categories in the release notes (config, features, fixes, tests, etc.)
- Entries should be extracted from `.agents/AGENTS-CHANGELOG.md` in the format as they appear

## Example Release Title

`v0.7.0-beta: Media Management & Variant Linking`

## Related Commands

- `/upgrade-version` — Update version numbers across all files
- `/ship` — Commit and push approved changes
