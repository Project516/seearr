---
title: Recommendations
description: How the Recommended For You and New For You rows pick titles.
sidebar_position: 3
---

# Recommendations

The Discover home page has two personal rows:

- **Recommended For You**: titles similar to what you request and what is downloaded.
- **New For You**: the same list, limited to titles released in the last 180 days.

Each user sees their own rows. They need no extra setup, API key or AI model, and they use the TMDB connection Seearr already has.

## How titles are picked

1. Seearr takes your 10 most recent requests and the 10 most recently downloaded titles. These are the seeds.
2. For each seed, it asks TMDB which titles it recommends.
3. A title earns one point for each seed that recommends it. Titles recommended by many seeds rank highest.
4. Genres that come up often across the results count as your taste. Titles in those genres move ahead of others with the same points.
5. Remaining ties go to the title that is more popular on TMDB.
6. Anything you already requested, anything already downloaded or removed, and anything blocklisted is left out.

The ranked list is cached for five minutes, so scrolling a row does not repeat the TMDB lookups.

## When the rows are empty

A new user with no requests, on a server with nothing downloaded yet, has no seeds, so both rows stay hidden. They appear after the first request or the first download.

## Moving or hiding the rows

Administrators can reorder or turn off either row like any other Discover row, using the edit button on the Discover page.
