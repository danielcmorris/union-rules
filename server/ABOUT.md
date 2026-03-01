# How the Union Rules Application Works
The overall function of the system it to analyze timesheet calculations to see if they are correct and also help users understand the results.

## How does it know?
On the Docs page, we can upload multiple documents about the union contract and how the rules regarding payment have been negotiated.  
These documents are then loaded to a remote directory and analyzed by a google Service called "Vertex AI".

### Why not just post it to ChatGPT?
Generally, an AI search like that is just looking for generic information on the internet.  We can't do that, as union rules are specific
to the current contract.  The alternative is to include the contract with the request to an AI engine, yet there are limits as to 
how much information you can send.  So we need to just send relevant information.  Do do this, we use a 3 step process.

### Publish a library
A normal library is a giant building full of books.  It is cross referenced carefully with card catalogs so someone who knows what they are doing can go 
and retrieve the exact information they need.  For us, we have a bunch of reference documents related to the contracts being held in a google storage bucket.

### Vertex AI - our Library Expert
Just as we might send a researcher to the library to get information on a specific thing, we can tell Google's VertexAI system to search only a our library and find results within
that directory alone.  So, if you have 100 pages of contracts, but only 3 documents actually contain information about missed meals, then
vertex AI will find those documents.

### Gemini
Gemini is Google's AI tool that actually thinks.  Our researcher comes back with the relevant books related to our question and studies them, then, using
just the information we have provided in our library, formulates a reponse.

## Accuracy
ChatGPT an other public AI engines use the entire internet and billions of documents.  Many outdated and irrelevant.  So, even if the current information 
were actually in there, it would be like sending a researcher to every public library on the planet looking for the latest union rules.  It's much better
to start with a tiny library of accurate and confirmed information.  With an AI, there is no 100% guarentee and we should not assume there are not
edge circumstances where it makes a mistake.  However, we must also understand that developers and foreman and supervisors are also fallable and make
mistakes.  Together, however, our level of understanding is greatly enhanced.
