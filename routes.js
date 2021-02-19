const crypto = require("crypto");
var mongojs = require('mongojs');

module.exports = function(app, passport){
    
  // uri = process.env.MONGODB_URI || 'mongodb://localhost/walkercoin';

  uri = 'your-mongodb-connection-string';

  var ObjectId = require('mongojs').ObjectID;
  
  var db1 = mongojs(uri, ['users']);

  var StellarSdk = require('stellar-sdk');
  const server = new StellarSdk.Server('https://horizon.stellar.org')
  StellarSdk.Network.usePublicNetwork()

  const source = StellarSdk.Keypair.fromSecret('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')
  const destination = StellarSdk.Keypair.random()

  app.get('/', function(req, res){
    
      res.render('index.html');
    
  });

  app.get('/login', function(req, res){
    
      res.render('login.html');
    
  });

  //MAIN WALLET PAGE
  app.get('/walkercoin', isLoggedIn, function(req, res){

     res.render('walkercoin-wallet.html');

  });

  
  // New Walkercoin test page
  app.get('/transactions', isLoggedIn, function(req, res){
    
         res.render('walkercoin-transactions.html');
    
  });

  

  //SIGNUP route
  app.post('/signup', passport.authenticate('local-signup', {
    
      successRedirect: '/login',
      failureRedirect: '/',
      failureFlash: true
    
  }));

  //LOGIN route
  app.post('/login', passport.authenticate('local-login', {
    
       successRedirect: '/walkercoin',
       failureRedirect: '/login',
       failureFlash: true
    
  }));

  //LOGOUT route
  app.get('/logout', function(req, res){
    
        req.logout();
        res.redirect('/login');
    
  });

 //Getting user object into authenticated pages
 app.get('/user', isLoggedIn, function(req, res){
  
      res.send(req.user);
  
 });
  
  //isLoggedIn middleware
  function isLoggedIn(req, res, next){
    
       if(req.isAuthenticated())
         return next();
    
       res.redirect('/login');
    
   }

   //Check Balance Route
   app.get('/checkBalance', isLoggedIn, function(req, res){

    var id = req.user._id.toString();
    var query = {"_id": ObjectId(id)};  
    
    const request = require('request');
    request('https://horizon.stellar.org/accounts/' + req.user.local.key0, function (error, response, body) {
      var data = JSON.parse(body);
      if (!error && response.statusCode == 200) {
        //console.log('WALK Balance: ' + data.balances[0].balance + '\nXLM Balance: ' + data.balances[1].balance); 
        res.send(data.balances[0].balance) 
      }
    });
    
       /*db1.users.findOne(query, function(err, docs){

         if(err) { }

         if(docs){

            const request = require('request');
            request('https://horizon.stellar.org/accounts/' + docs.local.key0, function (error, response, body) {
              var data = JSON.parse(body);
              if (!error && response.statusCode == 200) {
                //console.log('WALK Balance: ' + data.balances[0].balance + '\nXLM Balance: ' + data.balances[1].balance); 
                res.send(data.balances[0].balance) 
              }
            });

          } else {


          }   
         
       });*/

    });

    //Check Balance Route
   app.get('/checkBalanceXLM', isLoggedIn, function(req, res){

      const request = require('request');
      request('https://horizon.stellar.org/accounts/' + req.user.local.key0, function (error, response, body) {
        var data = JSON.parse(body);
        if (!error && response.statusCode == 200) {
          //console.log('WALK Balance: ' + data.balances[0].balance + '\nXLM Balance: ' + data.balances[1].balance); 
          res.send(data.balances[1].balance) 
        }
      });
    
    
    });


    //Deposit WALK route
    app.get('/deposit', isLoggedIn, function(req, res){

      res.render('deposit-walkercoin.html');

    });


    //Withdraw WALK route
    app.get('/withdraw', isLoggedIn, function(req, res){
      
      res.render('withdraw-walkercoin.html');
      
    });


    //Withdraw WALK
    app.post('/withdraw', isLoggedIn, function(req, res){

      var secret = req.user.local.key1;

      var source = StellarSdk.Keypair.fromSecret(secret);
      var destination_pub = req.body.address;
      var amount = req.body.amount;

      var issuingKeys = StellarSdk.Keypair
      .fromSecret('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

      // Create an object to represent the new asset
      var walkerCoin = new StellarSdk.Asset('WALK', issuingKeys.publicKey());

        server.accounts()
        .accountId(source.publicKey())
        .call()
        .then(({ sequence }) => {
          const account = new StellarSdk.Account(source.publicKey(), sequence)
          const transaction = new StellarSdk.TransactionBuilder(account, {
            fee: StellarSdk.BASE_FEE
          })
            .addOperation(StellarSdk.Operation.payment({
              destination: destination_pub, //destination.publicKey()
              asset: walkerCoin,
              amount: amount
            }))
            .setTimeout(30)
            .build()
          transaction.sign(StellarSdk.Keypair.fromSecret(source.secret()))
          return server.submitTransaction(transaction)
        })
        .then(results => {
          console.log('Transaction', results._links.transaction.href)
          //console.log('New Keypair', destination.publicKey(), destination.secret())
        })

        res.redirect('/walkercoin');

    });


   //Trustline Route
   app.get('/walkerCoinTrust', isLoggedIn, function(req, res){
    
           var secret = req.user.local.key1;
      
    
                // Keys for accounts to issue and receive the new asset
              var issuingKeys = StellarSdk.Keypair
              .fromSecret('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
       
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
                    amount: '10'
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
    
      });


  //Generating Native Stellar account and Send 1 XLM from Source Account
  function generateNewAddress(){
    
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
        console.log('Transaction', results._links.transaction.href)
        console.log('New Keypair', destination.publicKey(), destination.secret())
      })

  }

  //generateNewAddress();


  //Create Payment Transaction on Stellar Network
  function createPaymentTransaction(){

    server.accounts()
    .accountId(source.publicKey())
    .call()
    .then(({ sequence }) => {
      const account = new StellarSdk.Account(source.publicKey(), sequence)
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE
      })
        .addOperation(StellarSdk.Operation.payment({
          destination: 'GDC5GAHZF75VJY276SUZAWQKJ2OY777LY5URRSDXX3FH2RFBQPRMFDMR', //destination.publicKey()
          asset: StellarSdk.Asset.native(),
          amount: '1.5'
        }))
        .setTimeout(30)
        .build()
      transaction.sign(StellarSdk.Keypair.fromSecret(source.secret()))
      return server.submitTransaction(transaction)
    })
    .then(results => {
      console.log('Transaction', results._links.transaction.href)
      //console.log('New Keypair', destination.publicKey(), destination.secret())
    })

  }

  //createPaymentTransaction();

  
  //Check Balance Function
  function checkBalance(account){

    const request = require('request');
    request('https://horizon.stellar.org/accounts/' + account, function (error, response, body) {
      var data = JSON.parse(body);
      if (!error && response.statusCode == 200) {
        //console.log('WALK Balance: ' + data.balances[0].balance + '\nXLM Balance: ' + data.balances[1].balance);  
        console.log('Balance: ' + data.balances[0].balance)
      }
    });

  }

  //checkBalance('GDC5GAHZF75VJY276SUZAWQKJ2OY777LY5URRSDXX3FH2RFBQPRMFDMR');



  //Create Trustline from IssuingACCT to newACCT for Custom Stellar Assets
  function createWalkerCoinTrustline(){

      // Keys for accounts to issue and receive the new asset
      var issuingKeys = StellarSdk.Keypair
      .fromSecret('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
      //.fromSecret('SB37PS2ZKL7EFQ4PVLYRBZYNY2RK3BLEMUZDHJRLXELP7P72VARK2NRI');
      var receivingKeys = StellarSdk.Keypair
      .fromSecret('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'); //.fromSecret(secret);
       

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
            amount: '10'
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

  //createWalkerCoinTrustline();
  //checkBalance('GCN4N4XEDY4NYPSQE2GAJSQJC7XRJHKDOQK6ZOXIK2GB7DRKBX3CH347');


  app.get('/test', isLoggedIn, function(req, res){

    var secret = req.user.local.key1;
    var pub = req.user.local.key0;

    createWalkerCoinTrustline(secret);
    //console.log(secret)
    checkBalance(pub);

  });

 };
