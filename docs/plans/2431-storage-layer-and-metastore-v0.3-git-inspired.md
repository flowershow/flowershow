---
created: 2024-05-19
pstatus: 🚧
authors:
  - rufuspollock
---

This is a *major* RFC/Shaping doc. It sets out a design for the storage layer and metastore of DataHub Cloud. IMO this represents something of breakthrough 😄

Definitions

- Storage layer: how we store content/data on disk in the backend
- Metastore: API to content/data that includes at least a) where to locate it in storage b) how to retrieve metadata about it

## Tasks

- [ ] Motivation in general
- [ ] Context about design of architecture in general
- [ ] Set out problem right now i.e. situation and complication
- [ ] Refactor to a hypothesis format
- [ ] Storage layer
  - [ ] Disk structure
  - [ ] API (Metastore Storage)


## Executive Summary

This design is git-inspired and git-syncable i.e. you can sync git to it.

It has the following attractive features ...

- Git-compatible: you can easily sync from git-style storage
- You can enhance the basic file-tree with metadata so you can store information about files (e.g. what is extracted from markdowndb or table schema information for tabular files)
- You can directly store files including large files

This in turn supports the following useful use cases:

- git(hub) source: where original files are managed in git(hub)
  - git + git lfs with git-lfs storage run on our storage
  - git with with large files hosted in our cloud (i.e. no lfs) - though not sure why you'd use this and not use lfs (unless you didn't want large files locally for some reason e.g. want to use obsidian and sync with git but not store images locally)
- direct storage on our cloud

### Layout on disk

On disk e.g. in R2, it looks like the following:


```
# content addressed blobs, trees, commits
/objects
  # like git let's use first 2 letters a prefix as a method of 256 sharding the folder
  /aa/
  /ab/
  ... 
```

### Index

Index structure. This will likely be in a central database. however, could also be on disk if wanted.

This is per project so imagine everything prefixed by project

- blob, 
- refs

### Questions

- Qu: how do we set download filename when redirecting to r2? In general, you need to set `content-disposition` header. On s3 you can do this per request by setting a query parameter when giving out a signed url.
- Qu: can we reconstruct index from object store? Does it matter? 

### Algorithms

Key algorithms operate as follows:

- Sync git: copy over blobs etc direct to storage. update index from github api
- Sync git-lfs (or direct storage): TODO
- Direct upload: see below
- Retrieval via url path: see below
- Retrieval of directory tree: see below
- Deletion: see below

# Original

# Background and motivation

We want a design for data/content store. We would like one where:

- Content/data store that can sync with git(hub)
  - BONUS: sync git lfs (or act as git lfs backend)
  - Why: if i am using git(hub) and i want to publish from it then i need content/data to sync somewhere for publishing b/c you can't run directly off the git(hub) API because of rate-limiting and performance reasons.
  - ℹ️ This is exactly what we are doing right now with DataHub Cloud where we are using git(hub) as primary storage and then we sync to R2.
- Content/data store that can be used directly (i.e. without github)
  - Why: a bunch of people wanting a datahub don't want to have to use git/github
    - e.g. CKAN has a blob storage layer.
    - many datahub portaljs sites don't want/need git(hub) as a backend
  - Note: we would still like some git-like features like revisions though this is a bonus and not essential)

What we don't need:

- To *be* git. Specifically, we don't need to be able to sync back to git

What we *may* need ...

- Mixed usage where some projects are git(hub)-linked and where some projects are not (they are "pure") storage

## Storage layer needs

- Store content coming from git(hub) specifically blobs and trees (and perhaps commits)
- To store blobs directly for git lfs type material -- either actual git lfs or just direct storage (these are probably sha 256 hash addressed blobs as per git lfs approach)

On retrieval

- Given a url path e.g. `/@me/myproject/abc.csv` display file associated with it ... (optionally a commit / branch / tag)
- Given a directory get me the contents of that directory
- More generally: Get me all files in a repo (of type X)

## Design

### Layout on disk

See exec summary

### How do we support queries for files ...

#### Design

- filename of a blob (at a given commit) is stored in tree
- traversal looks like ...
  - given commit xxx
  - look up root tree for commit xxx => tree yyy
  - search downwards through tree yyy for tree containing that file name

A full cached index of this would look like (per project, though strictly commit should be unique per project ...):

```
# OBJECT INDEX TABLE
commit_sha | path | object_sha | [type=tree,blob]
aaa | /abc/xyx.csv | xxx | tree


# REFS TABLE
project | ref | commit_sha
```

ASIDE: do we want commit_sha or root_tree in the table?

#### Howto get all files

  - Given project, find the current HEAD commit (look up in refs table) XXX
  - `SELECT * FROM object_index WHERE commit_sha = XXX;`
- Get a given file: `SELECT * FROM  object_index WHERE commit_sha = XXX AND path = YYY`
### How do we add a file direct ...

- Before: just store into r2 via the path ...
- Now:
  - upload file via it's sha (you need to provide the sha to upload ...). NB we probably use sha 256 (like git lfs)
  - add to the index the file path (in simple version)
    - more complex:
      - identify directory it is in
      - in current head commit find that tree
      - modify tree
      - compute new tree for that directory. 🚩 we use special format (NOT backwards git compatible) of using `type: lfs` and storing sha256 e.g.
        ```
        xxxx tree sha
        xxxx tree sha
        xxxx lfs  sha256
        ```
      - compute all new parent trees with new sha
      - compute new commit
      - store the commit
    - Bit of a pain but not *that* complex ...
    - And could find simpler options (e.g. if we only care about head we can probably find easy ways ...)
### Delete a file 

- Leave blob/tree in object store
- Update parent trees recursively upwards
- Create a new commit

### How do we sync from git(hub)

- Get the current commit/head tree list and recurse through it
- Add objects (trees/blobs) that aren't in our store
- Update index (very fast - that's almost a pure copy paste from github get tree command https://docs.github.com/en/rest/git/trees?apiVersion=2022-11-28#get-a-tree)

### Support for Git LFS

We can use our storage for git lfs support ...

Need to be a bit specific about what we mean. Do we mean:

- EITHER: syncing from git-lfs e.g. github git lfs storage
- OR: acting as git lfs storage

TODO

### Optimizations ...

- Have a `HEAD` field in `object_index` table that shows `TRUE` if part of HEAD. This allows skipping the first step in look up.

## Appendix: How does current system work and what are its disadvantages

- store everything onto disk (r2) by *filepath*
- just store "HEAD" -- or more accurately whatever was last synced. that is we only store content from the last sync and don't keep older material.

Advantages:

- Lookup is very easy from url
- Raw access and downloads are very simple - just point to the file

### Disadvantages / issues

- [Future] No support for direct storage of large files
- No support for revisions
- No commit info stored ...
- Deletions (do we even do them atm)
- 🔥 Large syncs fail (not really to do with this? timeouts and need for resume)
- 🧊 (?) Inefficiency e.g. if we move or rename a file then sycning resync that entire file (this is a bigger deal if that is a largish file)

### Appendix: storage calculations

Is it a problem that we store a copy every time for a change of a file even if a small change to a large file (i.e. we don't do packing like git does)? Basic answer: no, mainly because

- we'll have large binary files (e.g. images or datasets) which don't pack anyway. these will dominate storage anyway.
- (secondarily) our system isn't designed for syncing. 

Let's do an illustrative calculation:

- Imagine we have a 10Mb repo
- We have 1000 commits with modifications totalling 100Mb (e.g. 50k file is modified 100x that means 5Mb of storage if no compression)
- 100Mb costs us 0.01c a year roughly
- We need only 1Gb file to account for this and more. so think being inefficient with repo itself is not a big deal ...
- Basic point: actual blobs (not text files) will dominate storage costs so don't worry about not storing text efficiently

❓ [minor] Asides: can we use gzip compression for more efficient storage and transfer?

## Appendix: How does git work?

See https://git-scm.com/book/en/v2/Git-Internals-Git-Objects

Git is a content-addressable filesystem with revisions.

A git repository stores all content in the object-store.

3 things stored in the object store, each named by their hash:

- blobs
- trees
- commits

What does each entry look like?

- blob: just contains byte stream of that file (encoding?)
- tree: listing of contents of a directory e.g.
  ```console
  100644 blob a906cb2a4a904a152e80877d4088654daad0c859      README
  100644 blob 8f94139338f9404f26296befa88755fc2598c289      Rakefile
  040000 tree 99f1a6d12cb4b6f19c8655fca46c3ecf317074e0      lib
  ```
- commits: metadata including log message plus root tree hash e.g.
  ```console
  tree d8329fc1cc938780ffdd9f94e0d364e0ea74f579
  author Scott Chacon <schacon@gmail.com> 1243040974 -0700
  committer Scott Chacon <schacon@gmail.com> 1243040974 -0700
  
  First commit
  ```

#### References

https://git-scm.com/book/en/v2/Git-Internals-Git-References

Need a nice way to find relevant commit e.g. what is HEAD, what is a given branch pointing to.

Refs then make it easy by providing human readable names ...

```
label | commit_sha
------| ----------
main  | aaaaa
```

#### Git LFS

TODO

#### Sha calculation

Strictly git calculates not the sha of the file contents but sha of file contents plus a short header which is of form:

```
{file-type} {length in bytes}\0
```

e.g. for a blob:

```
blob {bytesize}\0
```

## Appendix: How does huggingface work

- Looks like huggingface straight up implement their own git layer
- They then have a CLI wrapper for the dataset storage stuff that essentially wraps git so you don't have to know and use git if you don't want to ...

## Extra benefits

- r2 has 1024 character limits on object names. If we use paths we have risk of exceeding that on a very nested directory structure (or very long file names). with shas there is no risk of this.

## Builds on / supersedes

- [[2410-metadata-store]]

## 

![[../Excalidraw/metastore-and-storage-layer-2024-05-24.excalidraw.svg]]
