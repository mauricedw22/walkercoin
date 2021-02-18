
var LocalStrategy = require('passport-local').Strategy;
var User = require('../app/models/user.js');
const crypto = require("crypto");
var StellarSdk = require('stellar-sdk');

module.exports = function(passport){

	const server = new StellarSdk.Server('https://horizon.stellar.org');
	StellarSdk.Network.usePublicNetwork();

	const source = StellarSdk.Keypair.fromSecret('SCNTXTGZWA2OUR546BRUTX7HOT6NGCVSMSDF6V5ET6AMN6NSFWVP6RAN') //GD7KW42SLGQQY2V6YTLKTFIN5Q4VEXUBX3M3ASTOOZQFIUFVCNKPFNBR
  const destination = StellarSdk.Keypair.random()

  passport.serializeUser(function(user, done){

    done(null, user.id);

  });

  passport.deserializeUser(function(id, done){

     User.findById(id, function(err, user){

	     done(err, user);

	   })

  });

  //Passport Signup logic

  passport.use('local-signup', new LocalStrategy({

    usernameField: 'username',
		passwordField: 'password',
	  passReqToCallback: true

   }, function(req, username, password, done){

    process.nextTick(function(){

	  User.findOne({'local.username':username}, function(err, user){

	    if(err)
		  return done(err);

		if(user){

		  return done(null, false, req.flash('signupMessage', 'That email is taken already.'));

		}else{

			server.accounts()
      .accountId(source.publicKey())
      .call()
      .then(({ sequence }) => {
        const account = new StellarSdk.Account(source.publicKey(), sequence)
        const transaction = new StellarSdk.TransactionBuilder(account, {
          fee: StellarSdk.BASE_FEE
        })
          .addOperation(StellarSdk.Operation.createAccount({
            destination: destination.publicKey(),
            startingBalance: '2'
          }))
          .setTimeout(30)
          .build()
        transaction.sign(StellarSdk.Keypair.fromSecret(source.secret()))
        return server.submitTransaction(transaction)
      })
      .then(results => {				
        //console.log('Transaction', results._links.transaction.href)
        //console.log('New Keypair', destination.publicKey(), destination.secret())
			})

			var public = destination.publicKey();
			var secret = destination.secret();

			//var algorithm = 'aes256';
			//var withdrawPassword = req.body.withdrawPassword;

			//var key = crypto.createCipher(algorithm, withdrawPassword);
			//var str = key.update(secret, 'utf8', 'hex') + key.final('hex');
			//console.log(str); 

			//var withdrawPassword = req.body.withdrawPassword;

			var newUser = new User();
			newUser.local.email = req.body.email;
		  newUser.local.username = username;
			newUser.local.password = newUser.generateHash(password);
			//newUser.local.withdrawPassword = newUser.generateHash(withdrawPassword);
			newUser.local.key0 = public; //destination.publicKey();
			newUser.local.key1 = secret; //str;
			// More user object properties need to be added here.....

		  newUser.save(function(err){

		    if(err)
			  throw err;

			return done(null, newUser);

		  });

		}

	  });

	});

}));

  //Passport Login logic
  passport.use('local-login', new LocalStrategy({

    usernameField: 'username',
	  passwordField: 'password',
	  passReqToCallback: true

    }, function(req, username, password, done){

	  User.findOne({'local.username':username}, function(err, user){

	    if(err)
		  return done(err);

		if(!user)
		  return done(null, false, console.log('User not found in DB!'));

	 	if(!user.validPassword(password))
		  return done(null, false, req.flash('loginMessage', 'Ooops! Wrong password!'));

		return done(null, user);

	  });

	}));


	//Create Trustline from IssuingACCT to newACCT for Custom Stellar Assets
  function createWalkerCoinTrustline(secret){
		
					// Keys for accounts to issue and receive the new asset
					var issuingKeys = StellarSdk.Keypair
					.fromSecret('SAFFVNB4ODISK3ZS7CYQWZWPJGPDDBE5SJOTSLPCFXFSSWPDP63DCSEJ');
					//.fromSecret('SB37PS2ZKL7EFQ4PVLYRBZYNY2RK3BLEMUZDHJRLXELP7P72VARK2NRI');
					var receivingKeys = StellarSdk.Keypair
					.fromSecret(secret);
		
					// Create an object to represent the new asset
					var walkerCoin = new StellarSdk.Asset('WALK', issuingKeys.publicKey());
		
					// First, the receiving account must trust the asset
					server.loadAccount(receivingKeys.publicKey())
					.then(function(receiver) {
						var transaction = new StellarSdk.TransactionBuilder(receiver, {
							fee: StellarSdk.BASE_FEE
						})
							// The `changeTrust` operation creates (or alters) a trustline
							// The `limit` parameter below is optional
							.addOperation(StellarSdk.Operation.changeTrust({
								asset: walkerCoin
								//,limit: '1000'
							}))
							// setTimeout is required for a transaction
							.setTimeout(100)
							.build();
						transaction.sign(receivingKeys);
						return server.submitTransaction(transaction);
					})
		
					// Second, the issuing account actually sends a payment using the asset
					.then(function() {
						return server.loadAccount(issuingKeys.publicKey())
					})
					.then(function(issuer) {
						var transaction = new StellarSdk.TransactionBuilder(issuer, {
							fee: StellarSdk.BASE_FEE
						})
							.addOperation(StellarSdk.Operation.payment({
								destination: receivingKeys.publicKey(),
								asset: walkerCoin,
								amount: '100'
							}))
							// setTimeout is required for a transaction
							.setTimeout(100)
							.build();
						transaction.sign(issuingKeys);
						return server.submitTransaction(transaction);
					})
					.catch(function(error) {
						console.error('Error!', error);
					});
		
			}

};
