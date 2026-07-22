.PHONY: static-artifact-verify static-build static-preview-down static-preview-up static-route-contract static-verify pages-preview-verify

static-build:
	scripts/build-static-site.sh

static-artifact-verify:
	scripts/verify-static-site.sh

static-verify:
	npm run test:static-browser

static-preview-up: static-build
	docker compose -f static-site/docker-compose.yml up --detach --force-recreate

static-preview-down:
	docker compose -f static-site/docker-compose.yml down

static-route-contract:
	npm run test:static-route-contract

pages-preview-verify:
	@test -n "$(PAGES_PREVIEW_BASE_URL)" || (echo "PAGES_PREVIEW_BASE_URL is required" >&2; exit 1)
	ROUTE_CONTRACT_BASE_URL="$(PAGES_PREVIEW_BASE_URL)" ROUTE_CONTRACT_VERIFY_REDIRECTS=true npm run test:static-route-contract
	PAGES_PREVIEW_BASE_URL="$(PAGES_PREVIEW_BASE_URL)" npm run test:pages-preview
