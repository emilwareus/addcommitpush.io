---
title: "Building a SaaS Business, Zero to One in Hindsight"
date: 2022-12-27T00:00:00+02:00
draft: false
tags: ["startup", "saas", "business"]
categories: ["startup"]
cover:
  image: "images/emil_2_opt.jpeg"
  alt: "Thinking of my past startup experiences"
  caption: "Me reflecting on my mistakes"
  relative: false
---


In September 2018 I joined Debricked as the very interesting combination of a Machine Learning Engineer and Sales with the perception that the SaaS product was "done" and ready to take on the world. We just needed to add some more ML-enabled capabilities and off we go! We were wrong.. so so wrong.

About a year later I was recognized as a Co-Founder, and have continually thrown spaghetti \[and my head\] against the wall to see what sticks with customers. With a lot of detours, bad assumptions, hacky code, good code, talking to users, research, and sales we got recognized in the industry by being acquired a few months ago. Today, we are scaling our SaaS growth loop, building great products, and scaling the team, and I'd like to share some lessons learned about building a SaaS company.

I'll try to reason about: 
- Knowing that the unknowns are unknown
- Capability to deliver vs. delivering
- Measure, Talk, Build, Repeat
- Building with conviction
- Focusing was painful


## Knowing that the unknowns are unknown

As we started out we were naive to the challenge we tried to solve. We didn't do enough research on the space, the competitive landscape, substitutes, and the direction of the market. In some ways, that was fine. We started out doing a lot of things right for the wrong reasons, simply talking to potential customers and building products. Not because we knew that would be a good strategy, but rather because none of us had ever really worked at a large enterprise or in this market. It turned out that the culture to "just build things" and listening to customers was a good fit for building a deep-tech SaaS offering.

![Just build it](/mw2.jpg)
*Meme stolen from this [Y Combinator video](https://www.youtube.com/watch?v=IYLVhk7yaaw)*

In the first few months of our journey, we realized that a lot of the assumptions we continuously made were wrong. It was not that we made illogical assumptions, but rather that it is very hard to predict what customers will love. Rather than keep making bad predictions, we embraced that we need to accurately figure out the unknowns by talking to customers.

Roughly we needed to know if an \[idea, feature, pivot, etc.\] was good by figuring out if:

0. Investors think it's a great idea (0.1%)
1. Internal or expert conviction (0.9%)
2. Research or competitors talks about this like it is important (4%)
3. Customers are indicating pain, and this \[idea, feature, pivot, etc.\] will relieve it (10%)
4. Customers are responding well to the pitch (15%)
5. Customers are talking to us about this feature before we pitch (20%)
5. Customers pay largely due to this feature (50%)

The percentage is indicating the weight of importance of each point of validation. This very approximate framework gave me some guidance on how to think about features and ideas in a way to always focuses on the customer. Also, nothing is validated until many different customers are *actually* paying for it.


## Capability to deliver vs. delivering

In the boxing match of **execution** vs. **process**, I'm deeply rooted in the execution corner. I believe that since we do not know what we don't know, it is not necessary to build processes around things that may as well be left in the dust. This doesn't mean that we shouldn't have sprint planning, demos, post mortems, etc. but rather that process usually takes a lot of time from the most productive individual contributors in your company. It is important not to overload these people with meetings and syncs which is a waste of time in most cases.

Instead of implementing processes, hire people that thrive and feel passionate about solving problems for your customer. This does *absolutely* not only apply to your customer success-/sales-people but to developers and tech people as well! An established process for Quality Assurance (QA) should not be needed in your startup development team, since you have hired developers that focus on customer outcomes and rigorously write code until the customer's problem is solved. If you get customer feedback that your newly developed API endpoint times out in production, the developer did not have the diligence to actually assure that \[she/he\] solved the customer's problem when the issue was closed.   

Capability to deliver is not only about making time to deliver or hiring accountable people, but also creating the right environment for it.

> As a startup you are throwing spaghetti at lightning speed.

Therefore, you should strive to create a development environment where it is safe to miss from time to time. At Debricked, we created logical layers in our architecture where we tried to keep some of those layers off the critical path. This meant that those parts of our service that were not in the critical path but rather had to cache logic in critical-path layers could tolerate higher change-failure rates, lower uptime, and therefore higher development speed.

In this triangle, you can see what I believe are the tradeoffs of a startup.

![Triangle of Development for startups](/triang.png)

If you've ever tried [Open Source Select](https://debricked.com/select/), you should know that it is just a large cache.. where all the actual logic is run in a microservice that acts as a backend to the backend, enabling that microservice to have 20% downtime and no one would notice... That enables iteration on that service to be incredibly fast!

So, my point is that delivering and the capability to deliver are tightly coupled, and corporate processes that are masked as capability may just slow you down. If you have the urge to remove a process, it is probably the right call to make.

## Measure, Talk, Build, Repeat
In the beginning, we did not do this right. We built the product with conviction and listened to very few potential customers with low willingness to pay and very specific needs. Today, we have a healthier approach where we measure with [Mixpanel](https://mixpanel.com/), pipe data through [Segment](https://segment.com/), and store data in GCP BigQuery. These data platforms really enabled deeper customer knowledge, roadmap prioritization, and the ability to be data-driven, and became rooted in our culture, this was night and day in how we operate at the core. 

>Beeing datadriven is a culture, and it's fun when people are on board! 

To make data a part of our culture, we implemented a few things: 

1. Tracking (sending events to Segment) is part of the acceptance criteria for any new feature. 
2. We have a dedicated person whose only responsibility is customer analytics. The person is a developer who continuously improves the tracking data and adds tracking to old features. This is especially important to be able to communicate, the person will be working cross-departmentally to make everyone happy with the data quality. 
3. For every major "event" (Signup, specific feature usage, upgrade, churn, ..) we have a separate slack channel with a slack-bot, posting out EVERY event of that type. Ideally, this slack-bot also indicates if that was pleasant for the customer to use that feature or not. 
4. We created dashboards indicating the success of each feature, and pin those in the respective slack channel.
5. We try to connect our company/team goals to things that are measurable in these tools. This is still hard as a B2B SaaS with just a few active users within a large company. 
6. Leaders in the company are to encourage employees with these data points... "It seemed like the feature you developed is getting used, well done!"


Dashboards are great, but it only surfaces the problems and doesn't tell you what the solutions are. To find solutions, one has to talk to customers! This is something that we are still struggling with, as it's hard to ask for (and get) time from someone that had a bad experience with your tool. What we try to do is to identify either our "super users" that continuously use our tool and seem to like it, or to talk to customers that used a specific feature we want to research more about. There are many other resources on how to talk to users, such as this [Y Combinator](https://www.ycombinator.com/library/6g-how-to-talk-to-users) post. I'll update this blog post when I have more to give in this area! :) 

<!-- TODO: Add more on talking to users -->

## Building with conviction
Building measure learning is great for incremental innovation. What if your innovation is not incremental? Maybe you are building something that is more binary, either it's there or it's not and it takes a significant amount of time to build. There may be some situations where you need to build with conviction, and we felt that a few times as well. 

To start with, when I look in hindsight at all our "conviction plays" there are multiple ways we could have made it way more incremental and data-driven. Just because you are building something innovative that __needs to be large__ there is no need to not be data-driven. Also, chances are that if you try to break it down into increments in front of a whiteboard with some smart people, you can. Try to do that first...  

If that's not possible, you should talk to potential customers. Who is feeling the pain you would like to solve? Is it important to them? Is it big, small, frequent or infrequent? What are the substitutes? When we built Open Source Select, there was a fair bit of conviction involved that this was the right way ahead. Our approach to reducing the uncertainty and more closely connecting our ideas to actual customer problems was to start talking to a lot of people. Mainly, we focused on developers and Open Source Program Office (OSPO) leads and tried to discover their "war stories" on the cost of choosing the wrong open-source project. It became clear that these two users had vastly different agendas, needs, and priorities, but both wanted to avoid the pitfalls of technical debt and security issues of unmaintained open source. These realizations became great input to our product teams! My point is, that building with conviction can usually be replaced with user research and incremental innovation. 

If time-to-market is not critical with a particular conviction play (start to develop it within ~6 months), we leveraged master thesis students. This has been very successful for us, as we got to research a lot of different potential ways ahead, without committing critical people to it. Some of these projects became nothing, and some are core to our product today. It was also a great recruitment funnel, as you had months to convince them to work with you (and months to see if they are up-to-par). 


## Focusing was painful

When we started out in 2018/19, we thought we could do everything. Time and time again this put us in a situation where we felt like we were pushing the Great Wall of China 0.01 centimeters a day. With the hindsight hat on, we should have focused more on niche segments and feature sets in our tool. We pursued too many **dimensions** in our product. The dimensions we tried to develop for simultaneously were:
Platform & Build systems GitHub, GitLab, Bitbucket, Azure DevOps, Jenkins, Circleci]. This was easy to scale for some features but time-consuming for others. 
- Language [JavaScript, Java, Kotlin, Go, C#, PHP, Python, Objective-C, Swift, Rust, Ruby, Linux]. A very significant amount of work for each language. 
- Use cases [Security, License & Compliance, Quality of OSS, Selection of OSS]. MAJOR investments were needed in each one to make it good or great. 
- Feature sets [remediation, prevention, deep analysis, guidance, enterprise user management, and much more...] 
- Customer segments [SMB, Enterprise, Self-serve/PLG]

We really only learned to focus as a company after the acquisition, choosing only one or very few parts in each dimension. If I got to re-live the beginning of our endeavor, I would have pruned these dimensions A LOT from the start. 

Today, we leverage OKR's [Objectives & Key Results](https://en.wikipedia.org/wiki/OKR). It helps us propagate company goals throughout the organization and align everyone to the same underlying objectives. Clear focus and objectives also helped to align and lead the company. It became clear to me when I went on vacation this summer. I did not need to keep a perfect backlog prioritized, as my team members just evaluated each task themselves towards our goal and picked what I would have picked 9 times out of 10. 


## I feel like Emil 2.0 ... 
... as I'm finishing up this blog post. If you got this far in my post, I'm inclined to believe that you want to start your own company someday... do it! To me, it was the most thrilling experience in my professional life so far and I truly feel like I just leveled up. It also feels like I'm level 2 out of 100, I wonder what the next thing could be ;) 