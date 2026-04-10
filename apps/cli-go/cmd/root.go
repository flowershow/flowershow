package cmd

import (
	"fmt"
	"os"

	"github.com/flowershow/publish/internal/config"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:     "fl",
	Short:   "CLI tool for publishing to Flowershow",
	Version: config.Version,
	// Args and RunE are set in publish.go via init()
}

// Execute runs the root command.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func init() {
	// Disable the default completion command
	rootCmd.CompletionOptions.DisableDefaultCmd = true
}
