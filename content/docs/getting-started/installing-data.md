---
title: Installing ❒ data
date: 2017-09-19
excerpt: This guide will cover how to install the data tool and verify that it is working properly.
---

This guide will cover how to install the **data** tool and verify that it is working properly. **data** is distributed as a command line tool.

There are two options for installation:

1. Installing pre-built binaries. These have no dependencies and will work "out of the box".
2. Install via NPM: you need to have node (>= v7.6) and NPM installed.

# Installing binaries

1. Go to the [releases page](/download)
2. Download the pre-built binary for your platform (MacOS, LinuxOS x64 or Windows)
3. Uncompress, make it executable and place into your `$PATH` (see below for your OS)

## Windows MSI

If you're using MSI for Windows, you can install it in a standard way and jump to the <a href="#verifying-the-installation">next step</a>.

## MacOS

```bash
gunzip -f data-macos.gz
chmod +x data-macos
mv data-macos /usr/local/bin/data
```

>[!info]If you have an error message saying 'no such file or directory', you might need to create a directory in your '/usr/local/' by running:
`mkdir /usr/local/bin`


## Linux

```bash
gunzip -f data-linux.gz
chmod +x data-linux
mv data-linux /usr/local/bin/data
```

>[!info]If you encounter errors related to location of 'xdg-open' package, following may help:
`cp /usr/bin/xdg-open /usr/local/bin/xdg-open`


## Windows

This is the suggestion - you can uncompress using your preferred way. The path may change depending on your OS distribution and configurations:

```bash
gzip -d data-win.exe.gz
move data-win.exe "C:\Windows\System32\data.exe"
```

# Installing via NPM

You can also install it from `NPM` as follows:

```bash
npm install -g data-cli
```


# Verifying the Installation

To test that `data` has installed correctly run:

```bash
data --version
```

This should output a version number, e.g.:

```cli-output
0.8.9
```

You can also run `help` command to see how to use this tool:

```bash
data --help
```

# A first step

Finally, and as a last test, you can try out your first `❒ data` command: `info`.

**Note:** *This command makes **no** changes to anything on your machine or on the DataHub so it is completely safe to try out!*

The `info` command provides info on a data file or dataset whether it is on the DataHub or your local disk. Here's an example for you to try:

```bash
data info https://datahub.io/core/finance-vix/datapackage.json
```

It should look something like this:

```cli-output
CBOE Volatility Index (VIX) time-series dataset including daily open, close,
high and low ...
```

[Learn more about **data** tool here &raquo;][more]

[more]: /docs/features/data-cli

# Next step - publish data

As you now have everything setup, you can try to learn how to publish data - follow [these instructions](https://datahub.io/docs/getting-started/publishing-data). Here is the preview of how easy it is:

![](https://raw.githubusercontent.com/datahq/datahub-content/master/assets/img/push.gif)

