#!/usr/bin/env bash
# filter-test-output.sh — Strip passing test indicators, keep failures and summaries
# Pipe usage: test_command 2>&1 | bash filter-test-output.sh
#
# Supported: vitest, jest, mocha, pytest, go test, cargo test, rspec,
#            flutter/dart test, swift test, dotnet test, gradle/mvn test,
#            mix test, phpunit
# Bypass: OMA_TEST_FILTER=0

if [[ "${OMA_TEST_FILTER:-1}" == "0" ]]; then
  cat
  exit 0
fi

awk '
  # vitest/jest/mocha: remove individual passing tests
  /^[[:space:]]*[✓√✔][[:space:]]/ { next }

  # jest: remove PASS file headers
  /^[[:space:]]*PASS[[:space:]]/ { next }

  # go test: remove passing tests and ok package lines
  /^--- PASS:/ { next }
  /^[[:space:]]*ok[[:space:]]+[a-zA-Z]/ { next }

  # pytest: remove PASSED lines
  /PASSED[[:space:]]*$/ { next }

  # cargo test: remove "test ... ok" lines
  /^test .+ \.\.\. ok$/ { next }

  # flutter/dart: remove passing tests (+N without -N, excluding summary)
  /^[0-9][0-9]:[0-9][0-9] \+[0-9]+: / && !/\-[0-9]+/ && !/All tests/ { next }

  # swift: remove passed test cases
  /Test Case .* passed/ { next }

  # dotnet: remove individual Passed lines (keep "Passed!" summary)
  /^[[:space:]]*Passed[[:space:]]/ && !/Passed!/ { next }

  # gradle/mvn: remove individual test pass indicators
  /^[[:space:]]*Tests run:.*Failures: 0.*Errors: 0/ { next }

  # phpunit: remove dots-only progress lines
  /^[.]+$/ { next }

  # rspec: remove passing example dots (single-char lines)
  /^[.]+[[:space:]]*$/ { next }

  # keep everything else
  { print }
'
