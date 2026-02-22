
Or any other build tools where you build yourself. ...

Or more broadly: when to use flowershow vs build yourself with a given tool.



- **Who is this (comparison) for?** Who asks this question: for avg obsidian user not even a question as they don't want nextjs in their vault? ... **so guess this is more power-users / devs etc**
- Purpose: Make clear the value adds flowershow offers: why is this more than "nextjs in a box", why not just use nextjs and cloudflare/vercel for deployment.
	- Show when to choose which option (sometimes nextjs etc is better)
	- Possible extra: demonstrate how you can do X in NextJS or 11ty or whatever in Flowershow


Alternatively: What would it take to build this yourself?

- Pollution (have to add code-y stuff): Pollutes your docs / kb or whatever with build code ...
	- Your content repo ends up with a bunch of code in it ... (not great for tracking and for non-tech team members ... ).
	- if you have e.g. an obsidian vault you don't want other stuff in it especially a bunch of random code ...
- Maintenance: 
	- Even with AI, you still need to maintain nextjs/11ty or whatever you use.
- Markdown (the basics): what does it take to setup vercel for markdown (more than you think!)
- Tailwind: another thing to configure and handle

Feature list (that you have to integrate and maintain)

- Math
- Mermaid
- Wiki links
- SEO support
- Social previews
- Table of contents (done well)
- Site table of contents
- Navbar and footer (customizable easily)
- Themes!
- Tailwind support
- HTML publishing
- Asset handling
- Image optimization ...
- Auto-publish from github (with nothing to be added, no nextjs code etc!)
- Data display
- Blog listings
- (Obsidian) bases support
- More ...

We could make this into some kind of exhaustive animation to really give people the sense. of a little video. well isn't it just nextjs? and then i add this. then i add this, then i add this ... (this was our own experience).

Also we wanted to publish a lot of stuff. even if 10-20m each time that is major friction and stuff i have then have to maintain across 10 different websites. even just setting up for basic markdown was a hassle.

## When you do want nextjs etc

- Full customizability: you want to control every pixel ...
- You have a lost of JS / React interactivity or you are even building a rich app
	- Yes flowershow can do some JS and we support MDX but it won't be like a full nextjs app
		- NB: you can do *a lot* in flowershow. for example you can load js etc
- 

## Appendix: What happens if flowershow goes away ...

*This may be another separate question that should be in FAQs. Why people like self-hosted ...*

- Everything in flowershow is open source
- Built on NextJS core so you could just migrate (with some effort - but less than if you built from scratch!)


