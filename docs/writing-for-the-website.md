# Writing for the Antioch Urban Growers website

A guide to adding posts and recipes to the website yourself.

> **Scaffold — not ready to send yet.** Everything marked `[FILL IN]` needs a
> real value, and the walkthrough should be checked against the editor once
> sign-in is working. See "Before sending this to the client" at the bottom.

---

## What you can do

You have an editor built into the website. You can:

- Write a blog post and put it on the site
- Add a recipe
- Add pictures
- Change or delete something you posted earlier

You do **not** need to know anything technical, and you cannot break the
website by writing something. If a post has a problem, it simply does not
appear — the rest of the site carries on as normal.

## The two links you need

| What | Link |
| ---- | ---- |
| **The editor** — where you write | `[FILL IN: https://www.antiochurbangrowers.com/admin]` |
| **The preview** — where you check your work | `[FILL IN: Netlify branch-deploy URL for `publish`]` |

Bookmark both. The preview is a private copy of the site — only people with
the link see it.

---

## Signing in

1. Open the editor link.
2. Click **Sign in with GitHub**.
3. Enter your GitHub username and password.

That is the same GitHub account you already have. If it does not let you in,
send `[FILL IN: your name]` a message — it is a permissions setting, not
something you did wrong.

---

## Writing a blog post

1. Sign in to the editor.
2. Click **Blog posts** in the left-hand list.
3. Click **New Blog post**.
4. Fill in the boxes:

   | Box | What to put |
   | --- | ----------- |
   | **Title** | The headline. This also becomes the post's web address, so you do not need to name a file or worry about spaces. |
   | **Author** | Your name, as you want it shown. |
   | **Publish date** | Pick from the calendar. Posts show newest first. |
   | **Post** | The post itself. |

5. Write the post in the big box. There are buttons along the top for **bold**,
   *italic*, headings, lists and links — like any word processor.
6. Click **Save**.

That is the whole job. There is no separate "publish" button and nothing to
send anybody.

### Adding a picture

Put your cursor where you want the picture, click the **image** button, and
either choose one you have used before or upload a new one from your computer.

Pictures upload full-size, so large photos straight off a phone are fine.

---

## Checking your work

After you save, the site rebuilds itself. This takes **a few minutes** — it is
not instant, so do not worry if the preview looks unchanged at first.

Once it is ready, open the preview link. Your post will be on the blog page.

Things worth a look while you are there:

- Read it on your phone as well as a computer
- Check any links you added actually go where you meant
- Check pictures are the right way up

If something needs changing, go back to the editor, open the post, fix it, and
save again. You can do that as many times as you like.

---

## Putting it on the live site

Saving puts your post on the **preview**, not on the public website. This is on
purpose — it gives you room to write, look at it, and change your mind.

When you are happy with it, tell `[FILL IN: your name]` it is ready and they
will put it on the live site.

`[FILL IN: how you would like to be told — text, email, Discord?]`

---

## Recipes

Exactly the same, but click **Recipes** instead of **Blog posts**. Recipes have
a title, an author and the recipe itself — no date.

For ingredients and steps, use the list buttons rather than typing dashes or
numbers by hand; they will line up properly on the page.

---

## Changing or removing something

1. Sign in to the editor.
2. Click **Blog posts** or **Recipes**.
3. Click the one you want.
4. Change it and **Save**, or use **Delete** to remove it.

Deleting takes it off the preview straight away, and off the live site the next
time `[FILL IN: your name]` publishes.

---

## Questions people usually have

**Do I have to finish a post in one sitting?**
Better to write long posts somewhere comfortable first — Word, Google Docs,
notes on your phone — and paste them in when they are ready. The editor does
not keep half-finished drafts for you.

**What if I make a mistake?**
Nothing you type is permanent and nothing you type can break the website. Every
version is kept, so anything can be undone.

**Can I add a video?**
Not at the moment. Send the link to `[FILL IN: your name]` and they will sort
it out.

**How long until it is on the real website?**
The preview takes a few minutes. The live site updates when
`[FILL IN: your name]` publishes it — so it is worth mentioning if something is
time-sensitive, like an event this weekend.

**Something looks wrong and I did not do it.**
Send `[FILL IN: your name]` a screenshot. Do not delete anything to try to fix
it.

---

## Before sending this to the client

Delete this section first. Notes for the maintainer:

- Replace every `[FILL IN]`. The editor and preview URLs do not exist until
  `/admin` is deployed and the `publish` branch has a Netlify branch deploy.
- Walk through the flow once yourself after sign-in works, and correct any
  button or label names — this was written from the configuration in
  `public/admin/config.yml`, not from using the editor.
- Decide how you want to be told a post is ready, and say so in "Putting it on
  the live site".
- Consider doing the first post sitting alongside them rather than sending this
  cold. The value here is the client publishing at all; a document is a weaker
  start than fifteen minutes together.
- Keep this in step with `config.yml`. If the fields change, this changes.
