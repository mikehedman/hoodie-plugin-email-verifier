var async = require('async');
var crypto = require('crypto');

module.exports = function (hoodie) {
  return {
    'server.api.plugin-request': function (request, reply) {
      var emailAddress = request.params.p;

      if (! /@/.test(emailAddress)) {
        console.log('Provided username does not appear to be an email address: ' + emailAddress);
        return true;
      }

      if (!request.query.token) {
        console.log('No token given for ' + emailAddress);
        return true;
      }
      var token = request.query.token;

      hoodie.account.find('user', emailAddress, function (err, user) {
        if (err) {
          console.log('could not find user: ' + emailAddress);
          return true;
        }

        //if user has already been verified, just quit
        if (!user.emailVerificationToken) {
          return true;
        }

        if (token != user.emailVerificationToken) {
          console.log('Invalid token given for user ' + user.id);
          return true;
        }

        var roles = user.roles;
        var index = roles.indexOf('unconfirmed');
        if (index !== -1) {
          roles[index] = 'confirmed';
        }

        var changedAttrs = {
          emailVerificationToken: undefined,
          roles: roles
        };
        hoodie.account.update('user', emailAddress, changedAttrs, function(err) {
          if (err) {
              console.log('Error updating user ' + emailAddress + ' ' + err);
          }
          return true;
        });
      });
    },

    'plugin.user.confirm' : function(request, reply) {
      var emailAddress = request.id;
      hoodie.account.find('user', emailAddress, function (err, user) {

        if (err) {
          console.log('could not find user: ' + emailAddress);
          reply(false);
          return;
          //return exports.notFoundError(hoodie, reset_doc, callback);
        }

        //if we've already dealt with this user, just skip it
        if (user.emailVerificationToken) {
          reply(false);
          return;
        }

        //add a token for inclusion in the email and to later confirm the user
        var token = crypto.randomBytes(24).toString('hex');
        function addToken() {
          var changedAttrs = {
            emailVerificationToken: token
          };
          hoodie.account.update('user', emailAddress, changedAttrs, function(err) {
            if (err) {
              console.log('Error adding emailVerificationToken to user ' + emailAddress + ' ' + err);
            }
            sendVerificationMail();
          });
        }

        function sendVerificationMail() {
          var address = 'http://127.0.0.1:6031/_api/_plugins/email-verifier/_api/' + emailAddress + '?token=' + token;
          var subject = 'Please verify your email address';
          var appName = hoodie.config.get('app_name');
          if (appName) {
            subject = appName + ': ' + subject;
          }
          hoodie.sendEmail({
            to: emailAddress,
            subject: subject,
            text: "Please go here in your browser: " + address,
            html: '<p>Please click on the link below to verify your address</p><a href="' + address + '">' + address + '</a>'
          }, function(err) {
            if (err) {
              console.log('Problem sending mail: ' + err)
            }
            reply(false);
          });
        }

        addToken();

      //TODO switch to using async to clean up the callbacks
      //
      //  async.series(
      //      [
      //        function (callback) {
      //          var changedAttrs = {
      //            emailVerificationToken: token
      //          };
      //          hoodie.account.update('user', emailAddress, changedAttrs, function(err) {
      //            if (err) {
      //              console.log('Error adding emailVerificationToken to user ' + emailAddress + ' ' + err);
      //            }
      //            callback();
      //          });
      //        },
      //        function (callback) {
      //          //  127.0.0.1:6031/_api/_plugins/verifier/_api/m@y?token=4321
      //          var address = 'http://127.0.0.1:6031/_api/_plugins/email-verifier/_api/' + emailAddress + '?token=' + token;
      //          hoodie.sendEmail({
      //            to: emailAddress,
      //            subject: "Please verify your email address",
      //            text: "Please go here in your browser: " + address,
      //            html: '<p>Please click on the link below to verify your address</p><a href="' + address + '">' + address + '</a>'
      //          }, function(err) {
      //            if (err) {
      //              console.log('Problem sending mail: ' + err)
      //            } else {
      //              console.log('mch mail sent');
      //            }
      //            callback();
      //          });
      //        }
      //      ],
      //      function() {
      //        //force the user to click on the link in the email to get confirmed
      //        reply(false);
      //      }
      //  );
      });

    }
  };

};
