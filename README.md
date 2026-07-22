### Dream Factory

Gather your project ideas in an easy lookup location, from initial thought to release.


## Custom

You can host this for your own project dreams.

* Add dreams.conf files to conf/dreams.d/
* Modify bridge and bow views to change branding
* Tweak messages for titles


## Run

`sbt run`

will launch the application.

## Static-site migration

The canonical Hugo contributor workflow and Cloudflare Pages operations are documented in [docs/static-site-operations.md](docs/static-site-operations.md). Production moved to Pages on 2026-07-22; Play remains the rollback origin through the observation window.

### Docker

Also includes a Dockerfile to build and run using Docker.

`docker run -ti --rm -P flurdy/dreamfactory:latest`


## Live

This is running live at [code.flurdy.com](https://code.flurdy.com)
