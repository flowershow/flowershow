---
title: How to create custom layouts
description: You may have many different types of notes that you want to display in different ways on your Flowershow website, like tutorials, docs, news, or... recipes! In this tutorial, we will cover how to add a custom `RecipeLayout` for our recipe blog posts.
layout: blog
created: 2023-03-02
authors: [philippe-du-preez]
---

> [!warning]
> You are viewing documentation for Flowershow Self-Hosted. Flowershow Cloud documentation can be found [[docs/README|here]].

You may have many different types of notes that you want to display in different ways on your Flowershow website, like tutorials, docs, news, or... recipes! In this tutorial, we will cover how to add a custom `RecipeLayout` for our recipe blog posts.

## Recipe page metadata

Since we are making a `Recipe` type, we may want to display the following information about our recipes:

- difficulty (Easy, Medium, Hard)
- time (how much time it takes)
- serves (number of people served)
- ingredients (list of all ingredients needed)
- created (date when post was written)
- authors (authors of post)
- layout (our new custom layout's name)

Obviously, we could just write all this data inline, e.g. in a bullet list above or below the recipe instructions, but this way we will be able to access this data in a custom layout created specifically for our recipes and display it in a consistent way across all the recipes and in a nicer way (e.g. show ingredients list in a sidebar, or display prep time and servings with nice styling and icons).

So, let's create our first recipe! We'll add the following content to `<your-content-folder>/recipes/lasagne.md`.

```md
---
title: Homemade Lasagne Recipe
description: Lasagne is a classic Italian dish that is perfect for any occasion. It's a hearty and delicious meal that can be enjoyed by everyone.
created: 2022-11-29
authors: [John Doe]
image: https://images.unsplash.com/photo-1619895092538-128341789043?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80
difficulty: Easy
time: 30m
serves: 1-2
ingredients:
  - 1 pound of ground beef
  - 1 large onion, chopped
  - 2 cloves of garlic, minced
  - 1 jar of marinara sauce
  - 1 can of crushed tomatoes
  - 1 tablespoon of dried basil
  - Salt and pepper
  - 1 package of lasagne noodles
  - 15 oz ricotta cheese
  - 2 cups of shredded mozzarella cheese
  - 1/2 cup grated parmesan cheese
  - Fresh parsley, chopped (for garnish)
layout: recipe
---

Lasagne is a classic ...
```

> [!info] Info
> See more on how to use the `authors` frontmatter field [[/docs/blog#blog-authors|here]].

## Create a custom page layout

After creating our first recipe, we are ready to create a custom layout to display the recipe instructions along with the creation date, title, authors, difficulty, servings, prep time, ingredients.

Let's create a file named `RecipeLayout.tsx` in `.flowershow/layouts` folder with the following content:

```jsx
export default function RecipeLayout({ children, ...frontMatter }) {
  const {
    created,
    title,
    authors,
    difficulty,
    serves,
    time,
    ingredients,
    image,
  } = frontMatter;
  return (
    <article className="docs prose prose-a:text-primary dark:prose-a:text-primary-dark prose-strong:text-primary dark:prose-strong:text-primary-dark prose-code:text-primary dark:prose-code:text-primary-dark prose-headings:text-primary dark:prose-headings:text-primary-dark text-primary dark:text-primary-dark prose-headings:font-headings dark:prose-invert prose-a:break-words mx-auto p-6">
      <header>
        <div className="container mx-auto">
          <h1 className="text-center text-4xl">{title}</h1>
          <p className="text-center text-gray-800 mb-3">
            Created {new Date(created).toLocaleDateString()}
          </p>
          <p className="text-center text-gray-800 mb-3">
            Written by{" "}
            <a
              className="underline hover:no-underline"
              href="#"
              target="_blank"
            >
              {authors[0]}
            </a>
          </p>
          {/* recipe card grid*/}
          <div className="grid gap-2 gap-y-2 mb-6">
            {/* card */}
            <div className="overflow-hidden relative">
              <div>
                <img className="w-full" src={image} alt="Recipe Title" />
              </div>
              <div className="p-2">
                <div className="flex justify-between mt-4 mb-4 text-gray-500">
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="ml-1 lg:text-xl">{time}</span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path
                        fillRule="evenodd"
                        d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="ml-1 lg:text-xl">
                      {ingredients.length}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span className="ml-1 lg:text-xl">{serves}</span>
                  </div>
                </div>
                <h2>Ingredients</h2>
                <div className="flex justify-center bg-yellow-100">
                  <ul className="w-full">
                    {ingredients.map((ingredient) => (
                      <li className="w-full border-b-2 border-neutral-100 border-opacity-100 py-2">
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="absolute top-0 right-0 mt-4 mr-4 bg-green-400 text-white rounded-full pt-1 pb-1 pl-4 pr-5 text-xs uppercase">
                <span>{difficulty}</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      <section>{children}</section>
    </article>
  );
}
```

The last thing we need to do is to export the layout from `.flowershow/layouts/index.ts` file, so that it can then be imported by Flowershow to render our recipe documents.

> [!note]
> Note, that the name under which the layout is exported needs to match the name of the layout specified in the frontmatter, in this case `recipe`.

```javascript {2,6}
...
import RecipeLayout from "./RecipeLayout";

export default {
  ...
  recipe: RecipeLayout
};
```

After applying some Tailwind classes, an example recipe blog post will look like this:

![[recipePost.png]]

An additional benefit of this approach, is that if in the future we would like to change the way our recipes look, we can do this just by adjusting our recipe layout, instead of doing this for every single recipe post.

The last step we have is to create a home page where all our recipes will be displayed.

For more information on creating custom layouts, you can read the documentation [here](https://flowershow.app/docs/layouts).
