var async = require('async');
var crypto = require('crypto');

module.exports = function (hoodie) {
  return {
    'server.api.plugin-request': function (request, reply) {
      //This function is the handler for when the user clicks on the link in the email.

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
          //TODO need to display some page/warning. Theoretically, this shouldn't happen, unless someone copy/pastes the confirm url incorrectly
          return true;
        }

        //if user has already been verified, just quit
        if (!user.emailVerificationToken) {
          //TODO make this come from config
          reply.redirect('/#confirmed');
          return true;
        }

        if (token != user.emailVerificationToken) {
          console.log('Invalid token given for user ' + user.id);
          //TODO need to display some page/warning. Theoretically, this shouldn't happen, unless someone copy/pastes the confirm url incorrectly
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
          reply.redirect('/#confirmed');
          return true;
        });
      });
    },

    'plugin.user.confirm' : function(request, reply) {
      //this function is called when a user initially signs up (and a lot of other times too, but we just try to ignore those other calls)

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

        async.parallel({
          addTokenToUser: function(callback) {
            var changedAttrs = {
              emailVerificationToken: token
            };
            hoodie.account.update('user', emailAddress, changedAttrs, function(err) {
              if (err) {
                console.log('Error adding emailVerificationToken to user ' + emailAddress + ' ' + err);
              }
              callback();
            });
          },
          sendVerificationEmail: function(callback) {
            //TODO - make this part of config
            var protocol = 'http';

            var host = hoodie.config.get('host');
            var port = hoodie.config.get('www_port');
            var address = protocol + '://' + host + ':' + port + '/_api/_plugins/email-verifier/_api/' + emailAddress + '?token=' + token;
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
              callback();
            });
          }
        },
        function(err, results) {
          reply(false);
        });

      });

    }
  };

};
