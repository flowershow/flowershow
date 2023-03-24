---
date: 2023-03-02
---

# What's the issue with contentlayer.dev

We've been using contentlayer.dev for over a year since before its beta release. It's been great in lots of ways and its been a core basis of [[flowershow|Flowershow]].

However, at least for our use case, we see a few issues.

### Does too many things

It combines two separate things that should really be separate:

- markdown processing pipeline
- content database / content layer

The former should really be outside of its remit given its name. (we understand kind of why they do it given they have already parsed the markdown).

Re the content database they are really only focused on the schema processing.