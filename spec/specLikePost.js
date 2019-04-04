var login = require("../pom/login");
var { likePost, likes } = require("../pom/likePost");
var data = require("../conf");
var { LOCATOR_Featured } = require("../lib/constant");

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
  it("Positive Case1 :- Like a post on dashboard page", async function() {
    var totalLikes = "";
    LOCATOR_Featured.likeText.getText().then(text => {
      var str = text;
      totalLikes = str.replace(/\D/g, "");
    });

    await likePost();
    await expect(totalLikes).toContain(
      likes.oldLikeCount || likes.newLikeCount
    );
  });
});
