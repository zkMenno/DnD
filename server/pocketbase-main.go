// The Dungeon Tracker server: PocketBase v0.40 with JS hooks and JS migrations, plus one extra route for sheet links.
// Built by the Dockerfile (go build, CGO off), run as `pocketbase serve --hooksDir … --migrationsDir … --publicDir …`;
// tools/devserver.sh runs the same flags locally. Relies on server/pb_hooks (routes, checks, email codes),
// server/pb_migrations (collections, access rules, settings) and the built web app (dist/web) as the public dir.
// Order: the flags must be parsed before jsvm and migratecmd are registered, because both read the directories.
// Pending migrations run when the server starts. Automigrate is off: dashboard changes never write migration files.
package main

import (
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/jsvm"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
)

// ── Sheet links ────────────────────────────────────────────────────────────────────────────────────────────

// Sheet links: /<username>/<D&D Beyond id> (someone's sheet) and /<D&D Beyond id> (your own copy).
// They are pages, not files: both get sheet.html, which works out which sheet from the address.
// The username part is the same rule as NAME in pb_hooks/ddb_utils.js (and the users.username pattern).
var sheetPath = regexp.MustCompile(`^/(?:[a-z0-9][a-z0-9_-]{1,18}[a-z0-9]/)?\d{4,12}/?$`)

// ── Server ─────────────────────────────────────────────────────────────────────────────────────────────────

// main starts PocketBase with JS hooks/migrations and a static public dir: the same flags as the official binary.
// The catch-all GET route serves the public dir, except that sheet links get sheet.html. It is only added when
// no hook has claimed "/{path...}" already.
func main() {
	app := pocketbase.New()
	var hooksDir, migrationsDir, publicDir string
	app.RootCmd.PersistentFlags().StringVar(&hooksDir, "hooksDir", "", "the directory with the JS app hooks")
	app.RootCmd.PersistentFlags().StringVar(&migrationsDir, "migrationsDir", "", "the directory with the JS migrations")
	app.RootCmd.PersistentFlags().StringVar(&publicDir, "publicDir", defaultPublicDir(), "the directory to serve static files")
	app.RootCmd.ParseFlags(os.Args[1:])

	jsvm.MustRegister(app, jsvm.Config{HooksDir: hooksDir, MigrationsDir: migrationsDir})
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{Dir: migrationsDir, Automigrate: false})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		if !se.Router.HasRoute("GET", "/{path...}") {
			public := os.DirFS(publicDir)
			static := apis.Static(public, false)
			se.Router.GET("/{path...}", func(e *core.RequestEvent) error {
				if sheetPath.MatchString(e.Request.URL.Path) {
					return e.FileFS(public, "sheet.html")
				}
				return static(e)
			})
		}
		return se.Next()
	})
	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// defaultPublicDir is pb_public next to the binary, or ./pb_public under `go run` (the binary then sits in the
// temp dir), the same default as the official PocketBase binary.
func defaultPublicDir() string {
	if strings.HasPrefix(os.Args[0], os.TempDir()) {
		return "./pb_public"
	}
	return filepath.Join(os.Args[0], "../pb_public")
}
