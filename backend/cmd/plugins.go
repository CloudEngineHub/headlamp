package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/gorilla/mux"
)

var watcher *fsnotify.Watcher

var changeHappened = false

// pluginsChanged asks if we should reload.
func pluginsChanged() bool {
	changed := changeHappened
	changeHappened = false

	return changed
}

// watchForChanges(path) looks for changes in the path, and signals that a change has happened.
func watchForChanges(path string) {
	watcher, _ = fsnotify.NewWatcher()
	defer watcher.Close()

	go watchSubfolders(path)

	done := make(chan bool)

	go func() {
		for {
			select {
			case event := <-watcher.Events:
				fmt.Printf("Plugin event! %#v\n", event)

				changeHappened = true

				// If there is an event, we rewatch the path.
				// Probably only need to do this on subfolder create events.
				if err := filepath.Walk(path, watchDir); err != nil {
					fmt.Println(err)
				}
			case err := <-watcher.Errors:
				fmt.Println("Plugin watcher Error", err)
			}
		}
	}()

	<-done
}

// watchDir searches for directories to add watchers to.
func watchDir(path string, fi os.FileInfo, err error) error {
	if fi == nil {
		return nil
	}

	// Only need to watch folders, because files are already handled.
	if fi.Mode().IsDir() {
		return watcher.Add(path)
	}

	return nil
}

// watchSubfolders watches the path for sub folder changes.
// Even if the path does not exist when first calls it eventually notices it.
// Also handles subfolders, which fsnotify doesn't do by default.
func watchSubfolders(path string) {
	done := make(chan struct{})

	go func() {
		done <- struct{}{}
	}()

	tickSeconds := 5
	ticker := time.NewTicker(time.Duration(tickSeconds) * time.Second)

	defer ticker.Stop()

	for ; ; <-ticker.C {
		<-done

		if err := filepath.Walk(path, watchDir); err != nil {
			fmt.Println(err)
		}

		go func() {
			done <- struct{}{}
		}()
	}
}

// getPluginListBasePaths gets a list of plugin URLs from the configured plugins folder.
// Returns pluginListURLs, nil if there is no problem.
// returns nil, err if there's an error.
func (c *HeadlampConfig) getPluginListBasePaths() ([]string, error) {
	var pluginListURLStatic []string

	if c.staticPluginDir != "" {
		var err error

		pluginListURLStatic, err = pluginBasePathListForDir(c.staticPluginDir, filepath.Join(c.baseURL, "static-plugins"))
		if err != nil {
			return nil, err
		}
	}

	pluginListURL, err := pluginBasePathListForDir(c.pluginDir, filepath.Join(c.baseURL, "plugins"))
	if err != nil {
		return nil, err
	}

	// Concatenate the static and user plugin lists.
	if pluginListURLStatic != nil {
		pluginListURL = append(pluginListURLStatic, pluginListURL...)
	}

	return pluginListURL, nil
}

func pluginBasePathListForDir(pluginDir string, baseURL string) ([]string, error) {
	files, err := os.ReadDir(pluginDir)
	if err != nil && !os.IsNotExist(err) {
		return nil, err
	}

	pluginListURLs := make([]string, 0, len(files))

	for _, f := range files {
		if !f.IsDir() {
			pluginPath := filepath.Join(pluginDir, f.Name())
			log.Printf("Not including plugin path '%s' it is not a folder.\n", pluginPath)

			continue
		}

		pluginPath := filepath.Join(pluginDir, f.Name(), "main.js")

		_, err := os.Stat(pluginPath)
		if err != nil {
			log.Printf("Not including plugin path '%s': %s\n", pluginPath, err)
			continue
		}

		packageJSONPath := filepath.Join(pluginDir, f.Name(), "package.json")

		_, err = os.Stat(packageJSONPath)
		if err != nil {
			log.Printf("Warning, package.json not found at '%s': %s\n", packageJSONPath, err)
			log.Printf("Please run 'headlamp-plugin extract' again with headlamp-plugin >= 0.6.0")
		}

		pluginFileURL := filepath.Join(baseURL, f.Name())
		pluginListURLs = append(pluginListURLs, pluginFileURL)
	}

	return pluginListURLs, nil
}

func addPluginRoutes(config *HeadlampConfig, r *mux.Router) {
	var err error

	pluginListURLs, err = config.getPluginListBasePaths()
	if err != nil {
		if !os.IsNotExist(err) {
			log.Println("Error: ", err)
		}
		// There was error, but we don't want to keep checking the plugins
		// again, until we deliberately do (so making the list an empty one).
		pluginListURLs = make([]string, 0)
	}

	r.HandleFunc("/plugins", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		// The pluginListURLs should only be nil if we want to dynamically load it
		// (and that's available only when not running in-cluster).
		if !config.useInCluster && pluginListURLs == nil {
			pluginListURLs, _ = config.getPluginListBasePaths()
		}
		if err := json.NewEncoder(w).Encode(pluginListURLs); err != nil {
			log.Println("Error encoding plugins base paths list", err)
		}
	}).Methods("GET")

	// Serve plugins
	pluginHandler := http.StripPrefix(config.baseURL+"/plugins/", http.FileServer(http.Dir(config.pluginDir)))
	// If we're running locally, then do not cache the plugins. This ensures that reloading them (development,
	// update) will actually get the new content.
	if !config.useInCluster {
		pluginHandler = serveWithNoCacheHeader(pluginHandler)
	}

	r.PathPrefix("/plugins/").Handler(pluginHandler)

	if config.staticPluginDir != "" {
		staticPluginsHandler := http.StripPrefix(config.baseURL+"/static-plugins/",
			http.FileServer(http.Dir(config.staticPluginDir)))
		r.PathPrefix("/static-plugins/").Handler(staticPluginsHandler)
	}
}
