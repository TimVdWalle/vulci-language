#!/usr/bin/env bash
# Phase: Phase 15B CLI, distribution, and quality hardening

set -euo pipefail

mode="${1:-}"
ref="${2:-}"
sha="${3:-}"
timeout_seconds="${4:-}"
marker="${5:-}"
workflow="check.yml"

if [[ -z "${GH_TOKEN:-}" || -z "${GH_REPO:-}" ]]; then
  echo "GH_TOKEN and GH_REPO are required." >&2
  exit 1
fi

if [[ -z "$ref" || -z "$sha" || ! "$timeout_seconds" =~ ^[1-9][0-9]*$ || -z "$marker" ]]; then
  echo "Usage: watch-check-workflow.sh <ensure|dispatch> <ref> <sha> <timeout-seconds> <marker>" >&2
  exit 1
fi

find_existing_run() {
  gh run list \
    --repo "$GH_REPO" \
    --workflow "$workflow" \
    --commit "$sha" \
    --limit 50 \
    --json conclusion,createdAt,databaseId,event,status \
    --jq 'map(select(.event == "push" or .event == "workflow_dispatch")) | sort_by(.createdAt) | reverse | .[0].databaseId // empty'
}

find_dispatched_run() {
  gh run list \
    --repo "$GH_REPO" \
    --workflow "$workflow" \
    --commit "$sha" \
    --event workflow_dispatch \
    --limit 50 \
    --json databaseId,displayTitle \
    --jq "first(.[] | select(.displayTitle == \"Checks for release $marker\")).databaseId // empty"
}

dispatch_run() {
  gh workflow run "$workflow" \
    --repo "$GH_REPO" \
    --ref "$ref" \
    --raw-field "release_run=$marker" \
    >/dev/null

  local discovery_deadline=$((SECONDS + 120))
  local discovered=""
  while [[ -z "$discovered" && $SECONDS -lt $discovery_deadline ]]; do
    discovered="$(find_dispatched_run)"
    [[ -n "$discovered" ]] || sleep 5
  done

  if [[ -z "$discovered" ]]; then
    echo "The dispatched Checks workflow did not appear within two minutes." >&2
    exit 1
  fi

  printf '%s\n' "$discovered"
}

case "$mode" in
  ensure)
    run_id="$(find_existing_run)"
    if [[ -z "$run_id" ]]; then
      run_id="$(dispatch_run)"
    fi
    ;;
  dispatch)
    run_id="$(dispatch_run)"
    ;;
  *)
    echo "Mode must be 'ensure' or 'dispatch'." >&2
    exit 1
    ;;
esac

deadline=$((SECONDS + timeout_seconds))
while (( SECONDS < deadline )); do
  run_state="$(
    gh run view "$run_id" \
      --repo "$GH_REPO" \
      --json conclusion,status,url \
      --template '{{.status}}|{{.conclusion}}|{{.url}}'
  )"
  IFS='|' read -r status conclusion url <<< "$run_state"
  echo "Checks run $run_id: $status${conclusion:+/$conclusion} ($url)"

  if [[ "$status" == "completed" ]]; then
    if [[ "$conclusion" == "success" ]]; then
      exit 0
    fi
    echo "Checks run $run_id completed with '$conclusion'." >&2
    exit 1
  fi

  sleep 10
done

echo "Checks run $run_id did not complete within $timeout_seconds seconds." >&2
exit 1
