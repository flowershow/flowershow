package cmd

import (
	"fmt"
	"os"

	"github.com/flowershow/publish/internal/config"
	"github.com/flowershow/publish/internal/updater"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "fl [paths...]",
	Short: "Publish files to Flowershow",
	Long: `Publish markdown files or folders to Flowershow.

Pass one or more file paths or a directory to publish. On first run a new
site is created; subsequent runs sync only the changed files.`,
	Example: `  fl .                     publish the current directory
  fl ~/notes               publish a folder
  fl file1.md file2.md     publish specific files`,
	Version: config.Version,
	// Args and RunE are set in publish.go via init()
	PersistentPostRun: func(cmd *cobra.Command, args []string) {
		updater.PrintIfAvailable(config.Version)
	},
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
