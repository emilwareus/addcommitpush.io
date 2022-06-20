---
title: "Building a SaaS Business, Zero to One in Hindsight"
date: 2022-06-14T18:38:06+02:00
draft: true
tags: ["startup", "saas", "bussines"]
categories: ["startup"]

---


In September 2018 I joined Debricked as the very interesting combination of a Machine Learning Engineer and Sales with the perception that the SaaS-product was "done". We just needed to add some more ML-enabeled capabilities and off we go! We were wrong.. so so wrong.

About a year later I was recognized as a Co-Founder, and have continually thrown spaghetti \[and my head\] against the wall until this day. With a lot of detours, bad assumptions, hacky code, good code, talking to users, research, and sales we got recognized in the industry through the accusation 3 months ago. Today, we are scaling our SaaS-growth-loop, building great products, and scaling the team, and I'd like to share some lessons learned about building a SaaS-company.


## Knowing that the unknowns are unknown

As we started out we were naive to the challenge we tried to solve. We didn't do enough research on the space, the competitive landscape, substitutes, and the direction of the market. In some ways, that was fine. We started out doing a lot of things right for the wrong reasons, simply talking to potential customers and building products. Not because we knew that would be a good strategy, rather because none of us had ever really worked at a large enterprise. It turned out that the culture to "just build things" and listening to customers was a good fit for building a deep-tech SaaS offering.

![Just build it](/mw2.jpg)
<!-- TODO: Input reference -->


In the first few months of our journey, we realized that a lot of our assumptions we continuously made were wrong. It was not that we made illogical assumptions, but rather that it is very hard to predict what customers will love. Rather than keep making bad predictions, we embraced that we need to accurately figure out the unknowns by talking to customers.

Roughly we needed to know if an \[idea, feature, pivot, etc.\] was good by figuring out if:

0. Investors think it's a great idea (0.1%)
1. Internal or expert conviction (0.9%)
2. Research or competitors talks about this like it is important (4%)
3. Customers are indicating pain, and this \[idea, feature, pivot, etc.\] will relieve it (10%)
4. Customers are responding well to the pitch (15%)
5. Customers are talking to us about this feature before we pitch (20%)
5. Customers pay largely due to this feature (50%)

The percentage is indicating the weight of importance to each point of validation. This very approximate framework gave me some guidance in how to think about features and ideas in a way to always focus on the customer. Also, nothing is validated until someone is willing to pay for it.


## Capability to deliver vs. delivering

In the boxing match of **execution** vs. **process**, I'm deeply rooted in the execution corner. It is my belief that since we do not know what we don't know, it is not necessary to build processes around things they may as well be left in the dust. This doesn't mean that we shouldn't have sprint planning, demos, post mortems, etc. but rather that process usually takes a lot of time from the most productive single contributors in your company. It is important not to overload these people with meetings and syncs that is a waste of time in most cases.

Instead of implementing processes, hire people that thrive and feel passionate about solving problems for your customer. This does absolutely not only apply to your customer success personnel, but developers and tech-people as well! An established process for Quality Assurance (QA) should not be needed in your startup development team, since you have hired developers that focus on customer outcomes and rigorously write code until the customers problem is solved. If you get customer feedback that your newly developed API-endpoint times-out in production, the developer did not have the diligence to actually assure that \[she/he\] solved the customers problem when the issue was closed.   

Capability to deliver is not only about making time to deliver or hiring accountable people, but also creating the right environment for it.
> As a startup you are throwing spaghetti at lightning speed.

Therefore, you should strive to create a development environment where it is safe to miss from time to time. At Debricked, we created logical layers in our architecture where we tried to keep some of those layers off the critical path. This meant that those parts of our service that were not in the critical path, but rather had caching logic in critical-path layers, could tolerate higher change-failure rates, lower uptime, and therefore higher development speed.

In this triangle, you can see what I believe are the tradeoffs as a startup.

![Triangle of Development for startups](/triang.png)

If you've ever tried [Open Source Select](https://debricked.com/select/), you should know that it is just a large cache.. where all the actual logic is run in a microservice that acts as a backend to the backend, enabling that microservice to have 20% downtime and no one would notice.. That enables iteration on that service to be incredibly fast!

So, my point is that delivering and capability to deliver is tightly coupled, and corporate processes that are masked as capability may just slow you down. If you have the urge to remove a process, it is probably the right call to make.

## Measure, Talk, Build, Repeat

- Measure with https://mixpanel.com/ and https://segment.com/
- Monitor usage of specific features
- Talk to customers that use those
- Build things that customers want

- Also, talk to customers about the future.. Where are you going?  


## When to build with conviction


- Build measure learning is great for incremental innovation. What if your innovation is not incremental?
- Try to make it incremental
- Find champions that have important problems to be solved
- Talk to many candidate champions to get their opinion and digest market openings (We talked to a lot of OSPOs)
- Know that you are building with conviction

## Focusing was painful

- We didn't focus in the beginning
- We learned to focus
- It creates alignment in your team
- Decisions becomes easy to make for the front-line warriors
- Scope-creep becomes less of an issue
- It is hard, because focus can mean missed opportunity (opportunity cost)

## Deliver value before you capture it

- Guiding principle, but hard to get working
- Don't be afraid to charge
