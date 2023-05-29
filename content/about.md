---
title: "About Me"
---


Hi! 


I'm Emil Wåreus, a business savy data-nerd that spends way too much time in front of a screen. During business hours I work as the head of R&D/Data Science at [Debricked](https://www.debricked.com), the startup I founded in 2018 and sold to [Micro Focus](https://www.microfocus.com) in 2022. There I lead a team of ~6 researchers in creating application security solutions to analyze open source, mostly with ML, graph algorithms, and static analysis. I also enjoy writing spaghetti code while drinking wine. 


## External blogposts 

### [Predicting the rise and fall of an open source project](https://www.linkedin.com/pulse/predicting-rise-fall-open-source-project-debricked/?trackingId=f7Gpg43aQbi33TYhprtNqg%3D%3D){:target="_blank"}
A study of papers and some of my own research on why some open source projects becomes unmaintained. You can view the talk [here](https://www.youtube.com/watch?v=u9jU4xJ03ek).

### [How Neo4j’s Graph database can remediate vulnerabilities](https://www.linkedin.com/pulse/how-neo4js-graph-database-can-remediate-vulnerabilities-debricked/){:target="_blank"}
How we used the Neo4j Graph database to understand how all open source uses all other open source. We then write our own graph algorithms to triverse this graph for find dependency trees safe from vulnerabilties. 

### [Last Years Open Source - Tomorrow's Vulnerabilities](https://thehackernews.com/2022/11/last-years-open-source-tomorrows.html)
Some data and insights around how long it takes to discover vulnerable code in open-source projects. 

## Papers

### [Automated CPE Labeling of CVE Summaries with Machine Learning](https://link.springer.com/chapter/10.1007/978-3-030-52683-2_1)
Open Source Security and Dependency Vulnerability Management (DVM) has become a more vital part of the software security stack in recent years as modern software tend to be more dependent on open source libraries. The largest open source of vulnerabilities is the National Vulnerability Database (NVD), which supplies developers with machine-readable vulnerabilities. However, sometimes Common Vulnerabilities and Exposures (CVE) have not been labeled with a Common Platform Enumeration (CPE) -version, -product and -vendor. This makes it very hard to automatically discover these vulnerabilities from import statements in dependency files. We, therefore, propose an automatic process of matching CVE summaries with CPEs through the machine learning task called Named Entity Recognition (NER). Our proposed model achieves an F-measure of 0.86 with a precision of 0.857 and a recall of 0.865, outperforming previous research for automated CPE-labeling of CVEs.

### [Security Issue Classification for Vulnerability Management with Semi-supervised Learning](https://www.scitepress.org/Link.aspx?doi=10.5220/0010813000003120)
Open-Source Software (OSS) is increasingly common in industry software and enables developers to build better applications, at a higher pace, and with better security. These advantages also come with the cost of including vulnerabilities through these third-party libraries. The largest publicly available database of easily machine-readable vulnerabilities is the National Vulnerability Database (NVD). However, reporting to this database is a human-dependent process, and it fails to provide an acceptable coverage of all open source vulnerabilities. We propose the use of semi-supervised machine learning to classify issues as security-related to provide additional vulnerabilities in an automated pipeline. Our models, based on a Hierarchical Attention Network (HAN), outperform previously proposed models on our manually labelled test dataset, with an F1 score of 71%. Based on the results and the vast number of GitHub issues, our model potentially identifies about 191 036 security-related issues with prediction power over 80%. 

This paper was nominated for best paper for the conference, but lost to other fantastic research :) 

## Publications where I supervised the authors 

#### [Detecting Security Patches in Java Projects Using NLP Technology](https://re.public.polimi.it/handle/11311/1223328)
#### [Automating vulnerability remediation in Maven](https://www.lunduniversity.lu.se/lup/publication/9067251)
#### [Exploring Subjectivity in ad hoc Assessment of Open Source Software](https://www.lunduniversity.lu.se/lup/publication/9075536)
#### [Security Issue Classification for Vulnerability Management with Semi-supervised Learning](https://www.lunduniversity.lu.se/lup/publication/93a45265-e5cb-4d38-a440-dcd41a07552a)
#### [Vulnerability detection using ensemble learning](https://www.lunduniversity.lu.se/lup/publication/9043573)
#### [Exploring the Business Value and User Experience of Open Source Health](https://www.lunduniversity.lu.se/lup/publication/9066782)


## Confernce Presentations
<!-- TODO: Link and descriptions of conference presentations here. -->

### The Cry Wolf Vulnerability Paradox: The Problem of FALSE Alerts in Vulnerability Scanners

I gave this talk at [ØreDev 2022](https://oredev.org/sessions/the-cry-wolf-vulnerability-paradox-the-problem-of-false-alerts-in-vulnerability-scanners) [(video)](https://www.youtube.com/watch?v=FvOoLU4Oy9I) and [The Linux Foundation - Open Source Summit NA 2022](https://events.linuxfoundation.org/archive/2022/open-source-summit-north-america/program/schedule/)

Key takeaways:

- How security alert fatigue affects companies and organizations today
- How open source security is affected
- How to reason around false security alters in open source security
- Guidance on what questions to ask as a company when evaluating security solutions 

“VULNERABILITY!” Cries the CI-pipeline for the 124th time this week. How fast do developers learn to ignore this notification? Security alerts are constantly increasing, but how many are actually warnings about real threats? If we don’t respond to them, are they really making us more secure? We’ve all heard the story of the boy who cried wolf, and we know that the worst possible scenario for a tool is to become that boy - a never ending stream of alerts that no one cares about. Why is this such a complex issue in open source security, and what are some innovative ways to solve it? How do we make sure that we only alert you when the wolf is really there? In this talk, we look closely at the different levels of true positives and dive deep into the cry wolf paradox in the world of open source security.


### [Using Graph Database Technology to Resolve Transitive Vulnerabilities at Scale - GOTO Copenhagen 2022](https://gotocph.com/2022/sessions/2203/using-graph-database-technology-to-resolve-transitive-vulnerabilities-at-scale)

Fixing vulnerabilities in your open source dependencies may seem easy enough at a glance, just update right? Wait! The vulnerability was introduced from an indirect dependency, how can I update that? Updating transitive dependencies can be a tricky challenge, as you don’t want to break your dependency tree and still find a suitable update that doesn’t bring about too many breaking changes. It turns out that this is a stellar challenge for Neo4j and its Graph Database and Alogrithms.

In this talk, the speaker will go into detail about how a full graph of all open source interdependence was created, and how it can be used to accurately resolve vulnerabilities in the complex tree-structures that is the reality of modern software development. No more dependency confusion!


### [Predicting the rise and fall of Open Source - Foo Café Malmö 2022](https://foocafe.org/event/predicting-rise-and-fall-open-source-project)

[Video](https://www.youtube.com/watch?v=u9jU4xJ03ek)

Open source software and its rich and vast ecosystem is one of the largest enablers of modern digitalization, but is all open source equal? In this talk, we explore the rise and fall of open source projects by looking at community health from a quantitative perspective. Join us for a deep dive into the world of data to explore early indicators that may help us predict the success, or failure, of an open source project. Is it possible to determine whether or not a project will be successful, i.e, a good choice? 

### [Semantic Code Discovery - AI-powered code recommendations (Part of State of AI series) - Foo Café Malmö 2022](https://www.foocafe.org/event/state-ai)

[Video](https://youtu.be/swZAIirxdik?t=1881)

One of the greatest benefits of open source is that developers doesn’t have to reinvent the wheel for every piece of software they need. But how can developers find the right wheel to use, is reading a 6 year old forum thread really the best way? Code and functionality search is a challenging topic with a ton of new research in recent years. In this talk, Emil will give an introduction to semantic code search and how to find code using words.

### Various other presentations and educations

* Zero to One AI education for managers, various occations.
* Tech-talks for specific companies in the intersection of AI, Open Source, and Security. 
* Hackathons and Machin Learning events.


## Patents 

WIP
<!-- TODO: Link and descriptions of patents here. -->

## Selected Podcast visits

#### [The future of security scanning with Debricked](https://opensourcesecurity.io/2021/04/11/episode-266-the-future-of-security-scanning-with-debricked/)
#### [Managing Portfolios of OSS Projects with Emil Wåreus](https://podcast.chaoss.community/33)
#### [Open source vulnerability - Emil Wåreus from Debricked (swe)](https://ittalks.libsyn.com/102-open-source-vulnerability-emil-wreus-from-debricked-swe)
#### [How to select the best open source project, with Emil Wåreus from Debricked (swe)](https://ittalks.libsyn.com/101-how-to-select-the-best-open-source-project-with-emil-wreus-from-debricked-swe)
#### [Cybersäkerhet och maskininlärning med Emil Wåreus från Debricked](https://open.spotify.com/episode/1huwuWIEYpfsW2aUKulZDE)

## Interesting OSS-projects 
<!-- TODO: Add projects I endourse/maintain/contribute to. -->

#### [I Hate Group Chats](https://github.com/emilwareus/i-hate-group-chats)
Very early stage open source project to automate myselfe away from group chats with NLP.. Or did the NLP write this blog? 

## Research Projects

### AI and Risk-based Vulnerability Management for Trustworthy Open Source Adoption, [ARVOS](https://github.com/arvos-dev)
A project for runtime vulnerability detectiong, where the project is using eBPF to track vulnerable code execution in open source projects. This is a projected backed by [Vinnova](https://www.vinnova.se/en/p/ai--and-risk-based-vulnerability-management-for-trustworthy-open-source-adoption-arvos/) and is executed together with  [Debricked](https://www.debricked.com) and [Elastisys](https://elastisys.com/).


### Health and Security Management in Open Source Software [HASMOSS](https://www.ri.se/en/what-we-do/projects/health-and-security-management-in-open-source-software)

Open Source Software (OSS) provides an important tool in the digitalization of the Swedish industry. A big challenge, however, is the risk of vulnerabilities being introduced. Through HASMOSS, we aim to enable the Swedish industry to analyze and manage this risk, and thereby create conditions for sustainable consumption and collaboration on OSS.
This is a research project together with [RISE](https://www.ri.se/en), [Debricked](https://www.debricked.com), [Scania](https://www.scania.com/), and [Addalot](https://addalot.se/).
