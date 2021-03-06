'use strict';

const mongoose = require('mongoose');
const Users = mongoose.model('Users');

exports.all = function(req, res) {
  Users.find({}, function(err, doc) {
    if (err) { res.send(err); }
    res.json(doc);
  });
};

exports.register = function(req, res) {
  var user = new Users(req.body)

  user.password = Users.hashPassword(user.password);
  user.activationCode = user.generateActivationCode(); // REVIEW: Refactor?? hmmm

  user.save(function(err, doc) {
    if (err){
      res.send(err);
    }
    else {
      user.sendActivationCode();
      res.json(doc);
    }
  });
};

exports.single = function(req, res) {
  Users.findById(req.params.id, function(err, doc) {
    if (err) { res.send(err); }
    res.json(doc);
  });
};

exports.delete = function(req, res) {
  Users.remove({
    _id: req.params.id
  }, function(err, doc) {
    if (err) { res.send(err); }
    res.json({ message: 'User successfully deleted' }); //Todo make 201
  });
};

exports.update = function(req, res) {

  var params = req.body;
  params.password = Users.hashPassword(params.password);

  Users.findOneAndUpdate({ _id: req.params.id }, { $set: params }, { new: true, runValidators: true, context: 'query' }, function(err, doc) {
    if (err) { res.send(err); }
    res.json(doc);
  });
};

exports.activate = function(req, res) {
  Users.findOneAndUpdate(
    { activationCode: req.query.code },// get the `code` query string
    { $set: { accountStatus: 'active' }, $unset: { activationCode: 1 } }, // We unset activation code from the document
    { new: true },
    function(err, doc) {
      if (err){ res.send(err); }

      if(!doc){ // If there are no documents matching our activation code
        res.send('Not found'); //TODO: Add appropriate response headers
      }else{
        res.send('Account activated');
      }
    }
  );
};

exports.resendCode = function(req, res){ // TODO: Make limit 10 min per email
  Users.findOne({email: req.body.email}, function(err, doc) { // @link: https://stackoverflow.com/questions/18214635/what-is-returned-from-mongoose-query-that-finds-no-matches
    if (!doc || doc.activationCode === undefined ){ res.send("Not found"); } //FIXME
    else{
      doc.sendActivationCode();
      res.send("Activation code resent");
    }

  });
};


exports.login = function(req, res) {

  Users.findOne({email: req.body.email}, function(err, doc) {
    if (err) { res.send(err); }

    if(!doc){
      return res.status(401).json({message:"User doesn't exist"});
    }

    if(doc.validatePassword(req.body.password)) {
      var token = doc.generateJWT();

      res.json({message: "ok", token: token});
    } else {
      res.status(401).json({message:"passwords did not match"});
    }

  });

};
