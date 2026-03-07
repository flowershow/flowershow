# Tutorial 4: Customising your website locally and previewing your changes locally

> [!info]
> 🚧 This tutorial is currently in outline form. Stay tuned for the full version!

## Introduction

In this tutorial, we will dive into the more technical aspects of website customisation, but this time, everything will be done locally. You'll learn how to preview your site on your own machine before pushing changes to the live site, ensuring everything looks and works exactly as you want.

By the end of this tutorial, you will:

- Understand how to preview your site locally.
- Know how to change your website's title and description.
- Learn how to customise your website's appearance using Tailwind themes.
- Understand how to configure the navbar, navigation links, and logo.
- Learn how to integrate Google Analytics into your website.
- Be aware of additional customisation options for deeper customisation.

## Previewing the site locally

- Navigate to your website's repository directory on your computer using command line
- Install the site's dependencies
- Start the local development server
- Visit the local address displayed in your command line. Yay! You can now preview your changes locally, live! 🎉

## Changing the site title and description

- Perfect! You've personalised your site's title and description! 🎉

## Configuring the title, description and navbar

- Open the `content/config.mjs` file in your code editor
- Edit the `title` and `description` fields
- Edit the fields in the `navbar` field to customise your navbar's title and logo. Then, add navigation links to `navLinks` field (these will be displayed in the navbar). Save and refresh your local site to see the changes.

## Integrating with Google Analytics

- Still in the `content/config.mjs` file, navigate to the `analytics` field
- Enter your Google Analytics tracking ID, save and refresh your local site to ensure it's integrated correctly
- Excellent! Your website is now integrated with Google Analytics! 🎉

## Customising the Tailwind theme

- Open `tailwind.config.js` file in your code editor
- Change the light and dark theme colours and fonts to your liking, save and refresh your local site to see the changes
- Awesome! Your website now has a new look! 🎉

When you're happy with all your changes, use GitHub Desktop to commit your changes and push them back to your GitHub repository.

In addition to these topics, the full tutorial shows you what other customisations options are available and where to find information on these.