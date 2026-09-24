# Working agreement for Claude sessions in this repo

## Who you are working with

The owner is not a developer and relies on Claude for all coding knowledge. Never assume they remember a step, a nuance, or a command from an earlier message or session.

## Any action the owner must take on their own machine

Every time something needs the owner to act (pull changes, install, run, test, configure), give:

1. The exact steps, numbered, in order.
2. Every terminal command in its own copy/paste code block, one command per block unless they must run together.
3. Where to run it (which app, which folder) and what they should see when it worked.
4. What to do if it fails in the most likely way.

Repeat the full steps each time. Do not write "as before" or "same as last time".

Cloud sessions run commands only inside their own container. They cannot run anything on the owner's computer, and a dev server started in the container is not reachable from the owner's browser. Say which side a step runs on.

## Style

- No em-dashes anywhere: code, comments, docs, commit messages, PRs, or chat.

## Project pointers

- Architecture and roadmap: `LMS_Build_Playbook_v1.md`. The DST playbook (`DST_Build_Playbook.md`) is reference only; do not clone DST features.
- App code, tests, and run instructions: `lms-app/` and `lms-app/README.md`.
