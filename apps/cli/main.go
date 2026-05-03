package main

import (
	"github.com/flowershow/publish/cmd"
	"github.com/flowershow/publish/internal/config"
	"github.com/flowershow/publish/internal/updater"
)

func main() {
	updater.Start(config.Version)
	cmd.Execute()
}
