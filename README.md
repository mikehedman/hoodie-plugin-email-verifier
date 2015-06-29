Hoodie E-Mail Verifier Plugin
======================

Sends an email to the user when they signUp.  User must click on the link in the email to confirm account.

Note: this plugin ONLY works if the user document's id is an email address

##Note: this plugin is a work in progress!!!
Some items that would be nice to have:
* Should add to config the the URL route to redirect to after successful confirmation. Right now it's hard coded to "/#confirmed"
* Make length of security token a config variable
* Could probably make this work with having the email in some other attribute rather than only the id.
* Make http/https a config item (so that we use the correct protocol in the link inside the email
* Make the subject and body of the email configurable

Before sending email can be used, you need to configure
an email service in the Admin Dashboard.

