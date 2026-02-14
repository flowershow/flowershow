# Nx

## Applications and libraries

https://nx.dev/more-concepts/applications-and-libraries

- a typical Nx workspace is structured into apps and libs
- Nx automatically creates TS path mappings in the `tsconfig.base.json` file, so that they can be easily consumed by other apps, e.g.:

```js
// example of importing from another workspace library
import { Button } from "@flowershow/ui";

// ...
```

- library is not just a code put into a separate folder
  - each library should have a "public API" exposed by its `index.ts` file
  - it forces developers into an "API thinking" (what should be exposed and what should be kept private)
- library doesn't have to be general purpose (consumed by multiple projects)
  - it can be created just for better code organization
  - ease of re-use can be a positive side effect though
- library doesn't have to be publishable
- library doesn't have to be buildable
  - an app can consume it and build it itself directly
  - it can be buildable though if we want to enable incremental builds
- libraries can be nested into sub-folders
- application can be thought of as a container that budles functionalities implemented in libraries

> We could probably encapsulate some parts of the current template in libs (e.g. component's library, configs etc.). Not only so that in the future we can use them in other templates but also for the sake of separation of concerns, cleanliness, "API"

### Recommended library types

https://nx.dev/more-concepts/library-types

#### Feature libraries

- "smart" components (with access to data sources), which implement a business use case or a page in an app
- almost always app-specific
- often lazy-loaded

#### UI libraries

- "dumb" components (presentational)

#### Data-access libraries

- code for interacting with back-end
- code related to state management

#### Utility libraries

- low level utilities used by many libraries and applications
- often no framework-specific code, e.g. pure functions

### Should I make a new library?

- splitting code into libraries can make commands run faster
  - faster `nx affected`
    - e.g. if you split your one big library into a few smaller ones and run `nx affected` on a given target, it may be the case that this target doesn't have to be re-run on all the smaller libraries, because the changes you made only affect some part of the original mega-library
  - faster Nx computation caching
    - i.e. faster commands's re-runs, faster saving to cache and fetching cached results
- it can also makes nx dependencies graph more valuable
- you can enforce constraints on how different types of libraries depend on each other using tags

### Should I add code to an existing library?

Rule of thumb: if the code is closely related to some already existing library - probably yes.

- related code should be close together
- better DX as you don't need to jump around multiple different folders
- every new library adds some folders and config files, which do not directly contribute to business value
- enforcing constraints may not be beneficial for rapidly evolving code (like ours) as it can get in the way of experimentation and exploration
- if may be a good idea to develop a single library for a while so that the architecture starts to emerge naturally and refactor into smaller libraries when the pace of change has slowed down

### Creating libraries

Nx makes it easy to add new libraries (or apps) to the monorepo, by using their code generators. Code generators automate repeatable tasks like scaffolding of similar projects and provide a standard for creating them.

For example, to create a new publishable, js node library:

```sh
nx g @nrwl/node:lib --js --publishable --importPath @flowershow/ui
```

https://nx.dev/plugin-features/use-code-generators

You can also create your own generators for more custom solutions.

### Managing libraries

Move/rename:

```sh
nx g move --project booking-some-library shared/some-library
```

Remove:

```sh
nx g remove booking-some-library
```

## Workspace

### Structure

See the [workspace structure example](https://nx.dev/more-concepts/grouping-libraries#example-workspace)by Nx.

- libraries should be grouped by scope, which is usually an application they belong to

## Tasks

- **Target -** the name of an action that can be taken on a project (e.g., `build`)
- **Task -** an invocation of a target on a specific project (e.g., `header:build`)

### Defining tasks

Tasks can be defined as npm scripts in a project's `package.json` file or as targets in a `project.json` file.

Example in `project.json`

```json
{
  "targets": {
https://nx.dev/plugin-features/use-code-generators    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "webpack -c webpack.conf.js"
      }
    },
    "test": {
      "executor": "@nrwl/jest:jest",
      "options": {
        "codeCoverage": true
      }
    }
  }
}
```

### Task executors

- executors perform actions on your code (e.g. building, linting, testing)

How are they different from shell or npm scripts?

- they encourage a consistent methodology for performing similar actions across different projects
- nx can leverage this consistency to run the same target across multiple projects (e.g. `nx run-many --target=test`)
- executors provide metadata to define the available options, which allows the Nx CLI to show prompts in the terminal and Nx Console to generate a GUI for the executor

### Running tasks

Run a single task:

```sh
npx nx test cli
```

Run a given target on all projects[^1]:

```sh
npx nx run-many --target=build
```

Run tasks affected by the PR:

```sh
npx nx affected --target=test
```

[^1]: Nx will figure out the right order in which to build projects.

### Cache task results

Nx uses computation cache to never run the same task twice. It restores the results of running a given task from cache.

This is configured in `nx.json`

```json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "test"]
      }
    }
  }
}
```

To clear the cache run:

```sh
nx reset
```

Byy default it uses local computation cache. You can also use Nx Cloud distributed caching for storing the cache (free for open-source project).

To connect the workspace to Nx Cloud run:

```sh
npx nx connect-to-nx-cloud
```

## Dependency graph

Exploring this graph visually can be useful to understand why Nx is behaving in a certain way and to get a high level view of your code architecture.

To launch the project graph visualization run:

```sh
nx graph
```

## Code generators

- can be used to standardize and automate generation of libraries, apps, components, features etc.

**Types:**

- plugin generators - come from Nx plugins installed in the workspace
- local generators - custom generators created for the workspace
- update generators - are invoked by Nx plugins when you update Nx to keep your config files in sync with the latest versions of third party tools
