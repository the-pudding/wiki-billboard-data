# Wiki Billboard Data

## Live Updating Data

- [list of all people who appear in top 10 with details](https://pudding.cool/2018/08/wiki-billboard-data/web/2018-people.csv)

- [daily rank of all people who appear in top 10](https://pudding.cool/2018/08/wiki-billboard-data/web/2018-top--all.csv)

- [approved annotations](https://pudding.cool/2018/08/wiki-billboard-data/web/2018-annotations.csv)

## Historical data
- [monthly binned daily average](https://pudding.cool/2018/10/wiki-breakout/assets/data/people-montly.csv)

- [people info](https://pudding.cool/2018/10/wiki-breakout/assets/data/people-info.csv)



## Setup

#### Dependencies

- [node](https://nodejs.org)
- [npm-run-all CLI](https://github.com/mysticatea/npm-run-all)

#### Install

Clone the repo and run `npm i`

## Reproduce (historical 2015-2017 data)

Individual steps below, or run `make reproduce`

#### `npm run download-year-pages`

Download the HTML for the year event pages from wiki that contain a list of all notable births (1900-2018).

#### `npm run parse-year-pages`

Extract every person from the event pages to create a single csv of all notable births (1990-2018).

#### `npm run get-historical-rankings`

Download top 1000 wiki articles each day since 2016. Filter by if they are a person in our database, save as csv.

#### `npm run get-todays-rankings`

Download top 1000 wiki articles from today. Filter by if they are a person in our database, save as csv.
