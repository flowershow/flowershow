#!/usr/bin/env bats

load test_helper

@test 'assert_not_equal() <actual> <unexpected>: returns 0 if <actual> does not equal <unexpected>' {
  run assert_not_equal foo bar
  assert_test_pass

  run assert_not_equal "foo" "bar"
  assert_test_pass

  run assert_not_equal "foo" ""
  assert_test_pass

  run assert_not_equal "" "foo"
  assert_test_pass
}

@test 'assert_not_equal() <actual> <unexpected>: returns 1 and displays details if <actual> equals <unexpected>' {
  run assert_not_equal 'foobar' 'foobar'
  assert_test_fail <<'ERR_MSG'

-- values should not be equal --
unexpected : foobar
actual     : foobar
--
ERR_MSG

  run assert_not_equal 1 1
  assert_test_fail <<'ERR_MSG'

-- values should not be equal --
unexpected : 1
actual     : 1
--
ERR_MSG
}

@test 'assert_not_equal() <actual> <unexpected>: displays details in multi-line format if <actual> and <unexpected> are longer than one line' {
  run assert_not_equal $'foo\nbar' $'foo\nbar'
  assert_test_fail <<'ERR_MSG'

-- values should not be equal --
unexpected (2 lines):
  foo
  bar
actual (2 lines):
  foo
  bar
--
ERR_MSG
}

@test 'assert_not_equal() <actual> <unexpected>: performs literal matching' {
    run assert_not_equal 'a' '*'
    assert_test_pass
}