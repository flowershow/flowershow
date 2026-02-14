---
date: 2022-11-22
title: Cloud Publishing Design
---

Design of Flowershow cloud publishing. One click/command publishing of your digital garden. 

# Job Stories

### Tech-oriented person publishing docs, digital garden etc

When as a developer who is publishing docs, my digital garden, my micro website I want to publish quickly and reliably [and repeatedly] (and without thinking) so that my site is online and shareable

* For "Devs" who want convenience, speed, collaboration etc (don't want to setup github pages with build themselves etc etc)
* very seamless and without thought
* all they need to do is signup/login
* run one command and get a unique url
* these are people who can use command line and prob github ... but maybe if they want convenience (cf vercel, yes i can setup github pages build but i prefer to just run `vercel` in my root directory)

Target experience is: something like vercel/zeit for markdown ... e.g.

```bash
cd folder
flowershow publish
  [spinner]
... your site is published here {insert url}
```

### Team or person with their own content in git repo (e.g. on github)

When i have docs or garden or other markdown content on git(hub) I want to have it easily and elegantly published so that it is available online for others

- Don't want to add flowershow stuff to their repo (and deal with upgrades etc)
  - If they did seems like they could go with self-publishing ...
- Want an experience like vercel / netlify but for markdown content.

### Non-technical user / Obsidian user

When as a non-technical obsidian user I have a digital garden or notes I want to publish it online so that i can share it

* probably want a plugin
* probably want live syncing (?)

# MVP Design

## Features

A user can run a single command to publish their site:

```
npx flowershow publish
```

## Implementation

![[excalidraw/cloud-publish-git-flow-2022-11-21.excalidraw.svg]]

On the user machine in e.g. `~/.flowershow/.../`

- login
- Create a git repo locally
- Copy their files over
- Create a git repo remotely (if does not already exist)
  - Get access token or ask user to go through flow and grant them access
    - flow for desktop apps/CLIs: https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps#device-flow
- Push to the remote repo
  - [For now ignore: just do at ci level Option 2: Add flowershow in a branch (use a github action on push to "main") to trigger this]
- trigger build] with new cloudflare build command:
  ```
  # new command
  npx flowershow install # maybe need a new yaml config file (assume defaults if none exists)

  # what we do currently
  npm run build && npm run export # OR: npx flowershow export
  ```
  
## Tasks

- [ ] Cloudflare (or similar) installs flowershow for you so that we can build from a raw repo
- [ ] Create and push to git repo from flowershow cloud [mocked for now] + CLI
- [ ] Flowershow cloud frontend and backend


## Components in more detail (in progress)

### Backend API

- has signup/authentication features implemented
- exposes an endpoint to which our Obsidian plugin (and/or CLI) would send the user content (along with the authorization token received after successful login and probably some site ID, if we want to enable users to have multiple different sites)
- the server already has the template (or all the different templates we might have in the future) and all their dependencies installed
- after receiving the request and authenticating the user:
  - on the first request from this user create a github repository and then:
  - Option A (cheaper?):
    - push his content + the template folder (symlinked to the content) (+ github workflow and e.g. cloudflare config file)
    - the gh workflow would deploy the site to our own (created for this purpose) cloudflare/netlify/etc. account
    - the site is built on cloudflare/netlify/etc. 
    - we then can check the status of the workflow using GH Workflow runs API on the server and the job_id which I guess we could get after the POST request or we would query it
  - Option B: 
    - push only his content (just to have it stored somewhere if we e.g. need to re-run deploy)
    - build his site with the pushed content and the template and use Cloudflare/Netlify API to deploy (on Netlify you can do this by first archiving (zipping) the /out directory and POSTing it)
    - check status like in Option A

### Signup on our frontend page?

- and some basic user dashboard, to be able to:
  - change the password
  - delete the account
  - view status (and urls) and manage all his sites, e.g. deactivate/activate or delete them
  - check subscription status

- DB with
  - users
    - logins & passwords (probably better to use OAuth, e.g. login with GH)
    - subscription status / expiry date ?
    - a list of their sites ids (sites table)
  - sites
    - gh repos created for each site
    - (last job_id ?)
    - owner user ids
    - urls of deployed sites & deployment status

### Obsidian plugin

- the plugin could probably even be configured to push the updated content on each save automatically - if not, a "publish" button
- would be nice if it displayed info like
    - "Your site is running on [SOME_URL]"
    - when waiting for the latest version of the site to be up: "Publishing..."
    - "Latest version published: [date and time of the last publish]"

### CLI command for people who don't use Obsidian

- also would have some command to view current status of the site like in Obsidian plugin ideas above, under e.g. `npx flowershow status <site_name ?>`

---

# Discussion

### 2 Options for build in the cloud and then publish

- Option 1: try and reuse existing CI systems (which also implies using git - which may be a good thing in itself)
- Option 2: create our own build system (replicate what vercel/netlify are doing)
  - We already have flowershow installed and we just add the content and render and then deploy 💬 save on the npm install
    - this also means when we update content it is fast to build
    - note cool add-ons: e.g. image preparation for rendering

Discards

- Build locally and push to a deploy endpoint ❌ likely to be buggy as we deal with all the configuration variation on user machines. Plus it's slow to build. need to install the whole of flowershow (which is slow, they need "node" etc)

![[excalidraw/cloud-publish-options-2022-11-21.excalidraw.svg]]

### Option 1 approach via git

- Upload content files to a new git repo
- Connect git repo to netlify / cloudflare
- trigger build
- get output and pass to user

### Option 2 - CI approach

- Content Files upload to a server (in cloud close to your build system e.g. R2 on cloudflare etc)
- Install flowershow app
- Add files to flowershow app
- build
- export the built files to a static pages location
- get success url and pass to user

### How do updates work (ie. new content)?

- Option 1
  - sync the new files
  - trigger build
- Option 2:
  - add new files to git repo
  - commit
  - [build triggered]
  - monitor for completion and tell user

## Questions

- https://blog.cloudflare.com/cloudflare-pages-direct-uploads/ - cloudflare only has 3 options: CI from git repo, direct upload, wrangler upload
  - You can't use the CI without git
- Why not just use the users github account? e..g users to just create a GH account and use OAuth to "login with GH" to Flowershow? If sb can use Obsidian and MD, for sure he's able to setup an account on GH. **❌2022-11-22 because you want to have a reliable space managed by flowershow from which to kick-off rest of the build process**
  - users don't need to have their content stored on GH, we don't really care about if they do, we create a repo for their site's content (or repos in case of multiple sites), right? **✅2022-11-22 Yes, exactly**
  - what account do we use to create this repos? should we create a new, single account and create repos for all the users on this one account? **✅2022-11-22 yes**

## [DEP] Use Netlify / Vercel etc directly

- Option A (simple): use Netlify API
  - we are already doing it in one of our E2E tests for the CLI
  - the user would only need to create a personal access token on Netlify and pass it to the Flowershow prompt -> that's it!
  - Cons: command needs to be re-run each time the user makes changes to his site
- Option B (also simple, for users that use GH): use GH workflow
  - the user only need to create a personal access token on Netlify
  - also: he would need to add this token to env variables in his GH
  - Pros: the workflow does all the rest, no need to re-run publish or even run the build/export command, all this happens on push to the repo
  - Obstacles: `.flowershow` and user's content folder should be placed in the same directory - git repository
- Option C (more complex): use OAuth
  - this would require registering Flowershow CLI on GH (and Netlify?) so that we could have access to user's GH repo with Flowershow template and content, and to create Netlify account on behalf of the user if it doesn't exist (but I'm not an expert here so I would need to do more research on how all this would work) 
- Option D (complex, for the future): use GH workflow or OAuth but no `.flowershow` folder needed in the repo
  - this could be done if we make the `template` an installable package, that could be pulled by the workflow and used to build the site using user's content
  - the user would only need his content folder (and some custom stuff, config ?) stored in his repo

### Questions

- which provider do we use?
  - Netlify seems to be good as we already have a lot of experience with it and we have tested the Netlify API (and publishing a zip file) in the E2E test
- minor: should `npx flowershow publish` also automatically run `npx flowershow export` if it doesn't find the /out dir?