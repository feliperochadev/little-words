# /upgrade-version

Update app version across all configuration files, commit, and push to remote.

## Steps

1. **Get current version**
   - Run `grep '"version"' package.json` to extract the current version

2. **Prompt for new version**
   - Ask user: "What is the new version number?" (e.g., 0.8.0-beta)
   - Validate it's a valid semver format

3. **Find all files with version**
   - Run `grep -r "current_version" . --include="*.json" --include="*.ts" --include="*.tsx"` to find all version references
   - Files typically include: `package.json`, `app.json`, `package-lock.json`
   - Confirm the list with the user before proceeding

4. **Update all version references**
   - Use Edit tool to replace the current version with the new version in each file
   - Verify changes with `git diff`

5. **Validate with CI**
   - Run `npm run ci` to ensure all checks pass (lint, typecheck, tests, semgrep)
   - If any checks fail, stop and ask user to fix issues

6. **Commit changes**
   - Run `git add` to stage the version files
   - Create commit with message: `[config] Bump version to {new_version} (apsc - ce)`
   - Use a HEREDOC to pass the commit message

7. **Check branch before push**
   - Run `git branch --show-current` to get current branch
   - If on `main` or `master`, **STOP** and inform user to create a feature branch first
   - Otherwise, proceed to push

8. **Push to remote**
   - Run `git push -u origin {current_branch}` to push to remote
   - Confirm push succeeded

## Notes

- Always validate changes with `npm run ci` before committing
- Never push to main/master directly
- The commit message must include the `(apsc - ce)` marker
- Confirm file list with user before making changes
