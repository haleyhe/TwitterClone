# TwitterClone
This is the API my teammate and I wrote to replicate the basic features of Twitter for my cloud computing class. I primarily focused on managing the tweets portion of the API. 

Note: the email verification portion of the API is commented out to accommodate the grading script used for this project.

## API Specifications Overview
| Route                     | Method | Description                                                                              |   |
|---------------------------|--------|------------------------------------------------------------------------------------------|---|
| /adduser                  | POST   | Register new user account                                                                |   |
| /login                    | POST   | Log into account                                                                         |   |
| /logout                   | POST   | Log out of account                                                                       |   |
| /verify                   | POST   | Verifies new account                                                                     |   |
| /user/:username           | GET    | Get user profile information for a specified user                                        |   |
| /user/:username/followers | GET    | Gets list of users following a specified user                                            |   |
| /user/:username/following | GET    | Gets list of users who a specified user is following                                     |   |
| /follow                   | POST   | Follows or unfollow a user                                                               |   |
| /additem                  | POST   | Posts a new tweet                                                                        |   |
| /item/:id                 | DELETE | Deletes the tweet with a specific TweetID                                                |   |
| /item/:id                 | GET    | Get the contents of tweet with a specific TweetID                                        |   |
| /search                   | POST   | Gets a list of tweets that meets the criteria of the query paramters                     |   |
| /item/:id/like            | POST   | Like or unlike the tweet with a specific TweetID                                         |   |
| /addmedia                 | POST   | Adds a media file to a tweet. The media is removed if the associated tweet gets deleted. |   |
| /media/<id>               | GET    | Get media with the the MediaID                                                           |   

[Click here to see the full API specifications we had to meet](https://docs.google.com/document/d/1JkaI8mkk1A3_A8H9VJ7sYm_iJ3KaYRfAazHX5FdXnmY)
