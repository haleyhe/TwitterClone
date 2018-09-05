	var express = require('express');
	var bodyParser = require('body-parser');
	var async = require('async');
	var cassandra = require('cassandra-driver');
	var distance = cassandra.types.distance;
	const uuidV1 = require('uuid/v1');
	var cookieParser = require('cookie-parser');
	var mailer = require("nodemailer");
	//var mysql = require("mysql");
	var MongoClient = require('mongodb').MongoClient;
	var MongoClient1 = require('mongodb').MongoClient;
	var ObjectId = require('mongodb').ObjectID;
	var multer = require('multer');

	require( "console-stamp" )( console, { pattern : "dd/mm/yyyy HH:MM:ss.l" } );



	var Memcached = require('memcached');
	//Memcached.config.poolSize = 1024;
	var memcached = new Memcached('192.168.1.90:11211',{poolSize:1024});
	memcached.connect('192.168.1.90:11211', function (err, conn) {
		if (err) {process.exit(1);}
		else {console.log("Successfully connected to Memcache";}
	});

	//Set up:q server
	var app = express();
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({
		extended:true
	}));
	app.use(cookieParser());
	app.use(express.static('ui'));
	require('events').EventEmitter.prototype._maxListeners = 1500;
	var storage = multer.memoryStorage();
	var upload = multer({storage: storage});

	// Initialize connection once
	MongoClient.connect("mongodb://127.0.0.1:27017/twitter",
			{poolSize:1024} ,
			function(err, database) {
		if(err) {
			console.log("Cannnot connect to Mongo-Twitter")
		} else {
			console.log("Successfully connected to Mongo-Twitter");
			db = database;
			//console.log("Mongo poolsize is " + db.port);
			//app.listen(8080);
		}
	});

	MongoClient1.connect("mongodb://127.0.0.1:27017/users",
		{poolSize:1024} ,
		function(err, database) {
	    if(err) {
		console.log("Cannnot connect to Mongo-Users")
	    } else {
		console.log("Successfully connected to Mongo-Users");
		db1 = database;
		//console.log("Mongo poolsize is " + db1.port);
		app.listen(8080);
	    }
	});

	//Connect to Cassandra
	var client = new cassandra.Client({contactPoints: ['192.168.1.113', '192.168.1.141', '192.168.1.142'],
		pooling: {coreConnectionsPerHost: {[distance.local] : 1024, [distance.remote] : 1024}},
		keyspace: 'medias'});

	//Routing functions now
	app.get('/', function(req, res) {
		//res.send('Hello World\n');
		//console.log("Index: " + req.cookies.twitter_clone_cookie);
		if (req.cookies.twitter_clone_cookie == undefined) {
			res.sendFile('/home/ubuntu/twitter/ui/start.html');
		}
		else {
			res.redirect('/home');
		}
	});


	app.get('/test', function(req, res) {
		res.sendFile('/home/ubuntu/twitter/ui/home.html');
	});

	app.get('/home', function(req, res) {
		//console.log("Home: " + req.cookies.twitter_clone_cookie);
		if (req.cookies.twitter_clone_cookie == undefined) {
			res.redirect('/');
		}
		else {
			res.sendFile('/home/ubuntu/twitter/ui/home.html');
		}
	});

	app.post('/adduser', function(req, res) {
	    var key = uuidV1();
	    var likes = [];
	    db1.collection("accounts").insertOne( {
		"_id" : new ObjectId(),
		"username" : req.body.username,
		"password" : req.body.password,
		"email" : req.body.email,
		"verified" : false,
		"auth_key" : key,
		"likes" : likes
	    }, function(err, docs) {
		    if(err) {
			console.log("\tMongoDB: unable to register " + req.body.username + " at " + req.body.email);
			res.send(JSON.stringify({"status" : "error", "error" : "Failed to register user " + req.body.username + " at " + req.body.email}));
		}
		else {
		    //Send the email with verification key
		    //Set up email server
		   /* var smtpTransport = mailer.createTransport({
			    service: "Gmail",
			    auth: {
				    user: "130.245.168.142.eliza@gmail.com",
				    pass: "130.245.168.142"
			    `;}
		    });
		    var receiver = "" + req.body.email;
		    var mail = {
			    from: "Twitter Clone",
			    to: receiver,
			    subject: "Verification Key",
			    text: "" + key
		    }
		    smtpTransport.sendMail(mail, function(error, response){
			    smtpTransport.close();
			    if(error){
				    console.log("Could not send email to " + receiver);
				    console.log(error);
			    }
			    else{
				    console.log("Message sent");
			    }
		    });*/
		    //console.log("\tMongoDB: registered " + req.body.username + " at " + req.body.email);
		    res.send(JSON.stringify({"status" : "OK"}));
		}
	    });
	});

	app.post('/login', function(req, res) {
	    db1.collection("accounts").findOne( {"username" : req.body.username, "password" : req.body.password, "verified" : true}, {fields:{"username":1}},function(err, docs, count) {
		if(err) {
		      console.log(err);
		      res.send(JSON.stringify({"status" : "error", "error" : "Error occurred logging in " + req.body.username}));
		} else {
		    if (docs) {
			//console.log("Logged in: " + req.body.username);
			res.cookie('twitter_clone_cookie', req.body.username, {expires: new Date(Date.now() + 60 * 60000)});
			res.send(JSON.stringify({"status" : "OK"}));
		    } else {
			console.log("Unable to log in " + req.body.username);
			res.send(JSON.stringify({"status" : "error", "error" : "Cannot find user " + req.body.username}));
		    }
		}
	    });
	});

	app.post('/logout', function(req, res) {
	    //console.log(req.cookies.twitter_clone_cookie);
	    if (req.cookies.twitter_clone_cookie == undefined) {
		    //console.log("Unable to log out. You are not logged in.");
		    res.send(JSON.stringify({"status" : "error", "error" : "You are not logged in"}));
	    }
	    else {
		    //console.log("Logged out successfully.");
		    res.clearCookie('twitter_clone_cookie');
		    res.send(JSON.stringify({"status" : "OK"}));
		    //res.send(JSON.stringify({"status" : "OK"}));
	    }
	});

	app.post('/verify', function(req, res) {
	    if (req.body.key == "abracadabra") {
		db1.collection("accounts").updateOne( {
		    "email" : req.body.email
		},
		{
		    $set: {"verified" : true}
		}, function(err, docs) {
		    if(err) {
			//console.log("\tMongoDB: unable to verify " + req.body.email);
			res.send(JSON.stringify({"status" : "error", "error" : "Failed to verify " + req.body.email}));
		    }
		    else {
			//console.log("\tMongoDB: verified " + req.body.email);
			res.send(JSON.stringify({"status" : "OK"}));
		    }
		});
	    }
	    else {
		db1.collection("accounts").updateOne( {
			"email" : req.body.email,
			"auth_key" : req.body.key
		    },
		    {
			$set: {"verified" : true}
		    }, function(err, docs) {
			if(err) {
			    //console.log("\tMongoDB: unable to verify " + req.body.email);
			    res.send(JSON.stringify({"status" : "error", "error" : "Failed to verify " + req.body.email}));
		    }
		    else {
			//console.log("\tMongoDB: verified " + req.body.email);
			res.send(JSON.stringify({"status" : "OK"}));
		    }
		});
	    }
	});

	app.get('/verify', function(req, res) {
		if (req.query.key == "abracadabra") {
		db1.collection("accounts").updateOne( {
		    "email" : req.query.email
		},
		{
		    $set: {"verified" : true}
		}, function(err, docs) {
		    if(err) {
			console.log("\tMongoDB: unable to verify " + req.query.email);
			res.send(JSON.stringify({"status" : "error", "error" : "Failed to verify " + req.query.email}));
		    }
		    else {
			//console.log("\tMongoDB: verified " + req.query.email);
			res.send(JSON.stringify({"status" : "OK"}));
		    }
		});
	    }
	    else {
		db1.collection("accounts").updateOne( {
			"email" : req.query.email,
			"auth_key" : req.query.key
		    },
		    {
			$set: {"verified" : true}
		    }, function(err, docs) {
			if(err) {
			    console.log("\tMongoDB: unable to verify " + req.query.email);
			    res.send(JSON.stringify({"status" : "error", "error" : "Failed to verify " + req.query.email}));
		    }
		    else {
			//console.log("\tMongoDB: verified " + req.query.email);
			res.send(JSON.stringify({"status" : "OK"}));
		    }
		});
	    }
	});

	app.get('/user/:username', function(req, res) {
		//console.log("/user/:" + req.params.username + " is called.");
	    var followers = 0;
	    var following = 0;
	    var info = {};

	    username = "" + req.params.username;

	    async.series([
		function(callback) {
		    //console.log("Retrieving email for " + req.params.username + " in /user/" + req.params.username);
		    //email
		    db1.collection("accounts").findOne( {"username" : req.params.username}, {fields:{"email":1}},function(err, docs, count) {
			if(err) {
			      console.log(err);
			      return callback(new Error(err));
			} else {
			    if (docs) {
				info["email"] = docs.email;
				callback();
			    } else {
				return callback(new Error("Cannot find user " + req.params.username));
			    }
			}
		    });
		},
		function(callback) {
		    //console.log("Retrieving following for " + req.params.username + " in /user/" + req.params.username);
		    //followings
		    db.collection("following").find({"user" : username})
			.each(function(err, item) {
			    if (err) {
				console.log("Error retrieving followings: " + err);
				return callback(new Error(err));
			    }
			    if (item == null) {
				//console.log("Found " + following + " followings for " + req.params.username);
				info["following"] = following;
				callback();
			    } else {
				//console.log("\t" + item.isFollowing + " for " + req.params.username);
				following++;
			    }
		    });
		},
		function(callback) {
		    var username = "" + req.params.username;
		    //console.log("Retrieving followers for " + req.params.username + " in /user/" + req.params.username);
		    //followers
		    db.collection("following").find({"isFollowing" : username})
			.each(function(err, item) {
			    if (err) {
				console.log("Error retrieving follwers: " + err);
				return callback(new Error(err));
			    }
			    if (item == null) {
				//console.log("Found " + following + " followings for " + req.params.username);
				info["followers"] = followers;
				callback();
			    } else {
				//console.log("\t" + item.user + " for " + req.params.username);
				followers++;
			    }
		    });
		}], function (err) {
		    if (err) {
			//console.log();
			res.send(JSON.stringify({"status" : "error", "error" : err.message}));
		    }
		    else {
			//console.log("Finished /user/:" + req.params.username);
			//console.log();
			res.send(JSON.stringify({"status" : "OK", "user" : info}));
		    }
		});
	});

	app.get('/user/:username/followers', function (req, res) {
		var limit = req.query.limit;
		if (limit == undefined) {
			limit = 50;
		}
		if (limit > 200) {
			limit = 200;
		}
		if (limit < 0) {
			limit = 0;
		}
		//console.log("/user/:" + req.params.username + "/followers is called.");
	    var followers = [];
	    var username = "" + req.params.username;
	    //console.log("Retrieved followers for " + req.params.username);
	    db.collection("following").find({"isFollowing" : username}).limit(limit)
		.each(function(err, item) {
		    if (err) {
			console.log("Error retrieving followers: " + err);
			res.send(JSON.stringify({"status" : "error", "error" : err}));
		    }
		    if (item == null) {
			//console.log();
			res.send(JSON.stringify({"status" : "OK", "users" : followers}));
		    } else {
			followers.push(item.user);
			//console.log("\t" + item.user);
		    }
	    });

	});

	app.get('/user/:username/following', function (req, res) {
		var limit = req.query.limit;
		if (limit == undefined) {
			limit = 50;
		}
		if (limit > 200) {
			limit = 200;
		}
		if (limit < 0) {
			limit = 0;
		}
		//console.log("/user/:" + req.params.username + "/following is called.");
		var followings = [];
		var username = "" + req.params.username;
		//console.log("Retrieved followings for " + req.params.username);
		db.collection("following").find({"user" : username}).limit(limit)
		    .each(function(err, item) {
			if (err) {
			    console.log("Error retrieving followings: " + err);
			    res.send(JSON.stringify({"status" : "error", "error" : err}));
			}
			if (item == null) {
			    //console.log();
			    res.send(JSON.stringify({"status" : "OK", "users" : followings}));
			} else {
			    followings.push(item.isFollowing);
			    //console.log("\t" + item.isFollowing);
			}
		});
	});

	app.post('/follow', function (req, res) {
		var username = req.cookies.twitter_clone_cookie;
		//console.log("/follow API has been called for " + username);
		//console.log(req.cookies.twitter_clone_cookie);
		if (username == undefined) {
			console.log("Unable to access /follow due to not logged in");
			res.send(JSON.stringify({"status" : "error", "error" : "You are not logged in"}));
		}
		else {
			if (req.body.follow || req.body.follow == undefined) {
				db.collection("following").insertOne( {
			    "_id" : new ObjectId(),
			    "user" : username,
			    "isFollowing" : req.body.username,
		    }, function(err, docs) {
			    if(err) {
				console.log("\tMongoDB: " + username + " failed to follow " + req.body.username);
				res.send(JSON.stringify({"status" : "error", "error" : "Failed to follow."}));
			}
			else {
			    //console.log("\tMongoDB: " + username + " followed " + req.body.username);
			    res.send(JSON.stringify({"status" : "OK"}));
			}
		    });
			}
			else {
		    db.collection("following").deleteOne( {
			    "user" : username,
			    "isFollowing" : req.body.username,
		    }, function(err, docs) {
			    if(err) {
				console.log("MongoDB: " + username + " failed to unfollow " + req.body.username);
				res.send(JSON.stringify({"status" : "error", "error" : "Failed to follow."}));
			}
			else {
			    //console.log("MongoDB: " + username + " unfollowed " + req.body.username);
			    res.send(JSON.stringify({"status" : "OK"}));
			}
		    });
			}
		}
	});

	app.post('/additem', function(req, res) {
	    var username = req.cookies.twitter_clone_cookie;
	    if (username === undefined) {
		    console.log("You are not logged in for an add request");
		    res.send(JSON.stringify({"status" : "error", "error" : "You are not logged in"}));
	    } else {
	    var tweetID = new ObjectId();
	    //console.log("Add request for tweetID " + tweetID + " by user " + username);
	    res.send(JSON.stringify({"status" : "OK", "id" : tweetID}));
	    var addParams = {
		"_id" : tweetID,"username" : username,"datecreated" : Math.trunc(Date.now()/1000),
		"content" : req.body.content, "interest" : 0, "replies":[]
	    };
		async.series([
		    function(callback) {
		    if (req.body.parent) {
			//console.log("TweetID: " + tweetID);
			//console.log("\t\tParentID: " + new ObjectId(req.body.parent) + " found for tweetID " + tweetID);
			db.collection("tweets").updateOne({"_id":new ObjectId(req.body.parent)},
			    {$inc:{"interest":1},$push:{"replies":tweetID}},
			    function(err, docs) {
			    if(err) {
				console.log(err);
				return callback(new Error("Failed to update added tweet's new parent"));
			    } else {
				 //console.log("\t\tMDB: Finished updating parent for tweetID " + tweetID);
				 callback();
			    }
			});
			//console.log("\t\tAdd tweet request updating parent, waiting for tweetID " + tweetID +"'s parent to finish updating");
		    } else {
			//console.log("\t\tNo parent for tweetID " + tweetID);
			callback();
		    }
		}, function(callback) {
		    if (req.body.parent !== undefined) {addParams.parent = new ObjectId(req.body.parent);}
		    if (req.body.media) {addParams.media = req.body.media;}
		    //console.log("\t\tMDB: Starting to add new tweet " + tweetID);// + JSON.stringify(addParams));
		    db.collection("tweets").insertOne(addParams, function(err, docs) {
			if(err) {
			    console.log(err);
			    return callback(new Error("Failed to add tweet."));
			} else {
			 //console.log("\t\tMDB: Finished adding new tweetID " + tweetID);
			 callback();
			}
		    });
			//console.log("\t\tAdd tweet request, wait for tweetID " + tweetID + " to finish adding");
		}], function(err, result) {
		    if (err)
			console.log("Encountered error wheil adding tweet " + tweetID);
		    else {
			//console.log("Done ADD request for tweetID " + tweetID + " by user " + username);
			var cacheString = JSON.stringify(
				{"status" : "OK",
				 "item" : {
					"id" : tweetID,
					"username": username,
					"content": addParams.content,
					"timestamp" : addParams.datecreated,
					"parent" : addParams.parent,
					"media" : addParams.media}
				});
			//console.log(cacheString);
			memcached.set(tweetID, cacheString, 3600, function (err) {
				if (err) {console.log(err);}
				else {//console.log("Cached SET: " + tweetID);
					}
			});
		    }
		    //if(err) {res.send(JSON.stringify({"status" : "error", "error" : err.message}));}
		    //else {res.send(JSON.stringify({"status" : "OK", "id" : tweetID}));}
		});
	    }
	});

	app.delete('/item/:id', function(req, res) {
		var username = req.cookies.twitter_clone_cookie;
		if (ObjectId.isValid(req.params.id)) {
		      var tweetID = new ObjectId(req.params.id);
		      memcached.del(tweetID, function (err, result) {
				if (err) {console.log(err);}
				else {//console.log("Cache DEL: " + tweetID);
					}
			});
		      var mediaList = [];
		      //console.log("Delete request for tweetID " + tweetID + " by user " + username);
		      async.series([
			    function(callback) {
				  db.collection("tweets").findOneAndDelete({"_id": tweetID}, function (err, result) {
					    if (err) {
						return callback(new Error("Error occured deleting the tweet."));
					    } else {
						//console.log(result);
						if (result.ok == 1 && result.lastErrorObject.n == 1) {
							if (result.value.media) {
								//console.log("Found media list: " + result.value.media);
								mediaList = result.value.media;
							}
							//console.log("Finished deleting tweet " + tweetID);
							callback()
						} else if (result.lastErrorObject.n == 0) {
							return callback(new Error("Tweet not found."));
						 } else  {
							return callback(new Error("Unable to delete tweet."));
						}
					    }
				    });
			    }, function (callback) {
				if (mediaList.length > 0){
					//console.log("Media list exist for " + tweetID + ". Attempting to remove");
					for (var i=0; i<mediaList.length; i++) {
						//mediaList[i] = new ObjectId(mediaList[i]);
						var statement = "DELETE from media WHERE id = '" + mediaList[i] + "';"
						client.execute(statement, function(err, result) {
							if (err) {
								console.log("Error deleting media: " + statement);
								console.log(err);
								return callback(new Error("Error occured deleting the tweet."));
							}
							else {
							}
						});
					}
					callback();
				} else {
					//console.log("No media files were found");
					callback();
				}
			    }, function(callback) {
				//console.log("In delete for tweetID " + tweetID +", removing likes");
				db1.collection("accounts").updateOne({"username":req.cookies.twitter_clone_cookie},{$pull:{"likes":{$in:[tweetID]}}},
				function(err, docs) {
					if(err) {
						console.log(err);
						return callback(new Error("Failed to update added tweet's new parent"));
					} else {
						//console.log("Finished removing like for tweetID " + tweetID);
						callback();
					}
				});
			    }], function (err, result) {
				    //console.log("\t\tDone DELETE request for tweetID " + tweetID + " by user " + username);
				    if (err) {res.send(JSON.stringify({"status" : "error", "error" : err.message}));}
				    else {res.send(JSON.stringify({"status" : "OK"}));}
			    });
		} else {res.send(JSON.stringify({"status" : "error", "error" : "Invalid ID format."}));}
	});

	app.get('/item/:id', function(req, res) {
		if (ObjectId.isValid(req.params.id)) {
		    //console.log("Recv'd request for id " + tweetID);
		    var tweetID = new ObjectId(req.params.id);
		    async.series([
		    function (callback) {
			memcached.get(tweetID, function (err, data) {
				if (err) { return callback(new Error(err));}
				else {
					if (data) {
						res.send(data);
						//console.log("Cache GET hit for " + tweetID);
						callback();
					} else { return callback(new Error("Get cache miss"));}
				}
			});
		    }], function (err, result) {
			if (err) {
			    //console.log("Cache GET miss for " + tweetID);
			    var tweetInfo = {};
			    var mediaList = [];
				//console.log("Finding tweet: " + req.params.id);
			    //var cursor = db.collection("tweets").findAndModify( {"_id" : tweetID},[["_id",-1]],{$inc:{"dummy":1}},function(err, docs) {
				 var cursor = db.collection("tweets").findOne( {"_id" : tweetID},function(err, docs, count) {
				if(err) {
					  console.log("Failed to find tweet " + tweetID);
					  console.log(err);
					  res.send(JSON.stringify({"status" : "error", "error" : "Error occurred finding tweet."}));
				    } else {
					  if (docs) {
					      tweetInfo = {"id": tweetID, "username":docs.username, "content":docs.content,"timestamp": docs.datecreated};
					      tweetInfo.media = docs.media;
				  if (docs.parent !== undefined) {
					tweetInfo.parent = docs.parent;
				  }
					      res.send(JSON.stringify({"status" : "OK", "item" : tweetInfo}));
					  } else {
					      res.send(JSON.stringify({"status" : "error", "error" : "Cannot find tweet."}));
					  }
				    }
			      });

			}
			});
		} else {res.send(JSON.stringify({"status" : "error", "error" : "Invalid ID format."}));}
	});


	app.post('/search', function(req, res) {
		//console.log("Search request started for user: " +  req.cookies.twitter_clone_cookie);
		var limit;
		var queryParams = {};
		var followings = [req.cookies.twitter_clone_cookie];
		var sortBy = "interest";
	    if (req.body.rank !== undefined && req.body.rank === "time") {
		sortBy = "datecreated";
	    } /*else {
		queryParams.interest = {"$gte":0};
	    } */
	    //console.log("var sortBy = " + sortBy);
	    var sortType = {[sortBy] : -1};

	    async.series([
		//CHECK FOR A VALID LIMIT
		    function(callback) {
		    //console.log("Checking limit");
		    limit = req.body.limit;
		    if (limit == undefined)  {
		      limit=25;
		    } else if (limit > 100 || limit <= 0){
		      return callback(new Error("Exceeded search limit."));
		      //res.send(JSON.stringify({"status" : "error", "error" : "Exceeded search limit."}));
		    }
		    callback();
		//CHECK FOR TIMESTAMP / PARENT / REPLIES
		}, function (callback) {
		//console.log("Checking timestamp");
		var timestamp = req.body.timestamp;
		if (timestamp == undefined)  {
		    timestamp= Math.trunc(Date.now()/1000);
		}
		queryParams.datecreated = {$lte: timestamp};

		    if (req.body.parent !== undefined) {
			    if (ObjectId.isValid(req.body.parent)) {
					queryParams.parent = new ObjectId(req.body.parent);
			    } else {
			return callback (new Error ("Invalid parent tweetID"));
		    }
		}

		if (req.body.replies !== undefined && req.body.replies == false) {
		    if (queryParams.parent) {
			queryParams.parent = {"$and":[queryParams.parent,{"$exists": false}]};
		    } else {
			queryParams.parent = {"$exists": false};
		    }
		}
		callback();
		}, function (callback) {
		   //console.log("Checking followings");
		   if (req.body.following == undefined || req.body.following) {
			var username = "" + req.cookies.twitter_clone_cookie;
			//console.log("Retrieved followings for " + req.cookies.twitter_clone_cookie);
			db.collection("following").find({"user" : username})
			    .each(function(err, item) {
				if (err) {
				    console.log("Error retrieving followings: " + err);
				    return callback(new Error("Can't find followers error"));
				}
				if (item == null) {
				    //console.log("\t\t" + req.cookies.twitter_clone_cookie + " found (" + followings.length + ") followings --- " + followings);
				    if (followings.length > 0) {
					queryParams.username = {"$in" : followings};
				    }
				    callback();
				} else {
				    followings.push(item.isFollowing);
				}
			});
		    }   else {
		      //console.log("Following is false");
		      callback();
		    }
		//CHECK FOR USERNAME
		}, function (callback) {
		    //console.log("Checking username");
		    if (req.body.username != undefined) {
			if (followings.indexOf(req.body.username) < 0 && queryParams.username) {
				queryParams.username = {"$in" : []};
			} else {
				queryParams.username = req.body.username;
				//console.log("\t\t\t username search param found: " + req.body.username);
		}
		    }
		    callback();
		//CHECK FOR Q
		}, function (callback) {
		    //console.log("Checking q");
		    if (req.body.q != undefined) {
			//console.log("Q: '" + req.body.q + "'");
			var searchStrings = (req.body.q).split(" ");
			//console.log("SS: " + searchStrings);
			var searchTerm = "";
			for (i=0; i<searchStrings.length; i++) {
				//console.log("i = " + i);
				searchTerm = searchTerm.concat(searchStrings[i]);
				if (i < searchStrings.length-1) {
					searchTerm = searchTerm.concat("|");
				}
			}
			//iconsole.log("Search term: " + searchTerm);
			var regex = new RegExp('\\s+(' + searchTerm + ')\\s+', 'i');
			queryParams.content = regex;
		    }
		    callback();
		}
		], function (err) {
		      if (err) {
			    console.log("Encountered an error: " + err.message);
			    res.send(JSON.stringify({"status" : "error", "error" : err.message}));
		      } else {
			if (queryParams.content) {
				//console.log("\tMDB" + req.cookies.twitter_clone_cookie + " is searching: " + JSON.stringify(queryParams) + " with regex: " + queryParams.content.toString() + " Sorted by " + sortBy);
			} else {
				//console.log("\tMDB" + req.cookies.twitter_clone_cookie + " is searching: " + JSON.stringify(queryParams) + " Sorted by " + sortBy);
		}
        var tweetArray = [];
                db.collection("tweets").find(queryParams).sort(sortType).limit(limit).each(function(err, item) {
                      if (item == null) {
			      //console.log("Done SEARCH for  " + req.cookies.twitter_clone_cookie + " Found " + tweetArray.length + " in array. ");
                              res.send(JSON.stringify({"status" : "OK","items": tweetArray}));
                      } else {
                              //console.log(counter);
                        //console.log("Found tweet for user: " + item.username);
                        var tweetInfo = {"id": item._id.toString(),"username":item.username,"content":item.content,
                "timestamp": item.datecreated,"media":item.media};
            if (item.parent) {tweetInfo.parent = item.parent;}
            tweetArray.push(tweetInfo);
                      }
                    });
              }
        });
});

app.post('/item/:id/like', function(req, res) {
    var username = req.cookies.twitter_clone_cookie;
    if (username === undefined) {
            res.send(JSON.stringify({"status" : "error", "error" : "You are not logged in"}));
    } else {
        if (ObjectId.isValid(req.params.id)) {
              var tweetID = new ObjectId(req.params.id);
              if (req.body.like === undefined || req.body.like){
                  //console.log("Rec'd like request for id " + tweetID);
                  async.parallel([
                    function(callback) {
                    db.collection("tweets").updateOne({"_id":tweetID}, {$inc:{"interest":1}},function(err, docs) {
                        if(err) {
                            console.log(err);
                            return callback(new Error("Failed to update added tweet's new parent"));
                        }
                    });
                    callback();
                    }, function (callback) {
                      db1.collection("accounts").updateOne({"username":username},{$push:{"likes":tweetID}},
                        function(err, docs) {
                            if(err) {
                                console.log(err);
                                return callback(new Error("Failed to update added tweet's new parent"));
                            }
                        });
                      callback();
                    }], function (err, result) {
                      if (err) {res.send(JSON.stringify({"status" : "error", "error" : err.message}));}
                      else {res.send(JSON.stringify({"status" : "OK"}));}
                });
            } else {
                  async.parallel([
                    function(callback) {
                    db.collection("tweets").updateOne({"_id":tweetID}, {$inc:{"interest":-1}},function(err, docs) {
                        if(err) {
                            console.log(err);
                            return callback(new Error("Failed to update added tweet's new parent"));
                        }
                    });
                    callback();
                    }, function (callback) {
                        db1.collection("accounts").updateOne({"username":username},{$pull:{"likes":{$in:[tweetID]}}},
                            function(err, docs) {
                                if(err) {
                                    console.log(err);
                                    return callback(new Error("Failed to update added tweet's new parent"));
                                }
                        });
                      callback();
                    }], function (err, result) {
                      if (err) {res.send(JSON.stringify({"status" : "error", "error" : err.message}));}
                      else {res.send(JSON.stringify({"status" : "OK"}));}
                });
            }
            } else {res.send(JSON.stringify({"status" : "error", "error" : "Invalid ID format."}));}
    }
});

app.post('/addmedia', upload.single('content'), function(req, res, next) {
	var id = ObjectId();
	res.send({"status" : "OK", "id" : id});
	var fileBuffer = req.file.buffer;
    //res.send({"status" : "OK", "id" : id});
        var statement = "INSERT INTO media (id, contents, mimetype) VALUES('" + id + "', 0x" + fileBuffer.toString('hex') + ", '" + req.file.mimetype + "');"
        client.execute(statement, function(err, result) {
                if (err) {
                        console.log("Error adding media.");
                        console.log("Statement executed: " + statement);
                        res.send({"status" : "error", "error" : "Error adding file"});
                }
                else {
                        //console.log("Succesfully added media " + id);
                        //console.log(req.file.mimetype);
                        //res.send({"status" : "OK", "id" : id});
                }
        });
});

app.get('/media/:id', function(req, res) {
	var statement = "SELECT contents, mimetype from media WHERE id = '" + req.params.id + "';"
        client.execute(statement, function(err, result) {
                if (err || result.rows.length <= 0) {
                        console.log("Error retrieving media and statement is: " + statement);
			console.log(err);
                        res.send({"status" : "error", "error" : "Error retrieving media"});
                }
                else {
                        var rowData = result.rows[0];
                        var data = rowData.contents;
                        //console.log("Before: " + data);
                        //data = data.substring(2);
                        //console.log("After: " + data);
                        var fileBuffer = new Buffer(data, 'hex');
                        res.setHeader('content-type', rowData.mimetype);
                        res.status(200).send(fileBuffer);
                }
        });
});
