#!/usr/bin/env bats

load test_helper

@test 'batslib_decorate() <title>: encloses the input in a footer line and a header line containing <title>' {
  run bash -c "source '${TEST_MAIN_DIR}/load.bash'
               echo 'body' | batslib_decorate 'title'"
  [ "$status" -eq 0 ]
  [ "${#lines[@]}" -eq 3 ]
  [ "${lines[0]}" == '-- title --' ]
  [ "${lines[1]}" == 'body' ]
  [ "${lines[2]}" == '--' ]
}

@test 'batslib_decorate() works with modified path' {
  export PATH="$BATS_TEST_DIRNAME:$PATH"
  echo body | {
    # Verify stub
    run which cat
    [ "$status" -eq 0 ]
    [ "$output" = "$BATS_TEST_DIRNAME/cat" ]
    # Should still work
    run batslib_decorate 'title'
    [ "$status" -eq 0 ]
    [ "${#lines[@]}" -eq 3 ]
    [ "${lines[0]}" == '-- title --' ]
    [ "${lines[1]}" == 'body' ]
    [ "${lines[2]}" == '--' ]
  }
}

@test 'batslib_decorate() works with mock function' {
  echo body | {
    function cat {
      echo "Mocked cat"
    }
    [ "$(cat)" = "Mocked cat" ]
    # Should still work
    run batslib_decorate 'title'
    [ "$status" -eq 0 ]
    [ "${#lines[@]}" -eq 3 ]
    [ "${lines[0]}" == '-- title --' ]
    [ "${lines[1]}" == 'body' ]
    [ "${lines[2]}" == '--' ]
  }
}
