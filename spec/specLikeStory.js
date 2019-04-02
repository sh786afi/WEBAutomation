var login = require("../pom/login");
var { likeStory } = require("../pom/likeStory");
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
  it("Positive Case1 :- Like a Story ", async function() {
    await likeStory();
  });
});
