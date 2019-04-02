var login = require('../pom/login');
var invite_friend = require('../pom/inviteFriend');
var data = require("../conf");
browser.waitForAngularEnabled(true);

describe('Woovly Invite Friend Module ',  function() {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000000;
    beforeEach(async () => {
      await login.Get_Email_Login(
        data.config.params.url,
        data.config.params.userEmailid,
        data.config.params.userEmailPass
      );
      browser.sleep(5000);
    });
    it('Positive Case1 :- Enter valid Email-id', async function() {
      await invite_friend.Get_Invite_Friends1(data.config.params.userEmailid);
      browser.sleep(3000);
      expect(await element(by.className("toast-message")).getText()).toEqual('Invitation sent successfully');
      console.log("Positive Case1 :- Enter valid Email-id"+" ==> "+"Friends Invited Successfully....");
    });

    it('Negative Case1 :- Enter In-valid Email-id', async function() {
      await invite_friend.Get_Invite_Friends2("harish123");
      browser.sleep(2000);
      expect(await element(by.className("toast-message")).getText()).toEqual('Please enter valid email address');
      console.log("Negative Case1 :- Enter In-valid Email-id"+" ==> "+"Error message for Invalid Email-id validated Successfully....");
    });

    it('Negative Case2 :- After Removing Email-id', async function() {
      await invite_friend.Get_Invite_Friends3(data.config.params.userEmailid);
      browser.sleep(1000);
      expect(await element(by.className("toast-message")).getText()).toEqual('Email remove successfully');
      console.log("Negative Case2 :- After Removing Email-id"+" ==> "+"Toast Message for Removing Email-id validated Successfully....");
    })
});
