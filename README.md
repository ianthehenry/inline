# inline

Inline is a browser-based outlining program that I wrote many years ago.

It worked surprisingly well at the time, considering how little I knew about programming at the time (see "Historical Context" below). Unfortunately it relies heavily on `contentEditable`, and it appears that subtle differences in behavior have crept into the world since 2011.

I don't recommend that you use it. I rather like a lot of the design, such as the "bullet classes" and the way the gutter works, but I can't guarantee that it's stable enough to trust with any important data.

You can see a live demo at [ianthehenry.com/inline](https://ianthehenry.com/inline), or you can clone the repo and open `index.html`.

# Features

- Pretty decent simulated "file browser"
- You can open multiple outlines, and drag and drop lines between them
- You can resize outlines
- Multi-line outlines, which can be collapsed
- Local persistence
- Very good drag and drop that works correctly between hierarchy levels
- Multiple, selection, including non-contiguous selections
- Modal, keyboard-based interface
- Different entry types, such as notes and checkboxes
- Surprisingly non-broken animations

# Historical Context

This is a thing that I worked on in January and February of 2011.

Apparently, in 2010, I wasn't using source control for my personal projects. I was young and foolish.

This is the first thing that I ever made in JavaScript. I had a tiny amount of JavaScript experience from my internship at the time, but this was the first non-trivial web-browser-based program that I wrote at home.

The code is a *nightmare*. Practically everything is crammed into a single `main.js` file. The DOM is the authoritative model layer (really). I didn't know anything about correctly structuring large JavaScript applications at the time. I promise I know better now.

The only positive thing I'll say about the code is that all mutations are represented as a simple reversible description, so everything goes through the same system and outline-level undo works perfectly. (Text-level undo, unfortunately, [has some problems](http://stackoverflow.com/questions/5086693)).

Inline was developed as a "Chrome App," and was developed when Chrome Apps had just come out. I was enamored by the ability to write cross-platform interactive apps so easily, and developed a few of these around the same time. It may not work in non-Chrome browsers at all.

# Icons

Most of the icons come from the excellent [Fugue icon set](http://p.yusukekamiyamane.com/). Some of them may have been modified in minor ways. I honestly don't remember.

Some of the icons were made by me.
