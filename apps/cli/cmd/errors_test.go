package cmd

import (
	"bytes"
	"errors"
	"strings"
	"testing"
)

func TestExitCode_NilIsZero(t *testing.T) {
	var buf bytes.Buffer
	if got := exitCode(nil, &buf); got != 0 {
		t.Fatalf("exit code = %d, want 0", got)
	}
	if buf.Len() != 0 {
		t.Fatalf("unexpected output %q", buf.String())
	}
}

func TestExitCode_ReportedErrorIsNonZeroAndNotReprinted(t *testing.T) {
	var buf bytes.Buffer
	if got := exitCode(failSilently("already shown"), &buf); got != 1 {
		t.Fatalf("exit code = %d, want 1", got)
	}
	if buf.Len() != 0 {
		t.Fatalf("reported error was printed twice: %q", buf.String())
	}
}

func TestExitCode_PlainErrorIsNonZeroAndPrinted(t *testing.T) {
	var buf bytes.Buffer
	if got := exitCode(errors.New("unknown flag: --bogus"), &buf); got != 1 {
		t.Fatalf("exit code = %d, want 1", got)
	}
	if !strings.Contains(buf.String(), "unknown flag: --bogus") {
		t.Fatalf("expected error to be printed, got %q", buf.String())
	}
}
