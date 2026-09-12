# Vandy Tasks

A **1:1 port** of [Tasks for Canvas](https://github.com/UseBetterCanvas/canvas-task-extension) for [Vanderbilt Brightspace](https://brightspace.vanderbilt.edu/).

Upstream is MIT-licensed (© Jeffrey Cheng / UseBetterCanvas). This project keeps that UI and logic, with Brightspace fixes for Vanderbilt.

## Install

1. `npm install`
2. `npm run build`
3. Chrome → **Extensions** → Developer mode → **Load unpacked** → select the `build/` folder
4. Open Brightspace and reload the homepage

## What you get

Same Tasks for Canvas experience on Brightspace:

- Progress rings by course
- Unfinished / completed task lists
- Week navigation, course filter, custom tasks, confetti, options page
- Mounted in the **homepage announcements column** (hides announcement widgets and inserts Tasks there)

## Brightspace fixes (vs upstream)

- Session OAuth via XSRF (so enrollments/assignments actually load)
- Real due dates (upstream had a hardcoded date bug)
- Loads `content/myItems` **and** calendar due events so more classwork shows up
- All active course enrollments are included (`dash_courses` off by default)

## Develop

```bash
npm start   # webpack dev server
npm run build
```

Load `build/` as an unpacked extension after each production build.
