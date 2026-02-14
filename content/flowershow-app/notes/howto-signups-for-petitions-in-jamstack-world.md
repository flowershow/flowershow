---
title: Research on how to do signups for petitions in JAMStack world
date: 2020-04-05
---

I want to ...

* Have people sign up to my mailing list
* Have people submit a form
* Have people sign up to a manifesto (like a form but also add to a mailing list and maybe "confirm" their signature)
* Pull in and display a list of things e.g. a list of signatories or a directory of endorsing organizations

# Endorse Process with a Form

### Form design

* we can have opt-in to show name
* we can capture org etc

## Analysis

The only option with 0 cost for up to 1k a month is send in blue ... *or* google form ...

### Criteria

* `>100` signups a month
  * Up to 1k+ a month (let's be optimistic 😉) for free if possible
* Extract list to spreadsheet quickly and/or API so that we can display e.g. "total endorsers"
* Cost
* Nice to have: email confirmation to provide verification and avoid spamming

### Options

Options

* Form + spreadsheet + some integration code to display totals and endorsers
* Mailing list
* Petition system

#### Pure Forms

* google form: (ugly)[^maybe-not]
* formspree: 50 submissions / month for free, $10/month (billed annually or $12 billed monthly) = 1K, $40/month = 5K
  * On free plan you can't export the submissions to a spreadsheet. On gold plan you can.
* typeform: ❌ 100 responses a month limit for free, €30/month = 1000 - https://help.typeform.com/hc/en-us/articles/360040197372-Response-limits

#### Hack on email subscription list (e.g. sendinblue)

* sendinblue: unlimited contacts. 300 emails a day on free plan ... plus customizable sign up forms

#### Petition systems e.g. on Wordpress

* https://civist.com - looks ok
  * allows for submission confirmation (via email)
  * allows for tracking counts of signatories
* http://wppetitions.com - so-so
* https://wordpress.org/plugins/speakout/ - looks a bit old (?)
* https://wings.dev - looks good but is propriety afaict

[^maybe-not]: https://blog.webjeda.com/google-form-customize/