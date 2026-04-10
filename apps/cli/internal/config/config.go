package config

import "os"

var Version = "1.2.1"

func APIURL() string {
	if v := os.Getenv("API_URL"); v != "" {
		return v
	}
	return "https://cloud.flowershow.app"
}

func PostHogAPIKey() string {
	if v := os.Getenv("POSTHOG_API_KEY"); v != "" {
		return v
	}
	return "phc_QsAoymFdEUOjN9mv1yhWBXkVtbMNHTfbhJhnrzUlkke"
}

func PostHogHost() string {
	if v := os.Getenv("POSTHOG_HOST"); v != "" {
		return v
	}
	return "https://eu.i.posthog.com"
}
