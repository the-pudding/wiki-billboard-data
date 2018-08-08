# Wiki Billboard Data

## Setup

#### Dependencies

- [node](https://nodejs.org)
- [npm-run-all CLI](https://github.com/mysticatea/npm-run-all)

#### Install

Clone the repo and run `npm i`

## Reproduce

Individual steps below, or run `make reproduce`

#### `npm run download-year-pages`

Download the HTML for the year event pages from wiki that contain a list of all notable births (1900-2018).

#### `npm run parse-year-pages`

Extract every person from the event pages to create a single csv of all notable births (1990-2018).

#### `npm run get-historical-rankings`

Download top 1000 wiki articles each day since 2016. Filter by if they are a person in our database, save as csv.

#### `npm run get-todays-rankings`

Download top 1000 wiki articles from today. Filter by if they are a person in our database, save as csv.
