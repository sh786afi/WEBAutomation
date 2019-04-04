var login = require("../pom/login");
var myProfile = require("../pom/myProfile");
var data = require("../conf");
var doLogin = require("../pom/login");

browser.waitForAngularEnabled(true);
describe("Woovly Like Post Module ", function() {
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
  it("Positive Case1 :- Verify Upload Profile Pic and Edit Profile pic if Upladed ", async function() {
    await myProfile.clickProfile();
    browser.sleep(2000);
    await myProfile.addProfilePic();
    browser.sleep(2000);
    await doLogin.Logout();
  });
  it("Positive Case2 :- Delete Uploaded Profile Pic ", async function() {
    await myProfile.clickProfile();
    browser.sleep(2000);
    await myProfile.deleteProfilePic();
    browser.sleep(2000);
    await doLogin.Logout();
  });
  it("Positive Case3 :- Verify Upload Cover Image ", async function() {
    await myProfile.clickProfile();
    browser.sleep(2000);
    await myProfile.uploadCoverImg();
    browser.sleep(2000);
    await doLogin.Logout();
  });
  it("Positive Case 4: Delete Cover Image", async () => {
    await myProfile.clickProfile();
    browser.sleep(2000);
    await myProfile.deleteCoverImg();
  });
});
