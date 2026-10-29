#!/usr/bin/env bash
set -u

REPO="ksaasm99-star/KAZ-"
EXPECTED_REMOTE="https://github.com/${REPO}.git"
FAILURES=0
BLOCKED=0

say() { printf '%s\n' "$*"; }
pass() { say "PASS  $*"; }
warn() { say "WARN  $*"; BLOCKED=$((BLOCKED + 1)); }
fail() { say "FAIL  $*"; FAILURES=$((FAILURES + 1)); }

say "KAZ GitHub read-only connectivity check"
say "Repository: ${REPO}"
say "Mode: GET/read-only only; no write, commit, push, workflow dispatch, or deletion"
say ""

if ! command -v gh >/dev/null 2>&1; then
  fail "gh CLI is not installed"
else
  pass "gh CLI is available"
fi

if ! command -v git >/dev/null 2>&1; then
  fail "git is not installed"
else
  pass "git is available"
fi

if [ "$FAILURES" -gt 0 ]; then
  say ""
  say "STATUS=FAIL"
  say "CAUSE=LOCAL_TOOL_MISSING"
  exit 1
fi

REMOTE="$(git remote get-url origin 2>/dev/null || true)"
case "$REMOTE" in
  "$EXPECTED_REMOTE"|"git@github.com:${REPO}.git")
    pass "origin points to the KAZ repository"
    ;;
  *)
    fail "origin does not point to ${EXPECTED_REMOTE}"
    say "Observed origin: ${REMOTE:-<missing>}"
    ;;
esac

if LOGIN="$(gh api --method GET user --jq '.login' 2>/dev/null)" && [ -n "$LOGIN" ]; then
  pass "GitHub authentication works as user ${LOGIN}"
else
  fail "GitHub authentication failed"
fi

REPO_JSON="$(mktemp)"
trap 'rm -f "$REPO_JSON"' EXIT
if gh api --method GET "repos/${REPO}" >"$REPO_JSON" 2>/dev/null; then
  VIEWER_PERMISSION="$(gh api --method GET "repos/${REPO}" --jq '.permissions | to_entries | map(select(.value == true) | .key) | join(",")' 2>/dev/null || true)"
  DEFAULT_BRANCH="$(gh api --method GET "repos/${REPO}" --jq '.default_branch' 2>/dev/null || true)"
  pass "repository metadata is readable"
  say "INFO  default_branch=${DEFAULT_BRANCH:-unknown}"
  say "INFO  effective_permissions=${VIEWER_PERMISSION:-unknown}"
else
  fail "repository metadata is not readable"
fi

if gh api --method GET "repos/${REPO}/contents" --jq 'length' >/dev/null 2>&1; then
  pass "repository contents are readable"
else
  fail "repository contents are not readable"
fi

if gh api --method GET "repos/${REPO}/branches?per_page=1" --jq 'length' >/dev/null 2>&1; then
  pass "branches are readable"
else
  fail "branches are not readable"
fi

if gh api --method GET "repos/${REPO}/actions/workflows" --jq '.total_count' >/dev/null 2>&1; then
  pass "Actions workflows are readable"
else
  warn "Actions workflows are not readable; token or repository Actions access may be limited"
fi

if gh api --method GET "repos/${REPO}/actions/permissions" --jq '.enabled' >/dev/null 2>&1; then
  pass "repository Actions permissions are readable"
else
  warn "repository Actions permissions endpoint returned an access error"
fi

if gh api --method GET "repos/${REPO}/releases?per_page=1" --jq 'length' >/dev/null 2>&1; then
  pass "releases and APK release metadata are readable"
else
  warn "releases are not readable"
fi

say ""
if [ "$FAILURES" -gt 0 ]; then
  say "STATUS=FAIL"
  say "CAUSE=REPOSITORY_OR_AUTH_ACCESS"
  say "READ_ONLY_CHECKS=FAILED"
  exit 1
elif [ "$BLOCKED" -gt 0 ]; then
  say "STATUS=PARTIAL"
  say "CAUSE=READ_ACCESS_OK_BUT_SOME_GITHUB_CAPABILITIES_ARE_BLOCKED"
  say "READ_ONLY_CHECKS=PARTIAL"
  exit 2
else
  say "STATUS=PASS"
  say "CAUSE=READ_ONLY_GITHUB_ACCESS_VERIFIED"
  say "READ_ONLY_CHECKS=PASS"
  exit 0
fi
