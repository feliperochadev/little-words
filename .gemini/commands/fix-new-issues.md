# /fix-new-issues [PR-NUMBER] — Fix SonarCloud quality issues on PR (Gemini)

**⛔ MANDATORY: This skill MUST fix ALL issues** (coverage + code smells + security hotspots). Fixing coverage alone is insufficient. All SonarCloud issues must be resolved or quality gate remains FAILED. **Before starting, review .agents/COMMON-RULES.md — it contains mandatory baseline rules for all agents.**

Automate fixing SonarCloud issues, security hotspots, and test coverage gaps found on a pull request. This command:
1. Opens the PR and checks quality gates
2. Fetches issues, security hotspots, and metrics from SonarCloud API
3. Analyzes and fixes ALL issue types (not just coverage)
4. Documents findings in `.agents/standards/` for future prevention
5. Pushes fixes to the PR branch
6. Validates all quality checks pass, including zero remaining issues

## Steps

1. **PR Validation** — Run `gh pr view <pr-number>` to fetch PR details and confirm it exists. If PR is already merged or doesn't exist, stop and inform the user.

2. **Fetch SonarCloud Data** — Use curl to fetch data from SonarCloud API (no authentication required for public projects):
   - **Issues on PR**: `curl -s "https://sonarcloud.io/api/issues/search?componentKeys=feliperochadev_little-words&resolved=false&pullRequest=<PR>" | python3 -m json.tool`
   - **Quality Gate Status**: `curl -s "https://sonarcloud.io/api/qualitygates/project_status?projectKey=feliperochadev_little-words&pullRequest=<PR>" | python3 -m json.tool`
   - **New Code Coverage**: `curl -s "https://sonarcloud.io/api/measures/component?component=feliperochadev_little-words&metricKeys=new_coverage" | python3 -m json.tool`

   ⚠️ **Important**: All three types of issues (code smells, bugs, security hotspots) MUST be checked. Coverage alone does NOT satisfy the quality gate if other issues remain.

3. **Analyze Issues** — Parse the API responses and categorize issues by type:
   - **Coverage Issues**: Files with coverage < 85%
   - **Code Duplication**: Duplicated lines > 3%
   - **Security Hotspots**: Security-sensitive code that needs review
   - **Bugs & Vulnerabilities**: Code issues that need fixes
   - **Complexity**: Cyclomatic complexity violations
   - **Code Smells**: Style/naming/structure issues

4. **Fix Issues** — For each category:
   - **Coverage**: Add missing test cases until coverage ≥ 85% per file
   - **Duplication**: Extract shared code into utilities/hooks
   - **Security Hotspots**: Review and document security implications
   - **Bugs/Vulnerabilities**: Apply fixes per issue description
   - **Complexity**: Refactor complex functions
   - **Code Smells**: Apply naming/style fixes

5. **Document Findings** — Update relevant `.agents/standards/` files:
   - **Coverage gaps** → `.agents/standards/testing.md`
   - **Duplication patterns** → `.agents/standards/quality.md`
   - **Security hotspots** → `.agents/standards/security.md`
   - **Type/style issues** → `.agents/standards/typescript.md` or `.agents/standards/styling-and-naming.md`
   - **Component patterns** → `.agents/standards/components.md`
   - **Hook/state patterns** → `.agents/standards/hooks.md` or `.agents/standards/state-management.md`

   Include concrete examples and prevention tips.

6. **Validate Fixes** — For each fix:
   - Run `npm run lint` to check for linting errors
   - Run `npm run typecheck` to validate TypeScript
   - Run `npm run test:coverage` to verify new tests pass and coverage improves
   - Stop and report the first error; do not proceed until it passes

7. **Stage and Commit** — After all fixes pass validation:
   - Run `git status` to see changes
   - Stage all modified/new files with `git add .` (excluding `.env` and session artifacts)
   - Commit with message: `[fix] SonarCloud issues on PR #{PR}: coverage, duplication, security hotspots (apsc - gi)`
   - Include a bullet-point list of fixes in the commit body

8. **Push to PR Branch** — Run `git push origin <branch>` to push fixes

9. **Wait for CI** — The GitHub Actions pre-push hook will run `npm run ci` automatically. Inform the user to wait for CI to complete.

10. **Final Sonar Check** — After CI passes, wait 40-50 seconds for SonarCloud to reprocess, then re-fetch data:
    - Check issues: `curl -s "https://sonarcloud.io/api/issues/search?componentKeys=feliperochadev_little-words&resolved=false&pullRequest=<PR>" | grep -o '"total":[0-9]*'`
    - Check quality gates: `curl -s "https://sonarcloud.io/api/qualitygates/project_status?projectKey=feliperochadev_little-words&pullRequest=<PR>" | grep -o '"status":"[^"]*"'`
    - **MANDATORY: BOTH must show success:**
      - Zero issues remaining (total: 0)
      - Quality gate status: OK
    - If **any issues remain**, iterate: go back to Step 3 and repeat until all issues are resolved (max 3 iterations)
    - **Failure to resolve ALL issues = skill failure. No exceptions.**

## Critical Definition of Done

✅ **DONE** = Quality gate OK + Zero issues remaining + 100% tests passing + `npm run ci` passes
❌ **NOT DONE** = Coverage ≥80% but code smells/bugs/security issues remain (even if coverage is excellent)

## Notes

- ⛔ **MANDATORY: Read .agents/COMMON-RULES.md before starting.** It contains baseline rules all agents must follow.
- Never modify `.agents/standards/` files to document issues that were not actually fixed; only document patterns you fixed in the PR
- Always run full `npm run ci` validation before pushing
- Each fix must include a corresponding test case
- Security hotspots are informational; document their risk level but do not force a "fix" if the code is intentionally sensitive
- **Coverage alone does NOT pass the quality gate** if other issues remain. ALL issues must be resolved.
- If Sonar API is unreachable or returns errors, stop and report the error to the user
- If max 3 iterations exhausted and issues remain, escalate to the user — the PR cannot be merged.

## Environment

- **SonarCloud Project**: `feliperochadev_little-words`
- **Repository**: `feliperochadev/little-words`
- **Required Tool**: `gh` (GitHub CLI) for PR access and URL resolution
