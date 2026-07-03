package swagger

import (
	"embed"
	"net/http"
)

//go:embed swagger.yaml
var swaggerDoc embed.FS

const swaggerUITemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RiskTracker API - Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/swagger/doc.yaml',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: "BaseLayout",
    });
  </script>
</body>
</html>`

func Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /swagger/doc.yaml", func(w http.ResponseWriter, r *http.Request) {
		data, err := swaggerDoc.ReadFile("swagger.yaml")
		if err != nil {
			http.Error(w, "swagger doc not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/yaml")
		w.Write(data)
	})

	mux.HandleFunc("GET /swagger/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Write([]byte(swaggerUITemplate))
	})

	return mux
}
