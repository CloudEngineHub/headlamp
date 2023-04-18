package helm

// import (
// 	"encoding/json"
// 	"log"
// 	"net/http"
// 	"path/filepath"

// 	"helm.sh/helm/v3/cmd/helm/search"
// 	"helm.sh/helm/v3/pkg/helmpath"
// 	"helm.sh/helm/v3/pkg/repo"
// )

// type ListAllChartsResponse struct {
// 	Charts []chartInfo `json:"charts"`
// }

// type chartInfo struct {
// 	Name        string `json:"name"`
// 	Description string `json:"description"`
// 	Version     string `json:"version"`
// 	AppVersion  string `json:"appVersion"`
// 	Repository  string `json:"repository"`
// }

// // list all charts
// func (h *HelmHandler) ListAllCharts(w http.ResponseWriter, r *http.Request) {

// 	// read repo file
// 	repoFile, err := repo.LoadFile(settings.RepositoryConfig)
// 	if err != nil {
// 		log.Println(err)
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}

// 	var chartInfos []chartInfo
// 	for _, re := range repoFile.Repositories {
// 		index := search.NewIndex()

// 		name := re.Name
// 		repoIndexFile := filepath.Join(settings.RepositoryCache, helmpath.CacheIndexFile(name))
// 		indexFile, err := repo.LoadIndexFile(repoIndexFile)
// 		if err != nil {
// 			log.Println(err)
// 			http.Error(w, err.Error(), http.StatusInternalServerError)
// 			return
// 		}
// 		index.AddRepo(name, indexFile, true)
// 		for _, chart := range index.All() {
// 			chart := chart
// 			chartInfos = append(chartInfos, chartInfo{
// 				Name:        chart.Name,
// 				Description: chart.Chart.Description,
// 				Version:     chart.Chart.Version,
// 				AppVersion:  chart.Chart.AppVersion,
// 				Repository:  name,
// 			})
// 		}
// 	}

// 	response := ListAllChartsResponse{
// 		Charts: chartInfos,
// 	}
// 	w.WriteHeader(http.StatusOK)
// 	w.Header().Set("Content-Type", "application/json")
// 	err = json.NewEncoder(w).Encode(response)
// 	if err != nil {
// 		log.Println(err)
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}

// }
