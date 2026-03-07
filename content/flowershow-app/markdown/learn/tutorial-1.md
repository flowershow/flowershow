# Tutorial 1: Create a website from scratch using Markdown

## Introduction

In this tutorial, we will walk you through creating an elegant, fully functional website written in simple markdown and published with Flowershow.

By the end of this tutorial you will:

- Have a working markdown-based website.
- Be able to edit the text and add pages, all from an online interface without installing anything.

Below is a screenshot of how the final website will look like:

![[tutorial-1-result.png]]

## Prerequisites

The only prerequisite for this tutorial is a [GitHub](https://github.com/) account.

## Setting up a website

### 1. Navigate to your Github account


### 2. Create a new repository

In GitHub, a [repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/about-repositories) (or 'repo') is a place that contains your code, files, and each file's revision history, for a given project.

To create a new repository, go to the top right of the page and click on the '+' icon sign. Click  'Create new...', and then 'New repository'.

### 3. Give your repository a name

Next, give your repository a name. A good practice is to use lowercase and dashes.

You can also provide an optional description, and choose whether the repository will be private (you can choose who may see and edit it), or public (anyone can see it, but you can choose who may edit it).

### 4. Select 'Add a README file'

This file will act as a 'home page' for your site.

### 5. Click 'Create repository'. 


### 6. Navigate to [Flowershow Cloud](https://cloud.flowershow.app/) 


### 7. Sign in to Flowershow with your GitHub account details


### 8. Create a new site

Click 'Create New Site'. When prompted, select the GitHub account where you created the repository in stop 2, and then select your repository. Click 'Create Site'.

### 9. View your published site!

And voila! Your site is up and running. To view your published site, click on the link that has been generated for you (ending in '.flowershow.app').

### 10. Change your subdomain name

Flowershow automatically generates a subdomain name as a random sequence of characters. If you'd like to change your subdomain name, go back to Flowershow Cloud and click on the tab 'Domains'. Under 'Subdomain', enter the name you would like to give to your site. Note that you can only use letters, digits, uppercase and lowercase dashes for your subdomain name. Click 'Save Changes'.

## Editing a page on your website

Once your site is up and running, the next step is to customise it to your liking. Let's start by editing our home page.

### 1. Navigate to your site's repository on GitHub

You can get there by going to GitHub, clicking on your profile icon, and then clicking on "Your repositories".

### 2. Edit the "README.md" file

Find the file called 'README.md' (it should be the only file in your repository for now.) This is the file on which the homepage of your website is built. Click on it to open.

Then, click on the "Edit this file" icon (represented as a pencil), and add some content. Whatever you write here will be what shows up when someone opens your website.

### 3. Save your changes

To see your changes live, you need to "commit" them. Click on the "Commit changes..." button in the top-right corner.

In the "Commit message" field, add a concise description of your changes (for example, "add welcome message to home page"). Optionally, if the commit message is not enough, you can add more info in the "Extended description" field.

Leave "Commit directly to `main` branch" selected and hit "Commit changes". 

### 4. Preview your site after changes

Once you've committed your changes, GitHub will automatically preview what your site will look like. 

If you'd like to have easy access to your website's URL from your GitHub repo, go to the 'About' section on your repo (you'll find it on the right-hand side), and click on the settings icon. Here you can paste the URL of your site, along with an optional description.

## Add a single Markdown-based page

Now let's add a page to your site.

### 1. Navigate to your website's repository


### 2. Create a new file

Click on "Add file", then and "Create new file".

### 3. Type the name of the new file you want to create

At the end of your file name, make sure to add '.md'. For example, 'about.md'.

### 4. Write the content of the file


### 5. Save your changes

To see your changes live, you need to "commit" them. Click on the "Commit changes..." button in the top-right corner.

In the "Commit message" field add a concise description of your changes. Optionally, if the commit message is not enough, you can add more info in the "Extended description" field.

Leave "Commit directly to `main` branch" selected and click on "Commit changes". 

### 6. View your site after changes

To see the new file we've just added, you can navigate to the published page by adding `/about` at the end of your website's URL.

## What's next?

While editing on GitHub UI is acceptable, it has its limitations – it doesn't support working offline, adding multiple files simultaneously, or previewing many markdown syntax elements supported by Flowershow-based websites. We'll delve into these issues and solutions to overcome them in our next tutorial.

[[tutorial-2|Next: Tutorial 2]]
