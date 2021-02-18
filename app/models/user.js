
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

var userSchema = mongoose.Schema({

   local:{

     email: String,
     username: String,
     password: String,
     withdrawPassword: String,
     key0: String,
     key1: String

   }

});

userSchema.methods.generateHash = function(password){

  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);

};

userSchema.methods.validPassword = function(password){

  return bcrypt.compareSync(password, this.local.password);

};

module.exports = mongoose.model('User', userSchema);
