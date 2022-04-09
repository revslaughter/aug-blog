---
title: Put Your Title Here
author: Put your name here
pubdate: 2022-05-05
---

# Template for OGC Blog

This is a template blog post. You can delete the content and start from scratch.

## Metadata

Between the pair of three hyphens on the top of this file are `title:`,
`author:`, and `pubdate`. These are fields that the site needs to:

1. Know what the title of the article is
2. Know the author of the article, and
3. Know the date at which the article is published.

Of these three, `pubdate` is important as a planned site feature is "Recent blog
posts", which will make use of `pubdate` to sort the ... most recent ... posts.
😁

## Publishing your Post

Your post can be published immediately after making a new `.md` file. You can
click the 'copy' button on the upper right hand corner of this file, and you can
basically rewrite everything below the bottom `---`.

The best process would be then to make a Pull Request. Github will notify the
owner of this repository, and the owner can approve the change. After approved
and merged to the `main` branch, Netlify will detect the new version and build
the site anew. You will then be able to view your new post on the website after
a short delay.
