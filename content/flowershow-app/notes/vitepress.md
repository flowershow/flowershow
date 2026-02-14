# Vitepress

Vitepress is the successor to [[notes/vuepress]] released in beta in early 2022. It is developed by Evan You, the creator of Vue who also created the original version of Vuepress.

> VitePress is [VuePress](https://vuepress.vuejs.org/)' little brother, built on top of [Vite](https://vitejs.dev/). [https://vitepress.vuejs.org/guide/what-is-vitepress.html]

A linked discussion gives a good summary of why vuepress is getting deprecated in favour of vitepress https://github.com/vuejs/vitepress/discussions/548

> I initially gave VitePress a different name because I wanted to be able to explore a different architecture without worrying about backwards compat. After shipping the vuejs.org with VitePress, I believe VitePress is flexible enough to be a full replacement of current VuePress while offering better DX and better performance.
>
> The two projects are similar in that both are Vue-powered SSGs and share the same set of markdown extensions, but are also fundamentally different. VitePress tries to stay as minimal as possible and delegate customization to either Vue (via custom themes) or Vite (VitePress supports all Vite config options and plugins). There is no VitePress-specific plugin system. For a normal user that is using the default theme and doesn't need heavy customization, it can serve almost as a drop-in placement with minor changes. But it will be very different if you are building a completely custom site.
>
> The VuePress team worked on VuePress 2, which also uses Vue 3 and supports Vite. However, I see two problems with this:
>
> - It still carries the baggage of VuePress' current plugin system, which seems unnecessary when you can use Vite plugins.
> - The complexity of supporting both webpack and vite isn't desirable in the long run.

# Design

## Full "MDX" i.e. mixing markdown and code

Gives you the full equivalent of MDX in vue (i.e. using vue components)

https://vitepress.vuejs.org/guide/using-vue.html#using-vue-in-markdown

> In VitePress, each markdown file is compiled into HTML and then processed as a Vue Single-File Component. This means you can use any Vue features inside the markdown, including dynamic templating, using Vue components, or arbitrary in-page Vue component logic by adding a `<script>` tag.

### Support for both importing components and global components

https://vitepress.vuejs.org/guide/using-vue.html#using-components

> If the components are going to be used across several pages in the docs, they can be registered globally in the theme (or as part of extending the default VitePress theme). Check out the [Theming Guide](https://vitepress.vuejs.org/guide/theme-introduction.html) for more information.
>
> In `.vitepress/theme/index.js`, the `enhanceApp` function receives the Vue `app` instance so you can [register components](https://vuejs.org/guide/components/registration.html) as you would do in a regular Vue application.
