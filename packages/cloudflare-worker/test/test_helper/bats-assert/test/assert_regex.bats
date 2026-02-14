#!/usr/bin/env bats

load test_helper

#
# Literal matching
#

# Correctness
@test "assert_regex() <value> <pattern>: succeeds if a <value> substring matches extended regular expression <pattern>" {
  run assert_regex 'abc' '^[a-z]b[c-z]+'
  assert_test_pass
}

@test "assert_regex() <value> <pattern>: fails if no <value> substring matches extended regular expression <pattern>" {
  run assert_regex 'bcd' '^[a-z]b[c-z]+'
  assert_test_fail <<'ERR_MSG'

-- value does not match regular expression --
value    : bcd
pattern  : ^[a-z]b[c-z]+
case     : sensitive
--
ERR_MSG
}

@test "assert_regex() <value> <pattern>: provides results in BASH_REMATCH" {
  unset -v BASH_REMATCH

  assert_regex 'abcd' 'b.d'
  declare -p BASH_REMATCH
  [ "${BASH_REMATCH[0]}" = 'bcd' ]
}

@test "assert_regex() <value> <pattern>: matches case-insensitively when 'nocasematch' is set" {
  shopt -s nocasematch

  assert_regex 'aBc' 'ABC'
}

@test "assert_regex() <value> <pattern>: outputs multi-line <value> nicely when it fails" {
  run assert_regex $'bcd\n123' '^[a-z]b[c-z]+'
  assert_test_fail <<'ERR_MSG'

-- value does not match regular expression --
value (2 lines):
  bcd
  123
pattern (1 lines):
  ^[a-z]b[c-z]+
case (1 lines):
  sensitive
--
ERR_MSG

  shopt -s nocasematch
  run assert_regex $'bcd\n123' '^[a-z]b[c-z]+'
  assert_test_fail <<'ERR_MSG'

-- value does not match regular expression --
value (2 lines):
  bcd
  123
pattern (1 lines):
  ^[a-z]b[c-z]+
case (1 lines):
  insensitive
--
ERR_MSG
}

# Error handling
@test "assert_regex() <value> <pattern>: returns 1 and displays an error message if <pattern> is not a valid extended regular expression" {
  run assert_regex value '[.*'

  assert_test_fail <<'ERR_MSG'

-- ERROR: assert_regex --
Invalid extended regular expression: `[.*'
--
ERR_MSG
}

@test "assert_regex allows regex matching empty string (see #53)" {
  run assert_regex any_value '.*'
  assert_success
}
