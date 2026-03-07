# Tutorial 2: Edit your website locally on your computer using Obsidian

## Introduction

In this tutorial, we will walk you through the process of editing your website locally on your computer. 

By the end of this tutorial, you will:

- Gain a deeper understanding of working with Git and GitHub Desktop.
- Learn how to clone your website's repository to your computer.
- Learn how to edit content using Obsidian.
- Learn how to commit (save) your changes locally and push them back to the GitHub repository.

Below is a screenshot of how the final website will look like:

![[tutorial-2-result.png]]

## Prerequisites

- [Obsidian](https://obsidian.md/) installed.
- [GitHub Desktop](https://desktop.github.com/) installed.
- [Tutorial 1](tutorial-1) complete.

## Clone the GitHub repository on your computer

'[Cloning](https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository)' a repository means that you are creating a copy of the repository from GitHub on your local machine. Here's how to do it:

### 1. Open GitHub Desktop app


### 2.  Click on "Clone a Repository from the Internet..."

Or click on "File" -> "Clone repository".

If this is the first time you're using GitHub Desktop, it will prompt you to log in to your GitHub account. Click "Sign In" and follow the prompts.

Once you're done and you've authorised GitHub Desktop to access your repositories, go back to GitHub Desktop. You should now see a list of all your GitHub repositories. 

### 3. Select the repository you want to clone


### 4. Choose where your repository should be saved

Type the path manually or click "Choose..." to find it using file explorer.

### 5. Click "Clone" and wait for the process to complete

Done! You've successfully cloned your website's repository on your computer.

## Edit your site in Obsidian

### 1. Open Obsidian

### 2. Open your repository's `/content` folder as vault

Click on "Open" in "Open folder as vault" section and select the path to the `/content` of the cloned repository.

Now you're ready to edit your site! In the left-hand side panel you should see the two files we created in Tutorial 1: README.md and about.md (or whatever you chose to call your new page).

### 3. Edit your site's content

Now, let's add some more stuff to the home page. 

#### Adding wiki-links

Let's say that for more information about you and your site, you want to add a link to the 'about' page on your homepage. Click on the README.md page to open it, and create a wiki-link to the about page, like so:

```md
[[about]]
```

When you start typing, after writing empty double brackets `[[]]`, Obsidian will suggest all the available pages you can link to, and after you select one it will create the link automatically for you.

#### Creating a folder

Now, let's say you want to show people what books you've read and share your reviews and other information on each one. And let's say you want the information on each book to be available at `/books/abc` path on our website. To achieve this, you need to create a folder called `books` in your vault and add all the project-related files in there.

To create a new folder in Obsidian, click on the "New folder" icon, and give your folder a name.

Now, let's write some book reviews. You can do this by right-clicking on the `/books` folder, and selecting "New note". Rename the newly created `Untitled.md` file and add some review in it. In the same way, you can keep adding more reviews in the `/books` folder.

#### Creating an index

Ok, now let's make a page that will list all your books reviews - our Bookshelf! It would be nice to have it available under `/books` path on the website, since each of our books will be available under `/books/abc`. 

To achieve this, we have to create an index page *inside* our `/books` folder. Create a new note inside the folder (as in the previous step), and then list your book reviews with wiki-links to their pages. Then, add a link to your Bookshelf page on your home page, so that it's easy to find.

If you want to have your link say something different than the raw `books/index`, you can do this by typing `|` after the path and specifying an alternative name, .e.g:

```md
[[books/index|Bookshelf]]
```

Let's also do this for the about page:

```md
[[about|About me]]
```

#### Adding a callout

Now, let's maybe add a short info at the bottom, that this site is new and is currently being worked on, in form of an Obsidian callout:

```md
> [!info]
> 🚧 This site it pretty new and I'm enhancing it every day. Stay tuned!
```

... which will look like this:

> [!info]
> 🚧 This site it pretty new and I'm enhancing it every day. Stay tuned!

Great, our updated site is ready to be published! 🔥

## Save and publish your changes

### 1. Navigate to GitHub Desktop app

In the "Changes" tab, you'll see all the changes that have been made to the repository. All the new files will have `[+]` sign next to them, and all the edited files will have `[•]`.

### 2. Commit your changes

Now, to save these changes we need to "commit" them, which is a fancy term for making a checkpoint of the state at which your repository is currently in.

Let's make this checkpoint! In the bottom left corner there is a "Summary (required)" field, which is the place for a commit message - a concise description of the changes you made. The "Description" field is optional, and it's only needed if you need to add some more information about your changes that doesn't fit in the commit message.

Now, hit the "Commit to main" button, and done! Now GitHub Desktop should say there are no local changes again. And that's correct, as all the changes we made have successfully been saved, and no other changes have been made since then. (You can inspect the whole history of past commits in the "History tab".)

The very fist commit on top is the commit we've just made, but you can also see all the commits to the repository we made in [[tutorial-1|Tutorial 1]], via GitHub UI.

### 3. Push your changes to the remote repository

The commit we've just created has ↑ sign next to it. It means it hasn't yet been pushed to our remote version of the repository - the changes you made has been saved, but only locally on your computer. In order to push them to the cloud copy of the repository (aka "remote"), click "↑ Push origin (1 ↑)" tab.

When the "push" is complete, the arrow next to the last commit message should disappear, and there should be no `(1 )` indicator next to "Push origin" button.

### 4. See updated site live!

Reload your website to see the updated site live. Congratulations! 🎉

## What's next?

By learning how to utilise Obsidian and GitHub Desktop, you have unlocked powerful editing capabilities and improved the overall publishing process. Now, you can enjoy the benefits of offline editing, simultaneous file editing, and previewing the extended Markdown syntax provided by Obsidian.

But what happens if you want to collaborate with others on your website project? In the next tutorial, we will learn how to create a new branch of your repository locally, and then merge any changes with the web version.

[[tutorial-3|Next: Tutorial 3]]
