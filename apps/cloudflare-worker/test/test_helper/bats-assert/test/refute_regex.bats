#!/usr/bin/env bats

load test_helper

#
# Literal matching
#

# Correctness
@test "refute_regex() <value> <pattern>: fails if a <value> substring matches extended regular expression <pattern>" {
  run refute_regex 'abc' '^[a-z]b'
  assert_test_fail <<'ERR_MSG'

-- value matches regular expression --
value    : abc
pattern  : ^[a-z]b
match    : ab
case     : sensitive
--
ERR_MSG
}

@test "refute_regex() <value> <pattern>: succeeds if no <value> substring matches extended regular expression <pattern>" {
  run refute_regex 'bcd' '^[a-z]b[c-z]+'
  assert_test_pass
}

@test "refute_regex() <value> <pattern>: provides results in BASH_REMATCH on failure" {
  unset -v BASH_REMATCH

  refute_regex 'abcd' 'b.d' \
  || {
      declare -p BASH_REMATCH && \
      [ "${BASH_REMATCH[0]}" = 'bcd' ]
  }
}

@test "refute_regex() <value> <pattern>: matches case-insensitively when 'nocasematch' is set" {
  shopt -s nocasematch

  run refute_regex 'aBc' 'ABC'
  assert_test_fail <<'ERR_MSG'

-- value matches regular expression --
value    : aBc
pattern  : ABC
match    : aBc
case     : insensitive
--
ERR_MSG
}

@test "refute_regex() <value> <pattern>: outputs multi-line <value> nicely when it fails" {
  run refute_regex $'abc\n123' '^[a-z]b[c-z]+'
  assert_test_fail <<'ERR_MSG'

-- value matches regular expression --
value (2 lines):
  abc
  123
pattern (1 lines):
  ^[a-z]b[c-z]+
match (1 lines):
  abc
case (1 lines):
  sensitive
--
ERR_MSG

  shopt -s nocasematch
  run refute_regex $'aBc\n123' '^[a-z]b[c-z]+'
  assert_test_fail <<'ERR_MSG'

-- value matches regular expression --
value (2 lines):
  aBc
  123
pattern (1 lines):
  ^[a-z]b[c-z]+
match (1 lines):
  aBc
case (1 lines):
  insensitive
--
ERR_MSG
}

# Error handling
@test "refute_regex() <value> <pattern>: returns 1 and displays an error message if <pattern> is not a valid extended regular expression" {
  run refute_regex value '[.*'

  assert_test_fail <<'ERR_MSG'

-- ERROR: refute_regex --
Invalid extended regular expression: `[.*'
--
ERR_MSG
}
