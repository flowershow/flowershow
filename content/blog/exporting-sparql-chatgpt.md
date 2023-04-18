---
title: "Exporting Wikidata with SPARQL and ChatGPT"
date: 2023-04-18
authors: ['davidgasquez']
---

I've never enjoyed SPARQL syntax and found it confussing coming from SQL. That has made me not use or explore [Wikidata Query Service](https://query.wikidata.org/) as much as I wanted.

This, however, seems to have changed after being able to use ChatGPT to generate the queries for me. Or at least to guide me through the process. It's an amazing way to explore Wikidata without having to learn SPARQL syntax!

I wanted to get some data about asteroids and I was able to do it with the following query... to ChatGPT! Definitely not as [accurate or detailed as an official source could be](https://ssd.jpl.nasa.gov/tools/sbdb_query.html#!#results), but useful to quickly check some facts.

![screnshoot](https://user-images.githubusercontent.com/1682202/232730339-e608451a-1f44-4ca1-ad6a-00d0bf599103.png)

After some small tweaks, I got [to the following query](https://w.wiki/6bdo):

```sparql
SELECT
    ?asteroidLabel
    ?discovered
    ?discovererLabel
WHERE {
    ?asteroid   wdt:P31 wd:Q3863;  # Retrieve instances of "asteroid"
                wdt:P61 ?discoverer; # Retrieve discoverer of the asteroid
                wdt:P575 ?discovered; # Retrieve discovered date of the asteroid
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?discovered)
```

The most interesting thing is that while crafting the query, I was able to learn different things that I haven't even noticed in the past as I was mostly copy pasting queries form the examples.

For example, I didn't know that you can use `SERVICE wikibase:label` to get the labels of the entities.

This opens a whole new realm of easy to access data and I'm looking forward to exploring more datasets!
