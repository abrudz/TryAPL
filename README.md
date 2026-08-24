## TryAPL
This is the repository for development of [TryAPL.org](https://tryapl.org)

The full version number is hard coded in `lib/tryapl.js`

## Contributing

### Run TryAPL locally
The APL web service is in [TryAPL.apln](./TryAPL.apln). To run it locally do

```
dyalog LOAD=/path/to/TryAPL.apln
```

TryAPL should bring in all of its dependencies automatically and serve the front end at [localhost:8080](http://localhost:8080).

### Front-end development
To iterate on the front end (HTML/CSS/JS) without restarting the backend, run the
zero-dependency dev server in [dev-server.js](./dev-server.js):

```
node dev-server.js
```

It serves the repository's static files at [localhost:8004](http://localhost:8004)
with caching disabled (so edits show on reload) and proxies the `/Exec` backend
call to a running TryAPL server. Configure it with environment variables:

- `PORT` &mdash; port to serve on (default `8004`)
- `BACKEND` &mdash; base URL of the backend to proxy `/Exec` to (default `http://localhost:8080`)

```
# use the live backend instead of a local one
BACKEND=https://tryapl.org node dev-server.js
```

### Staged Continuous Integration
1. Development work is pushed into the master branch.
2. The master branch is merged into the staging branch. Check TryAPL has successfully built in Jenkins and see the result on [staging.tryapl.org](https://staging.tryapl.org)
3. Merge staging into the live branch.
