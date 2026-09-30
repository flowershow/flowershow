package cmd

import (
	"errors"
	"fmt"
	"io"

	"github.com/flowershow/publish/internal/ui"
)

// reportedError is returned by commands after a human-readable message has
// already been printed. Execute exits non-zero for it without printing again.
type reportedError struct{ msg string }

func (e *reportedError) Error() string { return e.msg }

// fail prints msg as a formatted error and returns an error so the command
// exits non-zero.
func fail(msg string) error {
	ui.PrintError(msg)
	return &reportedError{msg: msg}
}

// failSilently returns an error for a failure whose message has already been
// shown to the user (e.g. by a spinner or a custom printout).
func failSilently(msg string) error {
	return &reportedError{msg: msg}
}

// exitCode reports err (unless it was already reported) and returns the
// process exit code for it.
func exitCode(err error, stderr io.Writer) int {
	if err == nil {
		return 0
	}
	var reported *reportedError
	if !errors.As(err, &reported) {
		fmt.Fprintf(stderr, "Error: %s\n", err)
	}
	return 1
}
